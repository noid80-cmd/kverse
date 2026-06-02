'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/explore', label: '탐색', icon: '🔍' },
  { href: '/videos/upload', label: '올리기', icon: '➕' },
  { href: '/reactions', label: '반응', icon: '⭐' },
  { href: '/profile/edit', label: '프로필', icon: '👤' },
]

type Video = {
  id: string; title: string; thumbnail_url: string | null
  view_count: number; status: string; created_at: string; category: string
}

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase.from('videos').select('id, title, thumbnail_url, view_count, status, created_at, category')
        .eq('talent_id', user.id).neq('status', 'deleted').order('created_at', { ascending: false })
      setVideos(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const statusColor: Record<string, string> = {
    active: '#22c55e', processing: '#f59e0b', hidden: '#94a3b8', deleted: '#ef4444'
  }
  const statusLabel: Record<string, string> = {
    active: '공개', processing: '검토중', hidden: '숨김', deleted: '삭제됨'
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b' }}>내 영상</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#fff', borderRadius: 10, border: '1px solid #e0e0f0', overflow: 'hidden' }}>
              <button onClick={() => setViewMode('list')}
                style={{ padding: '8px 12px', border: 'none', fontSize: 16, cursor: 'pointer', background: viewMode === 'list' ? '#6366f1' : 'transparent', color: viewMode === 'list' ? 'white' : '#8b8baa', transition: 'all 0.15s' }}>
                ☰
              </button>
              <button onClick={() => setViewMode('grid')}
                style={{ padding: '8px 12px', border: 'none', fontSize: 16, cursor: 'pointer', background: viewMode === 'grid' ? '#6366f1' : 'transparent', color: viewMode === 'grid' ? 'white' : '#8b8baa', transition: 'all 0.15s' }}>
                ⊞
              </button>
            </div>
            <Link href="/videos/upload"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              + 업로드
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : videos.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 6 }}>아직 영상이 없어요</div>
            <div style={{ fontSize: 13, color: '#8b8baa', marginBottom: 20 }}>첫 영상을 올리고 기획사에 노출되어 보세요</div>
            <Link href="/videos/upload"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
              영상 업로드
            </Link>
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col gap-3">
            {videos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fff', borderRadius: 18, overflow: 'hidden',
                  border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'stretch',
                }}>
                  <div style={{
                    width: 100, flexShrink: 0, background: v.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 28 }}>🎬</span>
                    }
                  </div>
                  <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, background: '#f0f0f8', color: '#6366f1', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        {categoryLabel[v.category] ?? v.category}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[v.status] }}>
                        {statusLabel[v.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#b0b0cc', marginTop: 6 }}>조회 {v.view_count}회</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingRight: 14 }}>
                    <span style={{ color: '#c0c0d8', fontSize: 18 }}>›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
            {videos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none', aspectRatio: '1', display: 'block', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)' }}>
                {v.thumbnail_url
                  ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎬</div>
                }
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '16px 6px 6px' }}>
                  <div style={{ fontSize: 11, color: 'white', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{v.title}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

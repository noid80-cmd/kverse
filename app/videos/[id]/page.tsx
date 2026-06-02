'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/explore', label: '탐색', icon: '🔍' },
  { href: '/videos/upload', label: '올리기', icon: '➕' },
  { href: '/reactions', label: '반응', icon: '⭐' },
  { href: '/profile/edit', label: '프로필', icon: '👤' },
]

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Video = {
  id: string; title: string; description: string | null; video_url: string | null
  thumbnail_url: string | null; view_count: number; status: string
  category: string; tags: string[]; created_at: string; talent_id: string
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: v } = await supabase.from('videos').select('*').eq('id', id).single()
      if (!v) { router.push('/videos'); return }
      setVideo(v)
      setIsOwner(user?.id === v.talent_id)

      const { count } = await supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('video_id', id)
      setBookmarkCount(count ?? 0)

      // 조회수 증가
      if (user?.id !== v.talent_id) {
        await supabase.from('videos').update({ view_count: v.view_count + 1 }).eq('id', id)
      }
    }
    load()
  }, [id])

  async function handleDelete() {
    if (!confirm('영상을 삭제할까요?')) return
    await supabase.from('videos').delete().eq('id', id)
    router.push('/videos')
  }

  if (!video) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f8', color: '#8b8baa' }}>
      불러오는 중...
    </div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8b8baa', background: 'none', border: 'none', padding: 0 }}>←</button>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1e1b4b', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{video.title}</h1>
        </div>

        {/* 영상 플레이어 */}
        <div style={{ borderRadius: 20, overflow: 'hidden', background: '#000', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {video.video_url ? (
            <video src={video.video_url} controls style={{ width: '100%', maxHeight: 280, display: 'block' }}
              poster={video.thumbnail_url ?? undefined} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14 }}>
              영상 준비 중...
            </div>
          )}
        </div>

        {/* 정보 카드 */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e8e8f2', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, background: '#f0f0f8', color: '#6366f1', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {categoryLabel[video.category] ?? video.category}
            </span>
            <span style={{ fontSize: 12, color: '#8b8baa' }}>조회 {video.view_count}회</span>
            <span style={{ fontSize: 12, color: video.status === 'active' ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
              {video.status === 'active' ? '● 공개' : '● 검토중'}
            </span>
          </div>
          {video.description && <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, marginBottom: 12 }}>{video.description}</p>}
          {video.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {video.tags.map(t => (
                <span key={t} style={{ fontSize: 12, background: '#f5f3ff', color: '#7c3aed', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 반응 통계 */}
        <div style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', borderRadius: 20, padding: 20, border: '1px solid #c4b5fd', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 32 }}>⭐</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#4f46e5' }}>{bookmarkCount}</div>
            <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>기획사 관심 표시</div>
          </div>
        </div>

        {/* 소유자 액션 */}
        {isOwner && (
          <button onClick={handleDelete}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid #fca5a5', color: '#ef4444', fontWeight: 700, fontSize: 15 }}>
            영상 삭제
          </button>
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const adminNav = [
  { href: '/admin/users', label: '👥 회원' },
  { href: '/admin/agencies', label: '🏢 기획사' },
  { href: '/admin/videos', label: '🎬 영상' },
]

type Video = {
  id: string; title: string; status: string; view_count: number; is_featured: boolean; created_at: string; category: string
  talent: { name: string } | null
}

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}
const statusLabel: Record<string, string> = {
  active: '공개', processing: '검토중', hidden: '숨김', deleted: '삭제됨'
}
const statusColor: Record<string, string> = {
  active: '#22c55e', processing: '#f59e0b', hidden: '#94a3b8', deleted: '#ef4444'
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data } = await supabase.from('videos').select(`
        id, title, status, view_count, is_featured, created_at, category,
        talent:profiles!talent_id(name)
      `).order('created_at', { ascending: false })
      setVideos((data as unknown as Video[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function setStatus(id: string, status: string) {
    await supabase.from('videos').update({ status }).eq('id', id)
    setVideos(prev => prev.map(v => v.id === id ? { ...v, status } : v))
  }

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from('videos').update({ is_featured: !current }).eq('id', id)
    setVideos(prev => prev.map(v => v.id === id ? { ...v, is_featured: !current } : v))
  }

  const filtered = statusFilter === 'all' ? videos : videos.filter(v => v.status === statusFilter)

  return (
    <div className="min-h-screen pb-10" style={{ background: '#f0f0f8' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8f2', position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <span style={{ fontWeight: 900, fontSize: 18, color: '#1e1b4b' }}>KVERSE 관리자</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {adminNav.map(n => (
              <Link key={n.href} href={n.href}
                style={{ fontSize: 13, fontWeight: 700, color: n.href === '/admin/videos' ? '#6366f1' : '#8b8baa', padding: '6px 12px', borderRadius: 10, textDecoration: 'none', background: n.href === '/admin/videos' ? '#ede9fe' : 'transparent' }}>
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>영상 관리 <span style={{ fontSize: 14, color: '#8b8baa', fontWeight: 500 }}>({filtered.length}개)</span></h1>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['all', 'active', 'processing', 'hidden', 'deleted'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, transition: 'all 0.15s', cursor: 'pointer',
                background: statusFilter === s ? '#6366f1' : '#fff',
                color: statusFilter === s ? 'white' : '#8b8baa',
                border: statusFilter === s ? '1px solid transparent' : '1px solid #e0e0f0',
              }}>
              {s === 'all' ? '전체' : statusLabel[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(v => (
              <div key={v.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid #e8e8f2', opacity: v.status === 'deleted' ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{v.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#8b8baa' }}>{v.talent?.name ?? '?'}</span>
                      <span style={{ fontSize: 11, background: '#f0f0f8', color: '#6366f1', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>{categoryLabel[v.category]}</span>
                      <span style={{ fontSize: 12, color: '#8b8baa' }}>조회 {v.view_count}</span>
                      {v.is_featured && <span style={{ fontSize: 11, background: '#fef9c3', color: '#d97706', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>⭐추천</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <select value={v.status} onChange={e => setStatus(v.id, e.target.value)}
                      style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '1px solid #e0e0f0', background: '#f8f7ff', color: statusColor[v.status], fontWeight: 700 }}>
                      <option value="active">공개</option>
                      <option value="processing">검토중</option>
                      <option value="hidden">숨김</option>
                      <option value="deleted">삭제</option>
                    </select>
                    <button onClick={() => toggleFeatured(v.id, v.is_featured)}
                      style={{ fontSize: 11, padding: '5px 8px', borderRadius: 8, border: '1px solid #e0e0f0', background: 'none', color: v.is_featured ? '#d97706' : '#8b8baa', fontWeight: 700 }}>
                      {v.is_featured ? '⭐ 추천중' : '추천'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

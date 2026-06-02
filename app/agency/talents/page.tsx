'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import Link from 'next/link'

type Bookmark = {
  id: string; created_at: string; note: string | null
  video: { id: string; title: string; thumbnail_url: string | null; category: string } | null
  talent: { id: string; name: string; avatar_url: string | null; bio: string | null; skills: string[] } | null
}

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

export default function AgencyTalentsPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setMyId(user.id)

      const { data } = await supabase.from('bookmarks').select(`
        id, created_at, note,
        video:videos(id, title, thumbnail_url, category),
        talent:profiles!talent_id(id, name, avatar_url, bio, skills)
      `).eq('agency_member_id', user.id).order('created_at', { ascending: false })

      setBookmarks((data as unknown as Bookmark[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function removeBookmark(id: string) {
    await supabase.from('bookmarks').delete().eq('id', id)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>관심 지망생</h1>
        <p style={{ fontSize: 13, color: '#8b8baa', marginBottom: 20 }}>북마크한 영상 {bookmarks.length}개</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : bookmarks.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 6 }}>관심 지망생이 없어요</div>
            <div style={{ fontSize: 13, color: '#8b8baa', marginBottom: 20 }}>영상 탐색에서 별표를 눌러 저장해보세요</div>
            <Link href="/agency/discover"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
              탐색하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bookmarks.map(b => (
              <div key={b.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <Link href={`/agency/discover/${b.video?.id}`} style={{ width: 90, flexShrink: 0, textDecoration: 'none', background: b.video?.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, #e0e7ff, #ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {b.video?.thumbnail_url
                      ? <img src={b.video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 24 }}>🎬</span>
                    }
                  </Link>
                  <div style={{ flex: 1, padding: '14px 14px 14px 16px', minWidth: 0 }}>
                    <Link href={`/agency/talents/${b.talent?.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {b.talent?.avatar_url
                          ? <img src={b.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: 'white', fontWeight: 900, fontSize: 11 }}>{b.talent?.name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <span style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{b.talent?.name}</span>
                      <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 2 }}>프로필 →</span>
                      {b.video?.category && (
                        <span style={{ fontSize: 11, background: '#f0f0f8', color: '#6366f1', padding: '2px 7px', borderRadius: 6, fontWeight: 600, marginLeft: 'auto' }}>
                          {categoryLabel[b.video.category]}
                        </span>
                      )}
                    </Link>
                    <Link href={`/agency/discover/${b.video?.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {b.video?.title ?? '영상'}
                      </div>
                    </Link>
                    {b.talent?.skills && b.talent.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {b.talent.skills.slice(0, 3).map(s => (
                          <span key={s} style={{ fontSize: 11, background: '#f5f3ff', color: '#7c3aed', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f8', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => removeBookmark(b.id)}
                    style={{ fontSize: 12, color: '#b0b0cc', background: 'none', border: 'none', fontWeight: 600 }}>
                    북마크 취소
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AgencyNav />
    </div>
  )
}

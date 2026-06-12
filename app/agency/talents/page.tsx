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
      const user = (await supabase.auth.getSession()).data.session?.user
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
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff', marginBottom: 6 }}>관심 지망생</h1>
        <p style={{ fontSize: 13, color: '#8888aa', marginBottom: 20 }}>북마크한 영상 {bookmarks.length}개</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#555570' }}>불러오는 중...</div>
        ) : bookmarks.length === 0 ? (
          <div style={{ background: '#111118', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
            <div style={{ fontWeight: 700, color: '#eeeeff', marginBottom: 6 }}>관심 지망생이 없어요</div>
            <div style={{ fontSize: 13, color: '#8888aa', marginBottom: 20 }}>영상 탐색에서 별표를 눌러 저장해보세요</div>
            <Link href="/agency/discover"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
              탐색하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bookmarks.map(b => (
              <div key={b.id} style={{ background: '#111118', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <Link href={`/agency/discover/${b.video?.id}`} style={{ width: 90, flexShrink: 0, textDecoration: 'none', background: b.video?.thumbnail_url ? 'transparent' : 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {b.video?.thumbnail_url
                      ? <img src={b.video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 24 }}>🎬</span>
                    }
                  </Link>
                  <div style={{ flex: 1, padding: '14px 14px 14px 16px', minWidth: 0 }}>
                    <Link href={`/agency/talents/${b.talent?.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {b.talent?.avatar_url
                          ? <img src={b.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: 'white', fontWeight: 900, fontSize: 11 }}>{b.talent?.name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <span style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14 }}>{b.talent?.name}</span>
                      <span style={{ fontSize: 11, color: '#22d3ee', marginLeft: 2 }}>프로필 →</span>
                      {b.video?.category && (
                        <span style={{ fontSize: 11, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '2px 7px', borderRadius: 6, fontWeight: 600, marginLeft: 'auto' }}>
                          {categoryLabel[b.video.category]}
                        </span>
                      )}
                    </Link>
                    <Link href={`/agency/discover/${b.video?.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontSize: 13, color: '#8888aa', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {b.video?.title ?? '영상'}
                      </div>
                    </Link>
                    {b.talent?.skills && b.talent.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {b.talent.skills.slice(0, 3).map(s => (
                          <span key={s} style={{ fontSize: 11, background: 'rgba(8,145,178,0.12)', color: '#a78bfa', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => removeBookmark(b.id)}
                    style={{ fontSize: 12, color: '#555570', background: 'none', border: 'none', fontWeight: 600 }}>
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

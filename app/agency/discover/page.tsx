'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import Link from 'next/link'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}
const categoryEmoji: Record<string, string> = {
  vocal: '🎤', dance: '💃', acting: '🎭', rap: '🎙️', other: '✨'
}

type Video = {
  id: string; title: string; description: string | null; thumbnail_url: string | null
  view_count: number; category: string; tags: string[]; created_at: string
  talent: { id: string; name: string; avatar_url: string | null; birth_date: string | null; skills: string[] } | null
}

export default function DiscoverPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const [myId, setMyId] = useState<string>('')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setMyId(user.id)

    let q = supabase.from('videos').select(`
      id, title, description, thumbnail_url, view_count, category, tags, created_at,
      talent:profiles!talent_id(id, name, avatar_url, birth_date, skills)
    `).eq('status', 'active').order('created_at', { ascending: false }).limit(50)

    if (category !== 'all') q = q.eq('category', category)
    const { data } = await q

    const { data: bm } = await supabase.from('bookmarks').select('video_id').eq('agency_member_id', user.id)
    setBookmarked(new Set(bm?.map(b => b.video_id).filter(Boolean) as string[]))
    setVideos((data as unknown as Video[]) ?? [])
    setLoading(false)
  }, [category])

  useEffect(() => { load() }, [load])

  async function toggleBookmark(videoId: string, talentId: string) {
    if (bookmarked.has(videoId)) {
      await supabase.from('bookmarks').delete().eq('agency_member_id', myId).eq('video_id', videoId)
      setBookmarked(prev => { const s = new Set(prev); s.delete(videoId); return s })
    } else {
      await supabase.from('bookmarks').insert({ agency_member_id: myId, talent_id: talentId, video_id: videoId })
      setBookmarked(prev => new Set([...prev, videoId]))
    }
  }

  function getAge(birth: string | null) {
    if (!birth) return null
    const age = new Date().getFullYear() - new Date(birth).getFullYear()
    return age
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>KVERSE</h1>
          <p style={{ fontSize: 13, color: '#8b8baa' }}>오디션 지망생 영상 탐색</p>
        </div>

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
          {(['all', 'vocal', 'dance', 'acting', 'rap', 'other'] as const).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                background: category === c ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
                color: category === c ? 'white' : '#8b8baa',
                boxShadow: category === c ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                border: category === c ? '1px solid transparent' : '1px solid #e0e0f0',
              }}>
              {c === 'all' ? '전체' : `${categoryEmoji[c]} ${categoryLabel[c]}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : videos.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎬</div>
            <div style={{ fontWeight: 700, color: '#1e1b4b' }}>아직 영상이 없어요</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {videos.map(v => (
              <div key={v.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e8e8f2', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                {/* 썸네일 */}
                <Link href={`/agency/discover/${v.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{
                    height: 180, background: v.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
                    cursor: 'pointer',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                      : <span style={{ fontSize: 48 }}>🎬</span>
                    }
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '4px 10px', pointerEvents: 'none',
                    }}>
                      <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>
                        {categoryEmoji[v.category]} {categoryLabel[v.category]}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}>▶</div>
                    </div>
                  </div>
                </Link>

                <div style={{ padding: '14px 16px' }}>
                  {/* 지망생 정보 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {v.talent?.avatar_url
                        ? <img src={v.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'white', fontWeight: 900, fontSize: 13 }}>{v.talent?.name?.[0] ?? '?'}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{v.talent?.name ?? '이름 없음'}</div>
                      {getAge(v.talent?.birth_date ?? null) && (
                        <div style={{ fontSize: 12, color: '#8b8baa' }}>{getAge(v.talent?.birth_date ?? null)}세</div>
                      )}
                    </div>
                    <button onClick={() => v.talent && toggleBookmark(v.id, v.talent.id)}
                      style={{
                        width: 36, height: 36, borderRadius: 12, border: 'none', fontSize: 18,
                        background: bookmarked.has(v.id) ? '#fef9c3' : '#f0f0f8',
                        transition: 'all 0.15s',
                      }}>
                      {bookmarked.has(v.id) ? '⭐' : '☆'}
                    </button>
                  </div>

                  <Link href={`/agency/discover/${v.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 15, marginBottom: 6 }}>{v.title}</div>
                    {v.description && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.description}</div>}
                  </Link>

                  {v.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {v.tags.slice(0, 4).map(t => (
                        <span key={t} style={{ fontSize: 11, background: '#f5f3ff', color: '#7c3aed', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>#{t}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#b0b0cc' }}>조회 {v.view_count}회</div>
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

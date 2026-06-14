'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import PushSubscribe from '@/components/PushSubscribe'
import Link from 'next/link'
import { Heart, Bookmark, Video as VideoIcon } from 'lucide-react'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Video = {
  id: string; title: string; description: string | null; thumbnail_url: string | null
  view_count: number; like_count: number; category: string; tags: string[]; created_at: string
  talent: { id: string; name: string; avatar_url: string | null; birth_date: string | null; skills: string[] } | null
}

export default function DiscoverPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'latest' | 'likes'>('latest')
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [myId, setMyId] = useState<string>('')
  const [agencyName, setAgencyName] = useState<string | null>(null)
  const [agencyVerified, setAgencyVerified] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'agency' && profile?.role !== 'admin') { window.location.href = '/dashboard'; return }
    if (profile?.role === 'admin') setIsAdmin(true)

    setMyId(user.id)

    const { data: am } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).single()
    if (am?.agency_id) {
      const { data: ag } = await supabase.from('agencies').select('name, is_verified').eq('id', am.agency_id).single()
      if (ag) { setAgencyName(ag.name); setAgencyVerified(ag.is_verified) }
    }

    let q = supabase.from('videos').select(`
      id, title, description, thumbnail_url, view_count, like_count, category, tags, created_at,
      talent:profiles!talent_id(id, name, avatar_url, birth_date, skills)
    `).eq('status', 'active').or('visibility.eq.public,visibility.eq.agency_only,visibility.is.null').limit(50)

    if (category !== 'all') q = q.eq('category', category)
    q = sort === 'likes'
      ? q.order('like_count', { ascending: false })
      : q.order('created_at', { ascending: false })
    const { data } = await q

    const vids = (data as unknown as Video[]) ?? []
    const counts: Record<string, number> = {}
    vids.forEach(v => { counts[v.id] = v.like_count })
    setLikeCounts(counts)

    const { data: bm } = await supabase.from('bookmarks').select('video_id').eq('agency_member_id', user.id)
    setBookmarked(new Set(bm?.map(b => b.video_id).filter(Boolean) as string[]))

    const { data: lk } = await supabase.from('likes').select('video_id').eq('user_id', user.id)
    setLiked(new Set(lk?.map(l => l.video_id).filter(Boolean) as string[]))

    setVideos(vids)
    setLoading(false)
  }, [category, sort])

  useEffect(() => { load() }, [load])

  async function toggleLike(videoId: string) {
    if (liked.has(videoId)) {
      await supabase.from('likes').delete().eq('video_id', videoId).eq('user_id', myId)
      setLiked(prev => { const s = new Set(prev); s.delete(videoId); return s })
      setLikeCounts(prev => ({ ...prev, [videoId]: Math.max((prev[videoId] ?? 1) - 1, 0) }))
    } else {
      await supabase.from('likes').insert({ video_id: videoId, user_id: myId })
      setLiked(prev => new Set([...prev, videoId]))
      setLikeCounts(prev => ({ ...prev, [videoId]: (prev[videoId] ?? 0) + 1 }))
    }
  }

  async function toggleBookmark(videoId: string, talentId: string) {
    if (bookmarked.has(videoId)) {
      await supabase.from('bookmarks').delete().eq('agency_member_id', myId).eq('video_id', videoId)
      setBookmarked(prev => { const s = new Set(prev); s.delete(videoId); return s })
    } else {
      await supabase.from('bookmarks').insert({ agency_member_id: myId, talent_id: talentId, video_id: videoId })
      setBookmarked(prev => new Set([...prev, videoId]))
      const agName = agencyName ?? '기획사'
      fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: talentId, title: '관심 표시', body: `${agName}이 내 영상을 관심 목록에 추가했어요`, url: '/reactions?tab=bookmarks' }) })
    }
  }

  function getAge(birth: string | null) {
    if (!birth) return null
    const age = new Date().getFullYear() - new Date(birth).getFullYear()
    return age
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      {isAdmin && (
        <a href="/admin" style={{
          position: 'fixed', bottom: 24, right: 16, zIndex: 999,
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: 'white', fontSize: 12, fontWeight: 800,
          padding: '8px 14px', borderRadius: 20,
          textDecoration: 'none', boxShadow: '0 4px 16px rgba(109,40,217,0.4)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>⚙️ 관리자</a>
      )}
      <PushSubscribe />
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff', minHeight: 32 }}>{agencyName ?? ''}</h1>
              {agencyVerified && (
                <span style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8 }}>인증</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#8888aa' }}>오디션 지망생 영상 탐색</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['latest', 'likes'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                style={{
                  padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: sort === s ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                  color: sort === s ? 'white' : '#8888aa',
                  boxShadow: sort === s ? '0 2px 8px rgba(6,182,212,0.3)' : 'none',
                }}>
                {s === 'latest' ? '최신순' : '인기순'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
          {(['all', 'vocal', 'dance', 'acting', 'rap', 'other'] as const).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                background: category === c ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                color: category === c ? 'white' : '#8888aa',
                boxShadow: category === c ? '0 4px 12px rgba(6,182,212,0.3)' : 'none',
                border: category === c ? '1px solid transparent' : '1px solid rgba(255,255,255,0.07)',
              }}>
              {c === 'all' ? '전체' : categoryLabel[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#555570' }}>불러오는 중...</div>
        ) : videos.length === 0 ? (
          <div style={{ background: '#111118', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#22d3ee' }}>
              <VideoIcon size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 700, color: '#eeeeff' }}>아직 영상이 없어요</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {videos.map(v => (
              <div key={v.id} style={{ background: '#111118', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Link href={`/agency/discover/${v.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{
                    height: 180, background: v.thumbnail_url ? 'transparent' : 'rgba(6,182,212,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
                    cursor: 'pointer',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                      : <VideoIcon size={40} strokeWidth={1.5} color="#555570" />
                    }
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '4px 10px', pointerEvents: 'none',
                    }}>
                      <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>
                        {categoryLabel[v.category]}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}>▶</div>
                    </div>
                  </div>
                </Link>

                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Link href={`/agency/talents/${v.talent?.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textDecoration: 'none', minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {v.talent?.avatar_url
                          ? <img src={v.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: 'white', fontWeight: 900, fontSize: 13 }}>{v.talent?.name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14 }}>{v.talent?.name ?? '이름 없음'}</div>
                        {getAge(v.talent?.birth_date ?? null) && (
                          <div style={{ fontSize: 12, color: '#555570' }}>{getAge(v.talent?.birth_date ?? null)}세</div>
                        )}
                      </div>
                    </Link>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleLike(v.id)}
                        style={{
                          height: 36, borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
                          padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                          background: liked.has(v.id) ? 'rgba(244,63,94,0.12)' : '#1a1a25',
                          color: liked.has(v.id) ? '#f43f5e' : '#555570',
                        }}>
                        <Heart size={14} strokeWidth={2} fill={liked.has(v.id) ? 'currentColor' : 'none'} /> {likeCounts[v.id] ?? 0}
                      </button>
                      <button onClick={() => v.talent && toggleBookmark(v.id, v.talent.id)}
                        style={{
                          width: 36, height: 36, borderRadius: 12, border: 'none', fontSize: 18, cursor: 'pointer',
                          background: bookmarked.has(v.id) ? 'rgba(251,191,36,0.12)' : '#1a1a25',
                          color: bookmarked.has(v.id) ? '#fbbf24' : '#555570',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <Bookmark size={16} strokeWidth={2} fill={bookmarked.has(v.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  <Link href={`/agency/discover/${v.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 15, marginBottom: 6 }}>{v.title}</div>
                    {v.description && <div style={{ fontSize: 13, color: '#8888aa', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.description}</div>}
                  </Link>

                  {v.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {v.tags.slice(0, 4).map(t => (
                        <span key={t} style={{ fontSize: 11, background: 'rgba(8,145,178,0.12)', color: '#a78bfa', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>#{t}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#555570' }}>조회 {v.view_count}회</div>
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

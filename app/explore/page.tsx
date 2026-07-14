'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone, Heart, Volume2, VolumeX } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

type VideoItem = {
  id: string
  title: string
  thumbnail_url: string | null
  video_url: string | null
  view_count: number
  like_count: number
  category: string
  tags: string[]
  created_at: string
  talent: { id: string; name: string | null; avatar_url: string | null } | null
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  vocal:  'linear-gradient(135deg, #0c3a6a, #0a1a4a)',
  dance:  'linear-gradient(135deg, #3a0c5a, #1a0a3a)',
  acting: 'linear-gradient(135deg, #0c5a3a, #0a2a1a)',
  rap:    'linear-gradient(135deg, #5a2a0c, #2a0c0a)',
  other:  'linear-gradient(135deg, #1a3a5a, #0a1a2a)',
}
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #0c3a6a, #0a1a4a)',
  'linear-gradient(135deg, #3a0c5a, #1a0a3a)',
  'linear-gradient(135deg, #0c5a3a, #0a2a1a)',
  'linear-gradient(135deg, #5a2a0c, #2a0c0a)',
]

function SwipeCard({
  video, muted, onMuteToggle, liked, likeCount, onLike, talentFallback,
}: {
  video: VideoItem; muted: boolean; onMuteToggle: () => void
  liked: boolean; likeCount: number; onLike: () => void; talentFallback: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!videoRef.current) return
      if (entry.isIntersecting) {
        videoRef.current.play().catch(() => {})
        setPaused(false)
      } else {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        setPaused(false)
      }
    }, { threshold: 0.7 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  function handleTap() {
    if (!videoRef.current) return
    if (videoRef.current.paused) { videoRef.current.play().catch(() => {}); setPaused(false) }
    else { videoRef.current.pause(); setPaused(true) }
  }

  return (
    <div ref={containerRef} style={{ height: '100dvh', scrollSnapAlign: 'start', position: 'relative', background: '#000', flexShrink: 0, overflow: 'hidden' }}>
      {video.video_url ? (
        <video ref={videoRef} src={video.video_url} poster={video.thumbnail_url ?? undefined}
          loop muted={muted} playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      ) : video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: 0.2 }}>🎤</div>
      )}

      <div onClick={handleTap} style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'pointer', touchAction: 'pan-y' }} />

      {paused && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6, pointerEvents: 'none' }}>
          <svg width="22" height="26" viewBox="0 0 22 26" fill="white"><rect x="0" y="0" width="8" height="26" rx="2"/><rect x="14" y="0" width="8" height="26" rx="2"/></svg>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(transparent, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.92))', padding: '80px 16px 100px' }}>
        <Link href={`/videos/${video.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ fontWeight: 900, color: '#fff', fontSize: 17, marginBottom: 6, lineHeight: 1.3 }}>{video.title}</div>
        </Link>
        {video.talent && (
          <Link href={`/talent/${video.talent.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'rgba(6,182,212,0.4)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {video.talent.avatar_url ? <img src={video.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14 }}>🎤</span>}
            </div>
            <span style={{ color: '#eeeeff', fontWeight: 700, fontSize: 14 }}>{video.talent.name ?? talentFallback}</span>
          </Link>
        )}
        {video.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {video.tags.slice(0, 4).map(t => <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>#{t}</span>)}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', right: 14, bottom: 110, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <button onClick={onLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: liked ? 'rgba(244,63,94,0.25)' : 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <Heart size={22} strokeWidth={2} fill={liked ? '#f43f5e' : 'none'} color={liked ? '#f43f5e' : 'white'} />
          </div>
          <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{likeCount}</span>
        </button>
        <button onClick={onMuteToggle} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            {muted ? <VolumeX size={20} strokeWidth={2} color="white" /> : <Volume2 size={20} strokeWidth={2} color="white" />}
          </div>
        </button>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const { lang } = useLang()
  const tx = useT(lang)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'latest' | 'likes'>('latest')
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [myId, setMyId] = useState('')
  const [muted, setMuted] = useState(true)
  const [swipeIdx, setSwipeIdx] = useState<number | null>(null)
  const swipeVideoRefs = useRef<(HTMLDivElement | null)[]>([])
  const supabase = createClient()

  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={24} strokeWidth={2.5} color="white" />, fab: true },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} /> },
  ]

  const categoryLabels: Record<string, string> = {
    vocal: tx.videos.vocal, dance: tx.videos.dance, acting: tx.videos.acting, rap: tx.videos.rap, other: tx.videos.other,
  }

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    setMyId(user.id)

    let q = supabase.from('videos').select(`
      id, title, thumbnail_url, video_url, view_count, like_count, category, tags, created_at,
      talent:profiles!talent_id(id, name, avatar_url)
    `).eq('status', 'active').or('visibility.eq.public,visibility.is.null').limit(30)

    if (category !== 'all') q = q.eq('category', category)
    q = sort === 'likes'
      ? q.order('like_count', { ascending: false })
      : q.order('created_at', { ascending: false })

    const { data } = await q
    const vids = (data as unknown as VideoItem[]) ?? []
    setVideos(vids)

    const counts: Record<string, number> = {}
    vids.forEach(v => { counts[v.id] = v.like_count })
    setLikeCounts(counts)

    const { data: myLikes } = await supabase.from('likes').select('video_id').eq('user_id', user.id)
    setLiked(new Set(myLikes?.map(l => l.video_id).filter(Boolean) as string[]))

    setLoading(false)
  }, [category, sort])

  useEffect(() => { load() }, [load])

  // Scroll to selected video when entering swipe mode
  useEffect(() => {
    if (swipeIdx !== null) {
      requestAnimationFrame(() => {
        swipeVideoRefs.current[swipeIdx]?.scrollIntoView({ behavior: 'instant' })
      })
    }
  }, [swipeIdx])

  // Lock body scroll when swipe mode is active
  useEffect(() => {
    document.body.style.overflow = swipeIdx !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [swipeIdx])

  async function toggleLike(videoId: string) {
    if (!myId) return
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

  return (
    <>
      {/* ── Grid view ── */}
      <div style={{ background: '#050e1a', minHeight: '100dvh', paddingBottom: 88 }}>

        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,14,26,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: 'max(env(safe-area-inset-top, 0px), 12px) 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="26" height="26" viewBox="0 0 100 100">
                <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#06b6d4" />
                <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="rgba(6,182,212,0.6)" />
              </svg>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#eeeeff', letterSpacing: -0.5 }}>Kpick</span>
            </div>
            <button onClick={() => setSort(s => s === 'latest' ? 'likes' : 'latest')} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#9494b0' }}>
              {sort === 'latest' ? `🕐 ${tx.explore.sortLatest}` : `❤️ ${tx.explore.sortLikes}`}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '10px 16px', marginBottom: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)' }}>Search covers, artists...</span>
          </div>

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {(['all', 'vocal', 'dance', 'acting', 'rap', 'other'] as const).map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: category === c ? '#06b6d4' : 'rgba(255,255,255,0.07)', color: category === c ? '#fff' : 'rgba(255,255,255,0.45)', boxShadow: category === c ? '0 2px 12px rgba(6,182,212,0.35)' : 'none' }}>
                {c === 'all' ? tx.explore.allCategories : categoryLabels[c]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 12px 0' }}>
          {!loading && videos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#eeeeff' }}>
                {sort === 'latest' ? 'Latest Covers' : 'Most Liked'}
              </span>
              <span style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600 }}>{videos.length} covers</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ borderRadius: 18, aspectRatio: '9/14', background: 'rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🎤</div>
              <div style={{ fontWeight: 700, color: '#eeeeff' }}>{tx.explore.noVideos}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {videos.map((v, i) => {
                const grad = CATEGORY_GRADIENTS[v.category] ?? FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length]
                const isLiked = liked.has(v.id)
                const count = likeCounts[v.id] ?? 0
                return (
                  <div key={v.id} style={{ borderRadius: 18, overflow: 'hidden', background: '#111118', cursor: 'pointer' }}
                    onClick={() => setSwipeIdx(i)}>
                    <div style={{ aspectRatio: '9/14', position: 'relative', overflow: 'hidden' }}>
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 52, opacity: 0.2 }}>{v.category === 'dance' ? '♫' : '♪'}</span>
                        </div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.12)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="15" height="17" viewBox="0 0 15 17" fill="white"><path d="M1 1L14 8.5L1 16V1Z"/></svg>
                        </div>
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(transparent, rgba(0,0,0,0.82))' }} />
                      <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(4px)', borderRadius: 8, padding: '3px 8px', fontSize: 10, color: '#22d3ee', fontWeight: 700 }}>
                        {categoryLabels[v.category] ?? v.category}
                      </div>
                    </div>
                    <div style={{ padding: '10px 10px 6px' }}>
                      <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 13, lineHeight: 1.3, marginBottom: 7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {v.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {v.talent ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flex: 1 }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', background: 'rgba(6,182,212,0.25)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                              {v.talent.avatar_url ? <img src={v.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🎤'}
                            </div>
                            <span style={{ fontSize: 11, color: '#8888aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.talent.name ?? tx.common.talent}</span>
                          </div>
                        ) : <div style={{ flex: 1 }} />}
                        <button onClick={e => { e.stopPropagation(); toggleLike(v.id) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, padding: '2px 0 4px' }}>
                          <Heart size={13} strokeWidth={2} fill={isLiked ? '#f43f5e' : 'none'} color={isLiked ? '#f43f5e' : '#555570'} />
                          <span style={{ fontSize: 11, color: isLiked ? '#f43f5e' : '#555570', fontWeight: 600 }}>{count}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <BottomNav items={talentNav} />
      </div>

      {/* ── Swipe overlay ── */}
      {swipeIdx !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', overflowY: 'scroll', scrollSnapType: 'y mandatory' }}>
          {/* Back button */}
          <button
            onClick={() => setSwipeIdx(null)}
            style={{ position: 'fixed', top: 'max(env(safe-area-inset-top, 0px), 16px)', left: 16, zIndex: 120, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>

          {/* Category pills */}
          <div style={{ position: 'fixed', top: 'max(env(safe-area-inset-top, 0px), 16px)', left: 64, right: 16, zIndex: 120, display: 'flex', gap: 8, overflowX: 'auto' }}>
            {(['all', 'vocal', 'dance', 'acting', 'rap', 'other'] as const).map(c => (
              <button key={c} onClick={() => { setCategory(c); setSwipeIdx(null) }} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', backdropFilter: 'blur(8px)', background: category === c ? 'rgba(6,182,212,0.85)' : 'rgba(0,0,0,0.5)', color: 'white', boxShadow: category === c ? '0 2px 8px rgba(6,182,212,0.4)' : 'none' }}>
                {c === 'all' ? tx.explore.allCategories : categoryLabels[c]}
              </button>
            ))}
          </div>

          {videos.map((v, i) => (
            <div key={v.id} ref={el => { swipeVideoRefs.current[i] = el }}>
              <SwipeCard
                video={v}
                muted={muted}
                onMuteToggle={() => setMuted(m => !m)}
                liked={liked.has(v.id)}
                likeCount={likeCounts[v.id] ?? 0}
                onLike={() => toggleLike(v.id)}
                talentFallback={tx.common.talent}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

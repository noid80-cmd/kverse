'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone, Heart, Volume2, VolumeX, Video } from 'lucide-react'
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

function VideoCard({
  video,
  muted,
  onMuteToggle,
  liked,
  likeCount,
  onLike,
  talentFallback,
}: {
  video: VideoItem
  muted: boolean
  onMuteToggle: () => void
  liked: boolean
  likeCount: number
  onLike: () => void
  talentFallback: string
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
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {})
      setPaused(false)
    } else {
      videoRef.current.pause()
      setPaused(true)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100dvh', scrollSnapAlign: 'start', position: 'relative', background: '#000', flexShrink: 0, overflow: 'hidden' }}
    >
      {video.video_url ? (
        <video
          ref={videoRef}
          src={video.video_url}
          poster={video.thumbnail_url ?? undefined}
          loop muted={muted} playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333350' }}>
          <Video size={48} strokeWidth={1.5} />
        </div>
      )}

      <div
        onClick={handleTap}
        style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'pointer', touchAction: 'pan-y' }}
      />

      {paused && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 6, pointerEvents: 'none',
        }}>
          <svg width="22" height="26" viewBox="0 0 22 26" fill="white">
            <rect x="0" y="0" width="8" height="26" rx="2"/>
            <rect x="14" y="0" width="8" height="26" rx="2"/>
          </svg>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.92))',
        padding: '80px 16px 100px',
      }}>
        <Link href={`/videos/${video.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ fontWeight: 900, color: '#fff', fontSize: 17, marginBottom: 6, lineHeight: 1.3 }}>
            {video.title}
          </div>
        </Link>
        {video.talent && (
          <Link href={`/talent/${video.talent.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
              background: 'rgba(6,182,212,0.4)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {video.talent.avatar_url
                ? <img src={video.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 14 }}>🎤</span>
              }
            </div>
            <span style={{ color: '#eeeeff', fontWeight: 700, fontSize: 14 }}>{video.talent.name ?? talentFallback}</span>
          </Link>
        )}
        {video.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {video.tags.slice(0, 4).map(t => (
              <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', right: 14, bottom: 110, zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        <button onClick={onLike}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: liked ? 'rgba(244,63,94,0.25)' : 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
          }}>
            <Heart size={22} strokeWidth={2} fill={liked ? '#f43f5e' : 'none'} color={liked ? '#f43f5e' : 'white'} />
          </div>
          <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{likeCount}</span>
        </button>

        <button onClick={onMuteToggle} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
          }}>
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
  const supabase = createClient()

  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={22} strokeWidth={1.8} /> },
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
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
        padding: '12px 16px 8px',
        background: 'linear-gradient(rgba(0,0,0,0.65), transparent)',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1 }}>
            {(['all', 'vocal', 'dance', 'acting', 'rap', 'other'] as const).map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer', backdropFilter: 'blur(8px)',
                background: category === c ? 'rgba(6,182,212,0.85)' : 'rgba(0,0,0,0.5)',
                color: 'white',
                boxShadow: category === c ? '0 2px 8px rgba(6,182,212,0.4)' : 'none',
              }}>
                {c === 'all' ? tx.explore.allCategories : categoryLabels[c]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSort(s => s === 'latest' ? 'likes' : 'latest')}
            style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: 'none', cursor: 'pointer', backdropFilter: 'blur(8px)',
              background: 'rgba(0,0,0,0.5)', color: 'white',
            }}>
            {sort === 'latest' ? `🕐 ${tx.explore.sortLatest}` : `❤️ ${tx.explore.sortLikes}`}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', inset: 0, background: '#000', overflowY: 'scroll', scrollSnapType: 'y mandatory' }}>
        {loading ? (
          <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570', scrollSnapAlign: 'start' }}>
            {tx.common.loading}
          </div>
        ) : videos.length === 0 ? (
          <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, scrollSnapAlign: 'start' }}>
            <div style={{ color: '#22d3ee' }}><Video size={48} strokeWidth={1.5} /></div>
            <div style={{ fontWeight: 700, color: '#eeeeff' }}>{tx.explore.noVideos}</div>
          </div>
        ) : (
          videos.map(v => (
            <VideoCard
              key={v.id}
              video={v}
              muted={muted}
              onMuteToggle={() => setMuted(m => !m)}
              liked={liked.has(v.id)}
              likeCount={likeCounts[v.id] ?? 0}
              onLike={() => toggleLike(v.id)}
              talentFallback={tx.common.talent}
            />
          ))
        )}
      </div>

      <BottomNav items={talentNav} />
    </>
  )
}

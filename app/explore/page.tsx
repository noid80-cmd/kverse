'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone, Heart, Volume2, VolumeX, Video } from 'lucide-react'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: <Home size={22} strokeWidth={1.8} /> },
  { href: '/explore', label: '탐색', icon: <Compass size={22} strokeWidth={1.8} /> },
  { href: '/dashboard/auditions', label: '오디션', icon: <Megaphone size={22} strokeWidth={1.8} /> },
  { href: '/videos/upload', label: '올리기', icon: <Plus size={22} strokeWidth={1.8} /> },
  { href: '/reactions', label: '반응', icon: <Bell size={22} strokeWidth={1.8} /> },
]

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

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
  myId,
}: {
  video: VideoItem
  muted: boolean
  onMuteToggle: () => void
  liked: boolean
  likeCount: number
  onLike: () => void
  myId: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current) return
        if (entry.isIntersecting) {
          videoRef.current.play().catch(() => {})
        } else {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
      },
      { threshold: 0.7 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  return (
    <div
      ref={containerRef}
      style={{
        height: '100dvh',
        scrollSnapAlign: 'start',
        position: 'relative',
        background: '#000',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {video.video_url ? (
        <video
          ref={videoRef}
          src={video.video_url}
          poster={video.thumbnail_url ?? undefined}
          loop
          muted={muted}
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333350' }}>
          <Video size={48} strokeWidth={1.5} />
        </div>
      )}

      {/* Bottom gradient + info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
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
              background: 'rgba(99,102,241,0.4)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {video.talent.avatar_url
                ? <img src={video.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 14 }}>🎤</span>
              }
            </div>
            <span style={{ color: '#eeeeff', fontWeight: 700, fontSize: 14 }}>
              {video.talent.name ?? '지망생'}
            </span>
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

      {/* Right-side actions */}
      <div style={{
        position: 'absolute', right: 14, bottom: 110,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        {/* Like */}
        <button
          onClick={onLike}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: liked ? 'rgba(244,63,94,0.25)' : 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <Heart
              size={22}
              strokeWidth={2}
              fill={liked ? '#f43f5e' : 'none'}
              color={liked ? '#f43f5e' : 'white'}
            />
          </div>
          <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{likeCount}</span>
        </button>

        {/* Mute */}
        <button
          onClick={onMuteToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            {muted
              ? <VolumeX size={20} strokeWidth={2} color="white" />
              : <Volume2 size={20} strokeWidth={2} color="white" />
            }
          </div>
        </button>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'latest' | 'likes'>('latest')
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [myId, setMyId] = useState('')
  const [muted, setMuted] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    setMyId(user.id)

    let q = supabase.from('videos').select(`
      id, title, thumbnail_url, video_url, view_count, like_count, category, tags, created_at,
      talent:profiles!talent_id(id, name, avatar_url)
    `).eq('status', 'active').limit(30)

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
      {/* Category filter — fixed top, outside scroll container */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: 'env(safe-area-inset-top, 12px) 16px 8px',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
        background: 'linear-gradient(rgba(0,0,0,0.6), transparent)',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, pointerEvents: 'auto' }}>
          {(['all', 'vocal', 'dance', 'acting', 'rap', 'other'] as const).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: category === c ? 'rgba(99,102,241,0.85)' : 'rgba(0,0,0,0.5)',
                color: 'white',
                backdropFilter: 'blur(8px)',
                boxShadow: category === c ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
              }}>
              {c === 'all' ? '전체' : categoryLabel[c]}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
            {(['latest', 'likes'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: sort === s ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)',
                  color: sort === s ? 'white' : 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(8px)',
                }}>
                {s === 'latest' ? '최신' : '인기'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll container */}
      <div style={{ position: 'fixed', inset: 0, background: '#000', overflowY: 'scroll', scrollSnapType: 'y mandatory' }}>
        {loading ? (
          <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570', scrollSnapAlign: 'start' }}>
            불러오는 중...
          </div>
        ) : videos.length === 0 ? (
          <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, scrollSnapAlign: 'start' }}>
            <div style={{ color: '#818cf8' }}><Video size={48} strokeWidth={1.5} /></div>
            <div style={{ fontWeight: 700, color: '#eeeeff' }}>아직 영상이 없어요</div>
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
              myId={myId}
            />
          ))
        )}
      </div>

      {/* BottomNav outside scroll container */}
      <BottomNav items={talentNav} />
    </>
  )
}

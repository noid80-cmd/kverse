'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { Home, Compass, Plus, Bell, Megaphone } from 'lucide-react'

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

type Video = {
  id: string; title: string; description: string | null; video_url: string | null
  thumbnail_url: string | null; view_count: number; like_count: number; status: string
  category: string; tags: string[]; created_at: string; talent_id: string
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [myId, setMyId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      const { data: v } = await supabase.from('videos').select('*').eq('id', id).single()
      if (!v) { router.push('/videos'); return }
      setVideo(v)
      setLikeCount(v.like_count ?? 0)
      if (user) {
        setMyId(user.id)
        setIsOwner(user.id === v.talent_id)
        const { data: lk } = await supabase.from('likes').select('id').eq('video_id', id).eq('user_id', user.id).single()
        setLiked(!!lk)
      }

      const { count } = await supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('video_id', id)
      setBookmarkCount(count ?? 0)

      if (user?.id !== v.talent_id) {
        await supabase.from('videos').update({ view_count: v.view_count + 1 }).eq('id', id)
      }
    }
    load()
  }, [id])

  async function toggleLike() {
    if (!myId) return
    if (liked) {
      await supabase.from('likes').delete().eq('video_id', id).eq('user_id', myId)
      setLiked(false)
      setLikeCount(c => Math.max(c - 1, 0))
    } else {
      await supabase.from('likes').insert({ video_id: id, user_id: myId })
      setLiked(true)
      setLikeCount(c => c + 1)
    }
  }

  async function handleDelete() {
    if (!confirm('영상을 삭제할까요?')) return
    await supabase.from('videos').delete().eq('id', id)
    router.push('/videos')
  }

  if (!video) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #6366f1', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8888aa', background: 'none', border: 'none', padding: 0 }}>←</button>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#eeeeff', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{video.title}</h1>
        </div>

        <div style={{ borderRadius: 20, overflow: 'hidden', background: '#000', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {video.video_url ? (
            <video src={video.video_url} controls style={{ width: '100%', maxHeight: 280, display: 'block' }}
              poster={video.thumbnail_url ?? undefined} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570', fontSize: 14 }}>
              영상 준비 중...
            </div>
          )}
        </div>

        <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {categoryLabel[video.category] ?? video.category}
            </span>
            <span style={{ fontSize: 12, color: '#555570' }}>조회 {video.view_count}회</span>
            <span style={{ fontSize: 12, color: video.status === 'active' ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
              {video.status === 'active' ? '● 공개' : '● 검토중'}
            </span>
          </div>
          {video.description && <p style={{ fontSize: 14, color: '#8888aa', lineHeight: 1.6, marginBottom: 12 }}>{video.description}</p>}
          {video.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {video.tags.map(t => (
                <span key={t} style={{ fontSize: 12, background: 'rgba(139,92,246,0.12)', color: '#a78bfa', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button onClick={toggleLike}
            style={{
              background: liked ? 'rgba(244,63,94,0.12)' : '#111118',
              border: liked ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            }}>
            <span style={{ fontSize: 28 }}>{liked ? '❤️' : '🤍'}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: liked ? '#f43f5e' : '#eeeeff' }}>{likeCount}</div>
              <div style={{ fontSize: 12, color: liked ? '#f43f5e' : '#555570', fontWeight: 600 }}>좋아요</div>
            </div>
          </button>
          <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 20, padding: 20, border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>⭐</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#818cf8' }}>{bookmarkCount}</div>
              <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>기획사 관심</div>
            </div>
          </div>
        </div>

        {isOwner && (
          <button onClick={handleDelete}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontWeight: 700, fontSize: 15 }}>
            영상 삭제
          </button>
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

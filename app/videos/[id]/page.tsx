'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { Home, Compass, Plus, Bell, Megaphone, Heart, Bookmark } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

type Video = {
  id: string; title: string; description: string | null; video_url: string | null
  thumbnail_url: string | null; view_count: number; like_count: number; status: string
  category: string; tags: string[]; created_at: string; talent_id: string
  visibility: 'public' | 'agency_only' | 'private'
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang)

  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} /> },
  ]

  const categoryLabel: Record<string, string> = {
    vocal: tx.videos.vocal, dance: tx.videos.dance, acting: tx.videos.acting,
    rap: tx.videos.rap, other: tx.videos.other,
  }

  const [video, setVideo] = useState<Video | null>(null)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [myId, setMyId] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'agency_only' | 'private'>('public')
  const [savingVisibility, setSavingVisibility] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      const { data: v } = await supabase.from('videos').select('*').eq('id', id).single()
      if (!v) { router.push('/videos'); return }
      setVideo(v)
      setLikeCount(v.like_count ?? 0)
      setVisibility(v.visibility ?? 'public')
      if (user) {
        setMyId(user.id)
        setIsOwner(user.id === v.talent_id)
        const { data: lk } = await supabase.from('likes').select('id').eq('video_id', id).eq('user_id', user.id).maybeSingle()
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

  async function handleVisibilityChange(v: 'public' | 'agency_only' | 'private') {
    if (v === visibility || savingVisibility) return
    setSavingVisibility(true)
    setVisibility(v)
    await supabase.from('videos').update({ visibility: v }).eq('id', id)
    setSavingVisibility(false)
  }

  async function handleDelete() {
    if (!confirm(tx.videos.deleteConfirm)) return
    await supabase.from('videos').delete().eq('id', id)
    router.push('/videos')
  }

  if (!video) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #0891b2', animation: 'spin 0.8s linear infinite' }} />
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
              {tx.videos.videoLoading}
            </div>
          )}
        </div>

        <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.07)', color: '#aaaacc', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {categoryLabel[video.category] ?? video.category}
            </span>
            <span style={{ fontSize: 12, color: '#555570' }}>{video.view_count} {tx.videos.views}</span>
            <span style={{ fontSize: 12, color: '#555570', fontWeight: 600 }}>
              {video.status === 'active' ? tx.videos.statusActive : tx.videos.statusReview}
            </span>
          </div>
          {video.description && <p style={{ fontSize: 14, color: '#8888aa', lineHeight: 1.6, marginBottom: 12 }}>{video.description}</p>}
          {video.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {video.tags.map(t => (
                <span key={t} style={{ fontSize: 12, background: 'rgba(255,255,255,0.07)', color: '#8888aa', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button onClick={toggleLike}
            style={{
              background: '#111118', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
            }}>
            <Heart size={20} strokeWidth={1.8} color={liked ? '#f43f5e' : '#555570'} fill={liked ? '#f43f5e' : 'none'} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#eeeeff' }}>{likeCount}</div>
              <div style={{ fontSize: 12, color: '#555570', fontWeight: 600 }}>{tx.videos.likes}</div>
            </div>
          </button>
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bookmark size={20} strokeWidth={1.8} color={bookmarkCount > 0 ? '#eeeeff' : '#555570'} fill={bookmarkCount > 0 ? '#eeeeff' : 'none'} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#eeeeff' }}>{bookmarkCount}</div>
              <div style={{ fontSize: 12, color: '#555570', fontWeight: 600 }}>{tx.videos.agencyInterest}</div>
            </div>
          </div>
        </div>

        {isOwner && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#8888aa', fontWeight: 600 }}>{tx.videos.visibilityLabel}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['public', 'agency_only', 'private'] as const).map(v => {
                const labels = { public: tx.videos.visibilityPublic, agency_only: tx.videos.visibilityAgency, private: tx.videos.visibilityPrivate }
                const icons = { public: '🌐', agency_only: '🏢', private: '🔒' }
                const selected = visibility === v
                return (
                  <button key={v} type="button" onClick={() => handleVisibilityChange(v)} disabled={savingVisibility}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 12,
                      border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                      background: selected ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                      color: selected ? 'white' : '#555570', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      opacity: savingVisibility ? 0.6 : 1,
                    }}>
                    <span style={{ fontSize: 16 }}>{icons[v]}</span>
                    <span>{labels[v]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {isOwner && (
          <button onClick={handleDelete}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontWeight: 700, fontSize: 15 }}>
            {tx.videos.deleteVideo}
          </button>
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

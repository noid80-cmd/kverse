'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme } from '@/lib/groupThemes'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'
import NotificationBell from '@/app/components/NotificationBell'
import Avatar from '@/app/components/Avatar'

type Highlight = { key: string; name: string; emoji: string }

type Account = {
  id: string
  username: string
  display_name: string
  bio: string
  group_id: string
  gender: string
  nationality?: string
  is_founder?: boolean
  account_type?: string
  groups: { name: string; name_en: string } | null
  rpm_avatar_url?: string | null
  custom_highlights?: Highlight[]
}

type Video = {
  id: string
  title: string
  category: string
  like_count: number
  view_count: number
  video_url: string
  created_at: string
  is_private: boolean
  account_id: string
  groups: { name: string } | null
  tags?: string[]
}

type Comment = {
  id: string
  content: string
  created_at: string
  accounts: { username: string }
}

const FIXED_CATEGORIES = [
  { key: 'all', symbol: '◉', labelKey: 'feed.catAll' },
  { key: 'vocal', symbol: '♪', labelKey: 'feed.catVocal' },
  { key: 'dance', symbol: '✦', labelKey: 'feed.catDance' },
]

export default function FeedPage() {
  const t = useT()
  const [account, setAccount] = useState<Account | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [customHighlights, setCustomHighlights] = useState<Highlight[]>([])
  const [showAddHighlight, setShowAddHighlight] = useState(false)
  const [newHighlightName, setNewHighlightName] = useState('')
  const [newHighlightEmoji, setNewHighlightEmoji] = useState('')
  const viewedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { window.location.href = '/login'; return }
      setAuthReady(true)
      const { data } = await supabase
        .from('accounts').select('*, groups(name, name_en)').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (!data) { setLoading(false); return }
      setAccount(data)
      if (data.custom_highlights) setCustomHighlights(data.custom_highlights as Highlight[])
      const [, , fcRes, fgRes] = await Promise.all([
        fetchVideos(data.id),
        fetchLikedIds(data.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', data.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', data.id),
      ])
      setFollowerCount((fcRes as any).count || 0)
      setFollowingCount((fgRes as any).count || 0)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('justUploaded')) {
      localStorage.removeItem('justUploaded')
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 4000)
    }
  }, [])

  async function fetchVideos(accId: string) {
    const { data: vids } = await supabase
      .from('videos').select('*, groups(name)')
      .eq('account_id', accId).order('created_at', { ascending: false })
    setVideos(vids || [])
  }

  async function fetchLikedIds(accountId: string) {
    const { data } = await supabase.from('likes').select('video_id').eq('account_id', accountId)
    if (data) setLikedIds(new Set(data.map((r: { video_id: string }) => r.video_id)))
  }

  async function addHighlight() {
    if (!account || !newHighlightName.trim()) return
    const newH: Highlight = {
      key: `h_${Date.now()}`,
      name: newHighlightName.trim(),
      emoji: newHighlightEmoji.trim() || '📌',
    }
    const updated = [...customHighlights, newH]
    setCustomHighlights(updated)
    setShowAddHighlight(false)
    setNewHighlightName('')
    setNewHighlightEmoji('')
    await supabase.from('accounts').update({ custom_highlights: updated }).eq('id', account.id)
  }

  async function deleteHighlight(key: string) {
    if (!account) return
    const updated = customHighlights.filter(h => h.key !== key)
    setCustomHighlights(updated)
    if (activeCategory === key) setActiveCategory('all')
    await supabase.from('accounts').update({ custom_highlights: updated }).eq('id', account.id)
  }

  async function toggleVideoTag(video: Video, highlightKey: string) {
    const currentTags = video.tags || []
    const hasTag = currentTags.includes(highlightKey)
    const newTags = hasTag ? currentTags.filter(t => t !== highlightKey) : [...currentTags, highlightKey]
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, tags: newTags } : v))
    setSelectedVideo(prev => prev?.id === video.id ? { ...prev, tags: newTags } : prev)
    await supabase.from('videos').update({ tags: newTags }).eq('id', video.id)
  }

  async function deleteVideo(video: Video) {
    setDeleteTarget(null)
    setSelectedVideo(null)
    const match = video.video_url.match(/\/videos\/(.+)$/)
    if (match) await supabase.storage.from('videos').remove([decodeURIComponent(match[1])])
    await supabase.from('videos').delete().eq('id', video.id)
    setVideos(prev => prev.filter(v => v.id !== video.id))
  }

  async function fetchComments(videoId: string) {
    setCommentLoading(true)
    const { data } = await supabase.from('video_comments').select('*, accounts(username)')
      .eq('video_id', videoId).order('created_at', { ascending: true })
    setComments(data || [])
    setCommentLoading(false)
  }

  async function submitComment() {
    if (!account || !commentVideoId || !commentText.trim()) return
    const { data, error } = await supabase.from('video_comments')
      .insert({ video_id: commentVideoId, account_id: account.id, content: commentText.trim() })
      .select('*, accounts(username)').single()
    if (!error && data) { setComments(prev => [...prev, data]); setCommentText('') }
  }

  async function deleteComment(commentId: string) {
    await supabase.from('video_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  async function shareVideo(video: Video) {
    const groupName = video.groups?.name || account?.groups?.name || ''
    const url = `https://kverse-nine.vercel.app/universe/${encodeURIComponent(groupName)}?video=${video.id}`
    if (navigator.share) {
      await navigator.share({ title: video.title, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    }
  }

  async function toggleLike(video: Video) {
    if (!account) return
    const liked = likedIds.has(video.id)
    setLikedIds(prev => { const next = new Set(prev); liked ? next.delete(video.id) : next.add(video.id); return next })
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, like_count: v.like_count + (liked ? -1 : 1) } : v))
    setSelectedVideo(prev => prev?.id === video.id ? { ...prev, like_count: prev.like_count + (liked ? -1 : 1) } : prev)
    if (liked) {
      await supabase.from('likes').delete().eq('account_id', account.id).eq('video_id', video.id)
      await supabase.from('videos').update({ like_count: video.like_count - 1 }).eq('id', video.id)
    } else {
      await supabase.from('likes').insert({ account_id: account.id, video_id: video.id })
      await supabase.from('videos').update({ like_count: video.like_count + 1 }).eq('id', video.id)
    }
  }

  async function handleVideoPlay(videoId: string, currentCount: number) {
    if (viewedIds.current.has(videoId)) return
    viewedIds.current.add(videoId)
    await supabase.from('videos').update({ view_count: currentCount + 1 }).eq('id', videoId)
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, view_count: v.view_count + 1 } : v))
  }

  const theme = account?.groups ? getTheme(account.groups.name) : null
  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary
  const totalLikes = videos.reduce((sum, v) => sum + v.like_count, 0)

  const filteredVideos = activeCategory === 'all' ? videos
    : activeCategory === 'vocal' || activeCategory === 'dance'
      ? videos.filter(v => v.category === activeCategory)
      : videos.filter(v => (v.tags || []).includes(activeCategory))

  const confettiItems = showCelebration
    ? Array.from({ length: 18 }, (_, i) => ({
        left: `${5 + (i * 5.5) % 92}%`,
        color: ['#ff3278', '#7c3aed', '#fbbf24', '#34d399', '#60a5fa', '#f472b6'][i % 6],
        delay: `${(i * 0.12).toFixed(2)}s`,
        size: `${10 + (i % 4) * 4}px`,
        dur: `${0.9 + (i % 3) * 0.3}s`,
      }))
    : []

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-pink-400 text-xl font-medium animate-pulse">{t('common.loadingUniverse')}</div>
    </div>
  )

  if (!authReady) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black">

      {/* 컨페티 */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          {confettiItems.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', top: '-20px', left: c.left,
              width: c.size, height: c.size,
              background: c.color, borderRadius: i % 3 === 0 ? '50%' : '2px',
              animation: `confettiFall ${c.dur} ease-in ${c.delay} forwards`,
            }} />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ animation: 'celebrationPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
              className="bg-zinc-900/95 border border-white/20 rounded-3xl px-8 py-6 text-center backdrop-blur">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-white font-black text-lg">{t('feed.uploadSuccess')}</p>
              <p className="text-white/40 text-sm mt-1">{t('feed.uploadSuccessDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 grid grid-cols-3 items-center">
        <Link href="/" className="text-white/40 hover:text-white transition text-sm">{t('nav.backBtn')}</Link>
        <div className="flex justify-center"><Link href="/"><KverseLogo /></Link></div>
        <div className="flex items-center gap-2 justify-end">
          {account && <NotificationBell accountId={account.id} groupGradient={theme?.gradient} />}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto">

        {/* 프로필 헤더 */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-5 mb-4">
            <div className="flex-shrink-0 rounded-2xl overflow-hidden"
              style={{ padding: 3, background: `linear-gradient(135deg, ${accentColor || '#E91E8C'}, ${accentColor || '#7B2FBE'}55)` }}>
              <div style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                <Avatar
                  gender={(account?.gender as 'male' | 'female') || 'female'}
                  groupColor={accentColor || '#E91E8C'}
                  size={96}
                  rpmAvatarUrl={account?.rpm_avatar_url}
                  username={account?.username}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-white font-black text-lg">@{account?.username}</span>
                {account?.is_founder && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                    ✦ FOUNDER
                  </span>
                )}
              </div>
              <div className="flex gap-5">
                <div className="text-center">
                  <p className="text-white font-bold text-base leading-tight">{videos.length}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t('prof.coverVideos')}</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-base leading-tight" style={{ color: accentColor }}>{totalLikes}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t('prof.totalLikes')}</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-base leading-tight">{followerCount}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t('prof.followers')}</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-base leading-tight">{followingCount}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t('prof.following')}</p>
                </div>
              </div>
            </div>
          </div>
          {account?.bio && <p className="text-white/60 text-sm leading-relaxed mb-3">{account.bio}</p>}
          <Link href="/profile"
            className="block w-full text-center py-2 rounded-xl border border-white/15 text-white/60 text-sm font-medium hover:bg-white/5 transition">
            {t('feed.editProfile')}
          </Link>
        </div>

        {/* 하이라이트 */}
        <div className="border-t border-white/5 px-5 py-4 flex gap-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {/* 고정 카테고리 */}
          {FIXED_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.key
            const count = cat.key === 'all' ? videos.length : videos.filter(v => v.category === cat.key).length
            return (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl transition"
                  style={isActive
                    ? { background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', boxShadow: `0 0 0 2px #000, 0 0 0 4px ${accentColor || '#E91E8C'}` }
                    : { background: 'rgba(255,255,255,0.06)', boxShadow: '0 0 0 2px #000, 0 0 0 4px rgba(255,255,255,0.12)' }
                  }>
                  <span className="text-xl font-black">{cat.symbol}</span>
                </div>
                <span className="text-xs text-white/50">{t(cat.labelKey)}</span>
                <span className="text-[10px] text-white/25">{count}</span>
              </button>
            )
          })}

          {/* 커스텀 하이라이트 */}
          {customHighlights.map(h => {
            const isActive = activeCategory === h.key
            const count = videos.filter(v => (v.tags || []).includes(h.key)).length
            return (
              <div key={h.key} className="flex flex-col items-center gap-1.5 flex-shrink-0 relative">
                <button onClick={() => setActiveCategory(h.key)}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl transition"
                  style={isActive
                    ? { background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', boxShadow: `0 0 0 2px #000, 0 0 0 4px ${accentColor || '#E91E8C'}` }
                    : { background: 'rgba(255,255,255,0.06)', boxShadow: '0 0 0 2px #000, 0 0 0 4px rgba(255,255,255,0.12)' }
                  }>
                  {h.emoji}
                </button>
                <span className="text-xs text-white/50 max-w-[64px] truncate text-center">{h.name}</span>
                <span className="text-[10px] text-white/25">{count}</span>
                <button onClick={() => deleteHighlight(h.key)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white/40 hover:text-red-400 transition"
                  style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  ×
                </button>
              </div>
            )
          })}

          {/* + 추가 버튼 */}
          <button onClick={() => setShowAddHighlight(true)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl text-white/30 transition hover:text-white/60"
              style={{ border: '2px dashed rgba(255,255,255,0.15)' }}>
              +
            </div>
            <span className="text-xs text-white/25">{t('feed.addHighlight')}</span>
          </button>
        </div>

        {/* 그리드 */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-20 px-6 border-t border-white/5">
            <p className="text-white/40 text-sm mb-6">{t('feed.beFirst')}</p>
            <Link href="/upload" className="px-8 py-3 text-white font-medium rounded-full transition"
              style={{ background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }}>
              {t('feed.uploadFirst')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/5">
            {filteredVideos.map(video => (
              <button key={video.id} onClick={() => setSelectedVideo(video)}
                className="relative bg-zinc-950 overflow-hidden" style={{ aspectRatio: '1' }}>
                <video
                  src={video.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata" muted playsInline
                  onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 0.1 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-1.5 left-2 text-xs">{video.category === 'vocal' ? '🎤' : '💃'}</div>
                <div className="absolute bottom-1.5 right-2">
                  <span className="text-white text-[10px] font-bold drop-shadow-sm">♥ {video.like_count}</span>
                </div>
                {video.is_private && <div className="absolute top-1.5 right-1.5 text-xs">🔒</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 영상 모달 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)' }} onClick={() => setSelectedVideo(null)}>
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            style={{ background: '#111', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{selectedVideo.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: accentColor }}>
                    {selectedVideo.category === 'vocal' ? `🎤 ${t('common.vocal')}` : `💃 ${t('common.dance')}`}
                  </span>
                  {selectedVideo.is_private && <span className="text-white/30 text-xs">🔒</span>}
                </div>
              </div>
              <button onClick={() => setSelectedVideo(null)} className="text-white/30 text-2xl leading-none flex-shrink-0">×</button>
            </div>
            <video src={selectedVideo.video_url} className="w-full bg-black flex-shrink-0"
              style={{ maxHeight: '50vh' }} controls playsInline autoPlay
              onPlay={() => handleVideoPlay(selectedVideo.id, selectedVideo.view_count)} />

            {/* 하이라이트 태그 */}
            {customHighlights.length > 0 && (
              <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2 border-t border-white/5 flex-shrink-0">
                <p className="text-white/25 text-xs w-full">{t('feed.addToHighlight')}</p>
                {customHighlights.map(h => {
                  const hasTag = (selectedVideo.tags || []).includes(h.key)
                  return (
                    <button key={h.key} onClick={() => toggleVideoTag(selectedVideo, h.key)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition border"
                      style={hasTag
                        ? { background: `${accentColor}20`, borderColor: accentColor, color: accentColor }
                        : { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }
                      }>
                      {h.emoji} {h.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="px-4 py-3 flex items-center justify-between border-t border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3 text-white/35 text-xs">
                <span>👁 {selectedVideo.view_count}</span>
                <span>♥ {selectedVideo.like_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => shareVideo(selectedVideo)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>📤</button>
                <button onClick={() => { setCommentVideoId(selectedVideo.id); fetchComments(selectedVideo.id) }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>🗨️</button>
                <button onClick={() => toggleLike(selectedVideo)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition"
                  style={likedIds.has(selectedVideo.id)
                    ? { background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', color: 'white' }
                    : { background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35` }
                  }>♥ {selectedVideo.like_count}</button>
                <button onClick={() => setDeleteTarget(selectedVideo)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>🗑</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 하이라이트 추가 모달 */}
      {showAddHighlight && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowAddHighlight(false)}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 flex flex-col gap-4"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-base">{t('feed.newHighlight')}</h3>
            <div className="flex gap-3">
              <input
                value={newHighlightEmoji}
                onChange={e => setNewHighlightEmoji(e.target.value)}
                placeholder="📌"
                maxLength={2}
                className="w-16 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-center text-xl focus:outline-none focus:border-pink-500 transition"
              />
              <input
                value={newHighlightName}
                onChange={e => setNewHighlightName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addHighlight() }}
                placeholder={t('feed.highlightNamePlaceholder')}
                maxLength={20}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500 transition"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddHighlight(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-medium">
                {t('feed.cancelBtn')}
              </button>
              <button onClick={addHighlight} disabled={!newHighlightName.trim()}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition"
                style={{ background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }}>
                {t('feed.addBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 링크 복사 토스트 */}
      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white text-sm font-medium"
          style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {t('feed.linkCopied')}
        </div>
      )}

      {/* 댓글 바텀 시트 */}
      {commentVideoId && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setCommentVideoId(null)}>
          <div className="w-full max-w-2xl rounded-t-3xl flex flex-col"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <span className="text-white font-semibold">{t('feed.comments')}</span>
              <button onClick={() => setCommentVideoId(null)} className="text-white/30 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 min-h-0">
              {commentLoading ? (
                <div className="text-white/30 text-sm text-center py-8">{t('common.loading')}</div>
              ) : comments.length === 0 ? (
                <div className="text-white/20 text-sm text-center py-8">{t('feed.noComments')}</div>
              ) : comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                    style={{ background: theme?.gradient }}>
                    {comment.accounts.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-xs font-semibold">@{comment.accounts.username}</span>
                    <p className="text-white/70 text-sm mt-0.5 leading-relaxed">{comment.content}</p>
                  </div>
                  {comment.accounts.username === account?.username && (
                    <button onClick={() => deleteComment(comment.id)}
                      className="text-white/20 hover:text-red-400 text-xs flex-shrink-0 transition">🗑</button>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-4 border-t border-white/5 flex gap-3 flex-shrink-0">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                placeholder={t('feed.commentPlaceholder')} maxLength={200}
                className="flex-1 bg-white/5 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none border border-white/10" />
              <button onClick={submitComment} disabled={!commentText.trim()}
                className="px-4 py-2 rounded-full text-white text-sm font-medium disabled:opacity-30 transition"
                style={{ background: theme?.gradient }}>
                {t('feed.postBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 업로드 FAB */}
      <Link href="/upload"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition hover:scale-110"
        style={{ background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', boxShadow: '0 4px 20px rgba(233,30,140,0.4)' }}>
        ✚
      </Link>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-3">🗑</div>
              <p className="text-white font-semibold">{t('feed.deleteConfirm')}</p>
              <p className="text-white/40 text-sm mt-1">{t('feed.deleteConfirmDesc')}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-medium">
                {t('feed.cancelBtn')}
              </button>
              <button onClick={() => deleteVideo(deleteTarget)}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {t('feed.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

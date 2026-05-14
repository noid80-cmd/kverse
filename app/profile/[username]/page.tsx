'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, groupDisplayName } from '@/lib/groupThemes'
import Avatar from '@/app/components/Avatar'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'
import { getFlagImageUrl } from '@/lib/countries'

type Highlight = { key: string; name: string; emoji: string }

type Account = {
  id: string
  username: string
  display_name: string
  bio: string
  gender: string
  nationality?: string
  is_founder?: boolean
  account_type?: string
  agency_name?: string | null
  is_scout_verified?: boolean
  rpm_avatar_url?: string | null
  custom_highlights?: Highlight[]
  groups: { name: string; name_en: string } | null
}

type Video = {
  id: string
  title: string
  category: string
  like_count: number
  view_count: number
  video_url: string
  created_at: string
  tags?: string[]
}

type Comment = {
  id: string
  content: string
  created_at: string
  accounts: { username: string }
}

type FollowAccount = {
  id: string
  username: string
  groups: { name: string } | null
}

const FIXED_CATEGORIES = [
  { key: 'all', symbol: '◉', labelKey: 'feed.catAll' },
  { key: 'vocal', symbol: '♪', labelKey: 'feed.catVocal' },
  { key: 'dance', symbol: '✦', labelKey: 'feed.catDance' },
]

export default function UserKversePage() {
  const params = useParams()
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const username = params.username as string

  const [profile, setProfile] = useState<Account | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwn, setIsOwn] = useState(false)
  const [myAccountId, setMyAccountId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [showFollowList, setShowFollowList] = useState<null | 'followers' | 'following'>(null)
  const [followList, setFollowList] = useState<FollowAccount[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()

      const { data: acc } = await supabase
        .from('accounts')
        .select('*, groups(name, name_en)')
        .eq('username', username)
        .single()

      if (!acc) { router.push('/'); return }
      setProfile(acc)

      const { data: vids } = await supabase
        .from('videos')
        .select('id, title, category, like_count, view_count, video_url, created_at, tags')
        .eq('account_id', acc.id)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
      setVideos(vids || [])

      const [{ count: fc }, { count: fg }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', acc.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', acc.id),
      ])
      setFollowerCount(fc || 0)
      setFollowingCount(fg || 0)

      if (user) {
        const { data: myAccounts } = await supabase
          .from('accounts').select('id, username').eq('user_id', user.id)
        if (myAccounts && myAccounts.length > 0) {
          const ownAcc = myAccounts.find((a: { id: string; username: string }) => a.username === username)
          if (ownAcc) {
            setIsOwn(true)
            setMyAccountId(ownAcc.id)
          } else {
            setMyAccountId(myAccounts[0].id)
            setMyUsername(myAccounts[0].username)
            const { data: followRow } = await supabase
              .from('follows').select('id')
              .eq('follower_id', myAccounts[0].id).eq('following_id', acc.id).maybeSingle()
            setIsFollowing(!!followRow)
            const { data: liked } = await supabase
              .from('likes').select('video_id').eq('account_id', myAccounts[0].id)
            if (liked) setLikedIds(new Set(liked.map((r: { video_id: string }) => r.video_id)))
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [username])

  async function fetchFollowList(type: 'followers' | 'following') {
    if (!profile) return
    setShowFollowList(type)
    setFollowListLoading(true)
    setFollowList([])
    if (type === 'followers') {
      const { data: rows } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id)
      const ids = (rows || []).map((r: { follower_id: string }) => r.follower_id)
      if (ids.length > 0) {
        const { data: accs } = await supabase.from('accounts').select('id, username, groups(name)').in('id', ids)
        setFollowList(accs || [])
      }
    } else {
      const { data: rows } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
      const ids = (rows || []).map((r: { following_id: string }) => r.following_id)
      if (ids.length > 0) {
        const { data: accs } = await supabase.from('accounts').select('id, username, groups(name)').in('id', ids)
        setFollowList(accs || [])
      }
    }
    setFollowListLoading(false)
  }

  async function toggleFollow() {
    if (!myAccountId || !profile) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myAccountId).eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: myAccountId, following_id: profile.id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
      if (myUsername) {
        await supabase.from('notifications').insert({
          account_id: profile.id, type: 'follow',
          from_username: myUsername,
        })
      }
    }
    setFollowLoading(false)
  }

  async function fetchComments(videoId: string) {
    setCommentLoading(true)
    const { data } = await supabase.from('video_comments').select('*, accounts(username)')
      .eq('video_id', videoId).order('created_at', { ascending: true })
    setComments(data || [])
    setCommentLoading(false)
  }

  async function submitComment() {
    if (!myAccountId || !commentVideoId || !commentText.trim()) return
    const { data, error } = await supabase.from('video_comments')
      .insert({ video_id: commentVideoId, account_id: myAccountId, content: commentText.trim() })
      .select('*, accounts(username)').single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setCommentText('')
      if (!isOwn && profile && myUsername) {
        const targetVideo = videos.find(v => v.id === commentVideoId)
        await supabase.from('notifications').insert({
          account_id: profile.id, type: 'comment',
          from_username: myUsername, video_id: commentVideoId,
          video_title: targetVideo?.title || '',
        })
      }
    }
  }

  async function toggleLike(video: Video) {
    if (!myAccountId) return
    const liked = likedIds.has(video.id)
    setLikedIds(prev => { const next = new Set(prev); liked ? next.delete(video.id) : next.add(video.id); return next })
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, like_count: v.like_count + (liked ? -1 : 1) } : v))
    setSelectedVideo(prev => prev?.id === video.id ? { ...prev, like_count: prev.like_count + (liked ? -1 : 1) } : prev)
    if (liked) {
      await supabase.from('likes').delete().eq('account_id', myAccountId).eq('video_id', video.id)
      await supabase.from('videos').update({ like_count: video.like_count - 1 }).eq('id', video.id)
    } else {
      await supabase.from('likes').insert({ account_id: myAccountId, video_id: video.id })
      await supabase.from('videos').update({ like_count: video.like_count + 1 }).eq('id', video.id)
      if (profile && !isOwn) {
        await supabase.from('notifications').insert({
          account_id: profile.id, type: 'like',
          from_username: username, video_id: video.id,
          video_title: video.title,
        })
      }
    }
  }

  async function shareVideo(video: Video) {
    const url = `${window.location.origin}/profile/${username}`
    if (navigator.share) {
      await navigator.share({ title: video.title, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-pink-400 text-xl font-medium animate-pulse">{t('common.loadingUniverse')}</div>
    </div>
  )

  if (!profile) return null

  const theme = profile.groups ? getTheme(profile.groups.name) : null
  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary
  const totalLikes = videos.reduce((sum, v) => sum + v.like_count, 0)
  const customHighlights = (profile.custom_highlights || []) as Highlight[]

  const filteredVideos = activeCategory === 'all' ? videos
    : activeCategory === 'vocal' || activeCategory === 'dance'
      ? videos.filter(v => v.category === activeCategory)
      : videos.filter(v => (v.tags || []).includes(activeCategory))

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white transition text-sm">← {t('nav.back')}</button>
        <Link href="/"><KverseLogo /></Link>
        <div />
      </nav>

      <div className="max-w-2xl mx-auto">

        {/* 헤더 */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-5 mb-4">
            <div className="flex-shrink-0 rounded-2xl overflow-hidden"
              style={{ padding: 3, background: `linear-gradient(135deg, ${accentColor || '#E91E8C'}, ${accentColor || '#7B2FBE'}55)` }}>
              <div style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden' }}>
                <Avatar
                  gender={(profile.gender as 'male' | 'female') || 'female'}
                  groupColor={accentColor || '#E91E8C'}
                  size={96}
                  rpmAvatarUrl={profile.rpm_avatar_url}
                  username={profile.username}
                />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-white font-black text-lg">@{profile.username}</span>
                {profile.nationality && (
                  <img src={getFlagImageUrl(profile.nationality, 20)} alt={profile.nationality} className="w-5 h-3.5 rounded-sm object-cover" />
                )}
                {profile.is_founder && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                    ✦ FOUNDER
                  </span>
                )}
                {profile.account_type === 'scout' && profile.is_scout_verified && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)', color: '#FBBF24' }}>
                    🎯 {profile.agency_name}
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
                <button className="text-center" onClick={() => fetchFollowList('followers')}>
                  <p className="text-white font-bold text-base leading-tight">{followerCount}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t('prof.followers')}</p>
                </button>
                <button className="text-center" onClick={() => fetchFollowList('following')}>
                  <p className="text-white font-bold text-base leading-tight">{followingCount}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t('prof.following')}</p>
                </button>
              </div>
            </div>
          </div>

          {profile.bio && <p className="text-white/60 text-sm leading-relaxed mb-3">{profile.bio}</p>}

          {/* 액션 버튼 */}
          {isOwn ? (
            <Link href="/profile"
              className="block w-full text-center py-2 rounded-xl border border-white/15 text-white/60 text-sm font-medium hover:bg-white/5 transition">
              {t('feed.editProfile')}
            </Link>
          ) : (
            <div className="flex gap-2">
              <button onClick={toggleFollow} disabled={followLoading || !myAccountId}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-50"
                style={isFollowing
                  ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }
                }>
                {isFollowing ? t('prof.unfollow') : t('prof.follow')}
              </button>
              <Link href={`/dm?to=${profile.username}`}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-medium border border-white/15 hover:bg-white/5 transition">
                💬
              </Link>
            </div>
          )}
        </div>

        {/* 하이라이트 */}
        <div className="border-t border-white/5 px-5 py-4 flex gap-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FIXED_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.key
            const count = cat.key === 'all' ? videos.length : videos.filter(v => v.category === cat.key).length
            return (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-16 h-16 rounded-full flex items-center justify-center transition"
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
          {customHighlights.map(h => {
            const isActive = activeCategory === h.key
            const count = videos.filter(v => (v.tags || []).includes(h.key)).length
            return (
              <button key={h.key} onClick={() => setActiveCategory(h.key)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl transition"
                  style={isActive
                    ? { background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', boxShadow: `0 0 0 2px #000, 0 0 0 4px ${accentColor || '#E91E8C'}` }
                    : { background: 'rgba(255,255,255,0.06)', boxShadow: '0 0 0 2px #000, 0 0 0 4px rgba(255,255,255,0.12)' }
                  }>
                  {h.emoji}
                </div>
                <span className="text-xs text-white/50 max-w-[64px] truncate text-center">{h.name}</span>
                <span className="text-[10px] text-white/25">{count}</span>
              </button>
            )
          })}
        </div>

        {/* 그리드 */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-20 px-6 border-t border-white/5">
            <p className="text-white/30 text-sm">{t('prof.noVideos')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/5">
            {filteredVideos.map(video => (
              <button key={video.id} onClick={() => setSelectedVideo(video)}
                className="relative bg-zinc-950 overflow-hidden" style={{ aspectRatio: '1' }}>
                <video src={video.video_url} className="w-full h-full object-cover"
                  preload="metadata" muted playsInline
                  onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 0.1 }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-1.5 left-2 text-xs">{video.category === 'vocal' ? '🎤' : '💃'}</div>
                <div className="absolute bottom-1.5 right-2">
                  <span className="text-white text-[10px] font-bold drop-shadow-sm">♥ {video.like_count}</span>
                </div>
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
                <span className="text-xs" style={{ color: accentColor }}>
                  {selectedVideo.category === 'vocal' ? `🎤 ${t('common.vocal')}` : `💃 ${t('common.dance')}`}
                </span>
              </div>
              <button onClick={() => setSelectedVideo(null)} className="text-white/30 text-2xl leading-none flex-shrink-0">×</button>
            </div>
            <video src={selectedVideo.video_url} className="w-full bg-black flex-shrink-0"
              style={{ maxHeight: '55vh' }} controls playsInline autoPlay />
            <div className="px-4 py-3 flex items-center justify-between border-t border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3 text-white/35 text-xs">
                <span>👁 {selectedVideo.view_count}</span>
                <span>♥ {selectedVideo.like_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => shareVideo(selectedVideo)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>📤</button>
                {myAccountId && (
                  <button onClick={() => { setCommentVideoId(selectedVideo.id); fetchComments(selectedVideo.id) }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>🗨️</button>
                )}
                {myAccountId && (
                  <button onClick={() => toggleLike(selectedVideo)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition"
                    style={likedIds.has(selectedVideo.id)
                      ? { background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', color: 'white' }
                      : { background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35` }
                    }>♥ {selectedVideo.like_count}</button>
                )}
              </div>
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

      {/* 팔로워/팔로잉 바텀 시트 */}
      {showFollowList && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowFollowList(null)}>
          <div className="w-full max-w-2xl rounded-t-3xl flex flex-col"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <span className="text-white font-semibold">
                {showFollowList === 'followers' ? t('prof.followers') : t('prof.following')}
              </span>
              <button onClick={() => setShowFollowList(null)} className="text-white/30 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1 min-h-0">
              {followListLoading ? (
                <div className="text-white/30 text-sm text-center py-10">{t('common.loading')}</div>
              ) : followList.length === 0 ? (
                <div className="text-white/20 text-sm text-center py-10">—</div>
              ) : followList.map(acc => (
                <Link key={acc.id} href={`/profile/${acc.username}`} onClick={() => setShowFollowList(null)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: accentColor ? `${accentColor}33` : 'rgba(233,30,140,0.2)', border: `1px solid ${accentColor || '#E91E8C'}40` }}>
                    {acc.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">@{acc.username}</p>
                    {acc.groups?.name && <p className="text-white/35 text-xs truncate">{acc.groups.name}</p>}
                  </div>
                  <span className="text-white/20 text-xs">›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 댓글 바텀 시트 */}
      {commentVideoId && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"
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
                </div>
              ))}
            </div>
            {myAccountId && (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

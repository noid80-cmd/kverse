'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName, GROUP_THEMES } from '@/lib/groupThemes'
import { getActiveAccountId, setActiveAccountId } from '@/lib/activeAccount'
import Avatar from '@/app/components/Avatar'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import { getFlagImageUrl } from '@/lib/countries'
import KverseLogo from '@/app/components/KverseLogo'
import NotificationBell from '@/app/components/NotificationBell'

type Account = {
  id: string
  username: string
  group_id: string
  gender: string
  nationality?: string
  is_founder?: boolean
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
  is_live: boolean
  is_private: boolean
  account_id: string
  accounts: { username: string }
  groups: { name: string }
}

type Comment = {
  id: string
  content: string
  created_at: string
  accounts: { username: string }
}

type Group = { id: string; name: string; name_en: string }

export default function FeedPage() {
  const t = useT()
  const { locale } = useLanguage()
  const [account, setAccount] = useState<Account | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [videosLoading, setVideosLoading] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [isPlus, setIsPlus] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)
  const [reportTarget, setReportTarget] = useState<Video | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDone, setReportDone] = useState(false)
  const [trendingVideo, setTrendingVideo] = useState<Video | null>(null)
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [likeAnimating, setLikeAnimating] = useState<Set<string>>(new Set())
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [newVideoNotif, setNewVideoNotif] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [feedTab, setFeedTab] = useState<'all' | 'popular' | 'following'>('all')
  const [followingVideos, setFollowingVideos] = useState<Video[]>([])
  const [followingLoading, setFollowingLoading] = useState(false)
  const [suggestedAccounts, setSuggestedAccounts] = useState<{ id: string; username: string; groups: { name: string } | null }[]>([])
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const viewedIds = useRef<Set<string>>(new Set())
  const swipeStartX = useRef<number | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { window.location.href = '/login'; return }
      setAuthReady(true)

      const { data } = await supabase
        .from('accounts').select('*, groups(name, name_en)').eq('user_id', user.id).limit(1).maybeSingle()

      if (!data) { setAuthReady(true); setLoading(false); return }
      setAccount(data)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('is_plus, plus_expires_at')
        .eq('user_id', user.id)
        .single()
      if (sub?.is_plus && sub.plus_expires_at && new Date(sub.plus_expires_at) > new Date()) {
        setIsPlus(true)
      }

      const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const [, trendingRes, groupsRes] = await Promise.all([
        fetchLikedIds(data.id),
        supabase.from('videos').select('*, accounts(username), groups(name)')
          .eq('is_private', false)
          .gte('created_at', oneWeekAgo.toISOString())
          .order('like_count', { ascending: false })
          .limit(1).single(),
        supabase.from('groups').select('id, name, name_en').order('name'),
      ])
      if (trendingRes.data) setTrendingVideo(trendingRes.data)
      if (groupsRes.data) setAllGroups(groupsRes.data)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!account) return
    if (feedTab === 'following') {
      fetchFollowingVideos(account.id)
    } else {
      fetchVideos(feedTab, account.id)
    }
  }, [feedTab, account])

  // 다른 페이지에서 돌아올 때 자동 새로고침
  useEffect(() => {
    if (!account) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && feedTab !== 'following') {
        fetchVideos(feedTab, account.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [account, feedTab])

  // 업로드 직후 축하 효과
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('justUploaded')) {
      localStorage.removeItem('justUploaded')
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 4000)
    }
  }, [])

  // 실시간 새 영상 알림
  useEffect(() => {
    if (!account) return
    const channel = supabase
      .channel('new-videos')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'videos',
        filter: `account_id=neq.${account.id}`,
      }, payload => {
        if ((payload.new as { account_id: string }).account_id !== account.id) {
          setNewVideoNotif(true)
          setTimeout(() => setNewVideoNotif(false), 5000)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [account])

  // 전체화면 진입 시 가로 전환, 종료 시 복귀
  useEffect(() => {
    function onFullscreen() {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      if (isFs) {
        try { (screen.orientation as any)?.lock('landscape').catch(() => {}) } catch {}
      } else {
        try { screen.orientation?.unlock() } catch {}
      }
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    document.addEventListener('webkitfullscreenchange', onFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen)
      document.removeEventListener('webkitfullscreenchange', onFullscreen)
    }
  }, [])

  // 화면에 들어온 영상 자동 재생
  useEffect(() => {
    if (videos.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.5 }
    )
    Object.values(videoRefs.current).forEach(v => { if (v) observer.observe(v) })
    return () => observer.disconnect()
  }, [videos])

  async function fetchFollowingVideos(accountId: string) {
    setFollowingLoading(true)
    const { data: followRows } = await supabase
      .from('follows').select('following_id').eq('follower_id', accountId)
    const ids = (followRows || []).map((r: { following_id: string }) => r.following_id)
    if (ids.length === 0) {
      setFollowingVideos([])
      const { data: suggested } = await supabase
        .from('accounts')
        .select('id, username, groups(name)')
        .neq('id', accountId)
        .limit(6)
      setSuggestedAccounts((suggested || []).map((a: { id: string; username: string; groups: { name: string } | { name: string }[] | null }) => ({
        ...a,
        groups: Array.isArray(a.groups) ? a.groups[0] ?? null : a.groups,
      })))
      setFollowingLoading(false)
      return
    }
    const { data: vids } = await supabase
      .from('videos')
      .select('*, accounts(username), groups(name)')
      .in('account_id', ids)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(30)
    setFollowingVideos(vids || [])
    setFollowingLoading(false)
  }

  async function fetchVideos(tab: 'all' | 'popular' = 'all', accId?: string) {
    setVideosLoading(true)
    const id = accId ?? account?.id
    const { data: vids } = await supabase
      .from('videos')
      .select('*, accounts(username), groups(name)')
      .or(id ? `is_private.eq.false,account_id.eq.${id}` : 'is_private.eq.false')
      .order(tab === 'popular' ? 'like_count' : 'created_at', { ascending: false })
      .limit(20)
    setVideos((vids || []).filter((v: any) => v.accounts != null))
    setVideosLoading(false)
  }

  async function fetchLikedIds(accountId: string) {
    const { data } = await supabase
      .from('likes')
      .select('video_id')
      .eq('account_id', accountId)
    if (data) setLikedIds(new Set(data.map((r: { video_id: string }) => r.video_id)))
  }

  async function submitReport() {
    if (!reportTarget || !reportReason || !account) return
    await supabase.from('reports').insert({
      video_id: reportTarget.id,
      reporter_account_id: account.id,
      reason: reportReason,
    })
    setReportTarget(null)
    setReportReason('')
    setReportDone(true)
    setTimeout(() => setReportDone(false), 3000)
  }

  async function deleteVideo(video: Video) {
    setDeleteTarget(null)
    const match = video.video_url.match(/\/videos\/(.+)$/)
    if (match) {
      await supabase.storage.from('videos').remove([decodeURIComponent(match[1])])
    }
    await supabase.from('videos').delete().eq('id', video.id)
    setVideos(prev => prev.filter(v => v.id !== video.id))
  }

  async function fetchComments(videoId: string) {
    setCommentLoading(true)
    const { data } = await supabase
      .from('video_comments')
      .select('*, accounts(username)')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setCommentLoading(false)
  }

  async function submitComment() {
    if (!account || !commentVideoId || !commentText.trim()) return
    const { data, error } = await supabase
      .from('video_comments')
      .insert({ video_id: commentVideoId, account_id: account.id, content: commentText.trim() })
      .select('*, accounts(username)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setCommentText('')
      const video = videos.find(v => v.id === commentVideoId)
      if (video && video.account_id !== account.id) {
        await supabase.from('notifications').insert({
          account_id: video.account_id,
          type: 'comment',
          from_username: account.username,
          video_id: video.id,
          video_title: video.title,
          video_group: video.groups?.name,
        })
      }
    }
  }

  async function deleteComment(commentId: string) {
    await supabase.from('video_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  async function shareVideo(video: Video) {
    const groupName = video.groups?.name || account?.groups.name || ''
    const url = `https://kverse-nine.vercel.app/universe/${encodeURIComponent(groupName)}?video=${video.id}`
    const text = `@${video.accounts.username}의 ${groupName} 커버 영상을 Kverse에서 보세요!`
    if (navigator.share) {
      await navigator.share({ title: video.title, text, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    }
  }

  async function toggleLike(video: Video) {
    if (!account) return
    const liked = likedIds.has(video.id)
    if (!liked) {
      setLikeAnimating(prev => new Set([...prev, video.id]))
      setTimeout(() => setLikeAnimating(prev => { const n = new Set(prev); n.delete(video.id); return n }), 900)
    }

    setLikedIds(prev => {
      const next = new Set(prev)
      liked ? next.delete(video.id) : next.add(video.id)
      return next
    })
    setVideos(prev => prev.map(v =>
      v.id === video.id ? { ...v, like_count: v.like_count + (liked ? -1 : 1) } : v
    ))

    if (liked) {
      await supabase.from('likes').delete()
        .eq('account_id', account.id).eq('video_id', video.id)
      await supabase.from('videos').update({ like_count: video.like_count - 1 }).eq('id', video.id)
    } else {
      await supabase.from('likes').insert({ account_id: account.id, video_id: video.id })
      await supabase.from('videos').update({ like_count: video.like_count + 1 }).eq('id', video.id)
      if (video.account_id !== account.id) {
        await supabase.from('notifications').insert({
          account_id: video.account_id,
          type: 'like',
          from_username: account.username,
          video_id: video.id,
          video_title: video.title,
          video_group: video.groups?.name,
        })
      }
    }
  }

  function handleSwipeStart(e: React.TouchEvent) {
    swipeStartX.current = e.touches[0].clientX
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    if (swipeStartX.current === null || allAccounts.length <= 1) return
    const diff = e.changedTouches[0].clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(diff) < 60) return
    const currentIdx = allAccounts.findIndex(a => a.id === account?.id)
    const nextIdx = diff < 0 ? currentIdx + 1 : currentIdx - 1
    if (nextIdx < 0 || nextIdx >= allAccounts.length) return
    const next = allAccounts[nextIdx]
    setActiveAccountId(next.id)
    setAccount(next)
    fetchVideos(next.group_id, feedTab === 'following' ? 'all' : feedTab, next.id)
    fetchLikedIds(next.id)
  }

  async function handleVideoPlay(videoId: string, currentCount: number) {
    if (viewedIds.current.has(videoId)) return
    viewedIds.current.add(videoId)
    await supabase.from('videos').update({ view_count: currentCount + 1 }).eq('id', videoId)
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, view_count: v.view_count + 1 } : v))
    setFollowingVideos(prev => prev.map(v => v.id === videoId ? { ...v, view_count: v.view_count + 1 } : v))
    setTrendingVideo(prev => prev && prev.id === videoId ? { ...prev, view_count: prev.view_count + 1 } : prev)
  }

  const theme = account?.groups ? getTheme(account.groups.name) : null
  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const confettiItems = showCelebration
    ? Array.from({ length: 18 }, (_, i) => ({
        left: `${5 + (i * 5.5) % 92}%`,
        color: ['#ff3278', '#7c3aed', '#fbbf24', '#34d399', '#60a5fa', '#f472b6'][i % 6],
        delay: `${(i * 0.12).toFixed(2)}s`,
        size: `${10 + (i % 4) * 4}px`,
        dur: `${0.9 + (i % 3) * 0.3}s`,
      }))
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">Loading Universe...</div>
      </div>
    )
  }

  if (!authReady) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black">

      {/* 업로드 축하 컨페티 */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          {confettiItems.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', top: '-20px', left: c.left,
              width: c.size, height: c.size,
              background: c.color, borderRadius: i % 3 === 0 ? '50%' : '2px',
              animation: `confettiFall ${c.dur} ease-in ${c.delay} forwards`,
              opacity: 1,
            }} />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ animation: 'celebrationPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
              className="bg-zinc-900/95 border border-white/20 rounded-3xl px-8 py-6 text-center backdrop-blur">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-white font-black text-lg">업로드 완료!</p>
              <p className="text-white/40 text-sm mt-1">커버 영상이 올라갔어요</p>
            </div>
          </div>
        </div>
      )}

      {/* 실시간 새 영상 알림 배너 */}
      {newVideoNotif && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
          style={{ animation: 'newBannerSlide 5s ease-in-out forwards' }}
        >
          <button
            className="pointer-events-auto mt-2 px-5 py-2.5 rounded-full text-white text-sm font-bold flex items-center gap-2 border border-white/20"
            style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(12px)' }}
            onClick={() => { setNewVideoNotif(false); fetchVideos(feedTab === 'following' ? 'all' : feedTab) }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'realtimeDot 1s ease-in-out infinite' }} />
            새 커버 영상이 올라왔어요 · 탭해서 보기
          </button>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/"><KverseLogo /></Link>
        <div className="flex items-center gap-2">
          {account && <NotificationBell accountId={account.id} groupGradient={theme?.gradient} />}
          <Link href="/upload" className="w-9 h-9 border border-white/20 hover:bg-white/10 text-white text-sm rounded-full transition flex items-center justify-center flex-shrink-0">
            ✚
          </Link>
          <Link href="/profile" className="w-9 h-9 border border-white/20 hover:bg-white/10 text-white text-sm rounded-full transition flex items-center justify-center flex-shrink-0">
            👤
          </Link>
        </div>
      </nav>


      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* 계정 카드 */}
        {account && theme && (
          <>
          <div
            className="rounded-2xl p-5 mb-3 flex items-center gap-4 border relative overflow-hidden select-none"
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
            style={isPlus ? {
              background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(124,58,237,0.12))',
              borderColor: 'rgba(251,191,36,0.5)',
              touchAction: 'pan-y',
            } : {
              background: `${theme.primary}10`,
              borderColor: `${theme.primary}40`,
              touchAction: 'pan-y',
            }}
          >
            {isPlus && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(105deg, rgba(251,191,36,0.07) 0%, transparent 60%)' }} />
            )}
            <Link href="/avatar" className="flex-shrink-0 hover:opacity-80 transition relative z-10">
              <Avatar
                gender={(account.gender as 'male' | 'female') || 'female'}
                groupColor={accentColor}
                size={72}
                username={account.username}
              />
            </Link>
            <div className="relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-semibold">@{account.username}</p>
                <img
                  src={getFlagImageUrl(account.nationality || 'KR', 20)}
                  alt={account.nationality || 'KR'}
                  className="w-6 h-4 rounded-sm object-cover"
                />
                {account.is_founder && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                    ✦ FOUNDER
                  </span>
                )}
                {isPlus && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: 'black' }}>
                    👑 PLUS
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: accentColor }}>
                {account.groups ? `${groupDisplayName(account.groups.name, locale)} · ${worldName(theme!, locale)}` : 'Kverse'}
              </p>
            </div>
          </div>
          {allAccounts.length > 1 && (
            <div className="flex gap-1.5 justify-center mb-4">
              {allAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: acc.id === account.id ? 20 : 6,
                    height: 6,
                    background: acc.id === account.id ? accentColor : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
          )}
          </>
        )}

        {/* 유니버스 빠른 탐색 */}
        {allGroups.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-1 px-1">
            {allGroups.map(group => {
              const grpTheme = GROUP_THEMES[group.name]
              if (!grpTheme) return null
              const isMyGroup = group.name === account?.groups.name
              return (
                <Link
                  key={group.id}
                  href={`/universe/${encodeURIComponent(group.name)}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border whitespace-nowrap"
                  style={isMyGroup ? {
                    background: theme?.gradient, borderColor: 'transparent', color: 'white',
                  } : {
                    background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)',
                  }}
                >
                  {grpTheme.emoji} {groupDisplayName(group.name, locale)}
                </Link>
              )
            })}
          </div>
        )}

        {/* 트렌딩 히어로 */}
        {trendingVideo && (
          <div className="rounded-2xl overflow-hidden border mb-6 relative"
            style={{ borderColor: 'rgba(255,100,150,0.35)', boxShadow: '0 0 32px rgba(255,50,120,0.15)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: 'linear-gradient(to right, rgba(255,50,120,0.2), rgba(124,58,237,0.15))' }}>
              <span className="text-xs font-black px-2.5 py-1 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg,#ff3278,#7c3aed)', animation: 'hotPulse 2s ease-in-out infinite' }}>
                🔥 TRENDING NOW
              </span>
              <span className="text-white/35 text-xs">이번 주 전체 1위</span>
              {trendingVideo.groups && (
                <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  {groupDisplayName(trendingVideo.groups.name, locale)}
                </span>
              )}
            </div>
            <video
              ref={el => { videoRefs.current['trending'] = el }}
              src={trendingVideo.video_url}
              className="w-full block bg-black"
              style={{ maxHeight: '55vh' }}
              playsInline muted loop controls preload="none"
              onPlay={() => handleVideoPlay(trendingVideo.id, trendingVideo.view_count)}
            />
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(to right, rgba(255,50,120,0.1), rgba(124,58,237,0.08))' }}>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">{trendingVideo.title}</p>
                <p className="text-white/40 text-xs mt-0.5">@{trendingVideo.accounts.username} · ♥ {trendingVideo.like_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* 피드 탭 */}
        <div className="flex gap-2 mb-6 justify-center">
          {([
            { key: 'all', label: t('feed.allTab') },
            { key: 'popular', label: '인기' },
            { key: 'following', label: t('feed.followingTab') },
          ] as { key: 'all' | 'popular' | 'following'; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFeedTab(key)}
              className="px-5 py-2 rounded-full text-sm font-bold transition border"
              style={feedTab === key
                ? { background: theme?.gradient, borderColor: 'transparent', color: 'white' }
                : { borderColor: `${accentColor}30`, color: `${accentColor}80` }
              }
            >
              {label}
            </button>
          ))}
          {videosLoading && <span className="text-white/20 text-sm self-center animate-pulse">...</span>}
        </div>

        {/* 팔로잉 피드 */}
        {feedTab === 'following' && (
          followingLoading ? (
            <div className="text-white/30 text-sm text-center py-20 animate-pulse">...</div>
          ) : followingVideos.length === 0 ? (
            <div className="py-10">
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-white/50 text-sm">{t('feed.noFollowingVideos')}</p>
              </div>
              {suggestedAccounts.length > 0 && (
                <div>
                  <p className="text-white/30 text-xs text-center mb-4">{t('feed.followSomeone')}</p>
                  <div className="flex flex-col gap-2">
                    {suggestedAccounts.map(acc => {
                      const accTheme = acc.groups?.name ? GROUP_THEMES[acc.groups.name] : null
                      const accAccent = accTheme?.primary === '#FFFFFF' ? '#C9A96E' : (accTheme?.primary || '#7C3AED')
                      return (
                        <Link
                          key={acc.id}
                          href={`/profile/${acc.username}`}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/8 transition hover:bg-white/5"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                            style={{ background: accTheme?.gradient || theme?.gradient }}>
                            {acc.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold">@{acc.username}</p>
                            <p className="text-xs mt-0.5" style={{ color: accAccent }}>
                              {acc.groups?.name ? groupDisplayName(acc.groups.name, locale) : ''}
                            </p>
                          </div>
                          <span className="text-white/20 text-xs">프로필 →</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {followingVideos.map((video) => (
                <div key={video.id} className="rounded-2xl overflow-hidden border relative"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  <div className="flex items-center gap-3 px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Link href={`/profile/${video.accounts.username}`} className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                        style={{ background: theme?.gradient }}>
                        {video.accounts.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-bold truncate">@{video.accounts.username}</span>
                    </Link>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: `${accentColor}25`, color: accentColor }}>
                      {video.category === 'vocal' ? `🎤 ${t('common.vocal')}` : `💃 ${t('common.dance')}`}
                    </span>
                  </div>
                  <video src={video.video_url} className="w-full block bg-black" style={{ maxHeight: '65vh' }}
                    playsInline muted loop controls preload="none"
                    onPlay={() => handleVideoPlay(video.id, video.view_count)} />
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{video.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white/30 text-xs">👁 {video.view_count}</span>
                        <span className="text-white/15 text-xs">·</span>
                        <span className="text-white/30 text-xs">♥ {video.like_count}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLike(video)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition"
                      style={likedIds.has(video.id)
                        ? { background: theme?.gradient, color: 'white', boxShadow: `0 0 12px ${accentColor}60` }
                        : { background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35` }
                      }
                    >
                      ♥ {video.like_count}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 영상 목록 — 인라인 스크롤 피드 */}
        {feedTab === 'all' && (videos.length === 0 ? (
          <div className="py-10">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{theme?.emoji}</div>
              <p className="text-white/50 mb-5">{t('feed.beFirst')}</p>
              <Link
                href="/upload"
                className="px-8 py-3 text-white font-medium rounded-full transition"
                style={{ background: theme?.gradient }}
              >
                {t('feed.uploadFirst')}
              </Link>
            </div>
            {allGroups.length > 0 && (
              <div>
                <p className="text-white/20 text-xs text-center mb-4">다른 유니버스 둘러보기</p>
                <div className="grid grid-cols-2 gap-2">
                  {allGroups.filter(g => g.name !== account?.groups.name).slice(0, 4).map(group => {
                    const grpTheme = GROUP_THEMES[group.name]
                    if (!grpTheme) return null
                    return (
                      <Link
                        key={group.id}
                        href={`/universe/${encodeURIComponent(group.name)}`}
                        className="rounded-2xl p-4 flex items-center gap-3 border transition hover:opacity-80"
                        style={{ background: `${grpTheme.primary === '#FFFFFF' ? '#C9A96E' : grpTheme.primary}15`, borderColor: `${grpTheme.primary === '#FFFFFF' ? '#C9A96E' : grpTheme.primary}30` }}
                      >
                        <span className="text-2xl">{grpTheme.emoji}</span>
                        <span className="text-white text-sm font-semibold">{groupDisplayName(group.name, locale)}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="rounded-2xl overflow-hidden border relative"
                style={{
                  borderColor: 'rgba(255,255,255,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >

                {/* 헤더 */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <span
                    className="text-sm w-6 text-center flex-shrink-0 font-medium"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    {index + 1}
                  </span>
                  <Link href={`/profile/${video.accounts.username}`} className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{ background: theme?.gradient, boxShadow: `0 0 8px ${accentColor}50` }}>
                      {video.accounts.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-bold truncate">@{video.accounts.username}</span>
                  </Link>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {new Date(video.created_at) > oneHourAgo && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', animation: 'newBadgePulse 1.8s ease-in-out infinite' }}>
                        NEW
                      </span>
                    )}
                    {video.is_live && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {t('feed.liveBadge')}
                      </span>
                    )}
                    {video.is_private && <span className="text-white/30 text-xs">🔒</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${accentColor}25`, color: accentColor }}>
                      {video.category === 'vocal' ? `🎤 ${t('common.vocal')}` : `💃 ${t('common.dance')}`}
                    </span>
                  </div>
                </div>

                {/* 영상 */}
                <video
                  ref={el => { videoRefs.current[video.id] = el }}
                  src={video.video_url}
                  className="w-full block bg-black"
                  style={{ maxHeight: '65vh' }}
                  playsInline muted loop controls preload="none"
                  onPlay={() => handleVideoPlay(video.id, video.view_count)}
                />

                {/* 하단 정보 바 */}
                <div className="px-4 py-3 flex items-center gap-2 relative"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>

                  {/* 하트 파티클 */}
                  {likeAnimating.has(video.id) && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
                      {[-28, -14, 0, 14, 28].map((hx, i) => (
                        <div key={i} style={{
                          position: 'absolute', right: `${16 - hx}px`, bottom: 14,
                          color: i % 2 === 0 ? '#ff4d8d' : '#ff85b3',
                          fontSize: `${0.7 + i * 0.12}rem`,
                          animation: `heartFloat 0.85s ease-out ${i * 0.08}s forwards`,
                          opacity: 0,
                        }}>♥</div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{video.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/30 text-xs">👁 {video.view_count}</span>
                      <span className="text-white/15 text-xs">·</span>
                      <span className="text-white/30 text-xs">♥ {video.like_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {video.accounts.username !== account?.username && (
                      <>
                        <Link href={`/dm?to=${video.accounts.username}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition text-sm"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                          💬
                        </Link>
                        <button onClick={() => { setReportTarget(video); setReportReason('') }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition text-sm"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
                          🚩
                        </button>
                      </>
                    )}
                    {video.accounts.username === account?.username && (
                      <button onClick={() => setDeleteTarget(video)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition text-sm"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
                        🗑
                      </button>
                    )}
                    <button onClick={() => shareVideo(video)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                      📤
                    </button>
                    <button onClick={() => { setCommentVideoId(video.id); fetchComments(video.id) }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                      🗨️
                    </button>
                    <button
                      onClick={() => toggleLike(video)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition"
                      style={{
                        animation: likeAnimating.has(video.id) ? 'likePop 0.35s ease-out' : 'none',
                        ...(likedIds.has(video.id)
                          ? { background: theme?.gradient, color: 'white', boxShadow: `0 0 12px ${accentColor}60` }
                          : { background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35` })
                      }}
                    >
                      ♥ {video.like_count}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 링크 복사 토스트 */}
      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white text-sm font-medium"
          style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}>
          🔗 링크가 복사됐어요
        </div>
      )}

      {/* 신고 완료 토스트 */}
      {reportDone && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white text-sm font-medium"
          style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
          ✅ {t('feed.reportDone')}
        </div>
      )}

      {/* 신고 모달 */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setReportTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🚩</div>
              <p className="text-white font-semibold">{t('feed.reportTitle')}</p>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { key: 'inappropriate', label: t('feed.reportInappropriate') },
                { key: 'copyright', label: t('feed.reportCopyright') },
                { key: 'spam', label: t('feed.reportSpam') },
                { key: 'other', label: t('feed.reportOther') },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setReportReason(key)}
                  className="w-full py-3 px-4 rounded-xl text-sm text-left transition border"
                  style={reportReason === key
                    ? { background: `${accentColor}20`, borderColor: accentColor, color: 'white' }
                    : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setReportTarget(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-medium"
              >
                {t('feed.cancelBtn')}
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}
              >
                {t('feed.reportSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 바텀 시트 */}
      {commentVideoId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setCommentVideoId(null)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl flex flex-col"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <span className="text-white font-semibold">댓글</span>
              <button onClick={() => setCommentVideoId(null)} className="text-white/30 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 min-h-0">
              {commentLoading ? (
                <div className="text-white/30 text-sm text-center py-8">불러오는 중...</div>
              ) : comments.length === 0 ? (
                <div className="text-white/20 text-sm text-center py-8">아직 댓글이 없어요. 첫 댓글을 달아보세요!</div>
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
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                placeholder="댓글 달기..."
                maxLength={200}
                className="flex-1 bg-white/5 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none border border-white/10"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 rounded-full text-white text-sm font-medium disabled:opacity-30 transition"
                style={{ background: theme?.gradient }}
              >
                게시
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🗑</div>
              <p className="text-white font-semibold">{t('feed.deleteConfirm')}</p>
              <p className="text-white/40 text-sm mt-1">{t('feed.deleteConfirmDesc')}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-medium"
              >
                {t('feed.cancelBtn')}
              </button>
              <button
                onClick={() => deleteVideo(deleteTarget)}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                {t('feed.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'

type Video = {
  id: string
  title: string
  category: string
  like_count: number
  view_count: number
  video_url: string
  created_at: string
  accounts: { username: string; is_founder?: boolean }
}

type Comment = {
  id: string
  account_id: string
  content: string
  created_at: string
  accounts: { username: string }
}

type Filter = 'all' | 'vocal' | 'dance'

export default function UniversePage() {
  const t = useT()
  const { locale } = useLanguage()
  const { name } = useParams<{ name: string }>()
  const groupName = decodeURIComponent(name)
  const theme = getTheme(groupName)
  const accentColor = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary

  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [totalCount, setTotalCount] = useState(0)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [accountId, setAccountId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const viewedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (user) {
        setIsLoggedIn(true)
        const activeId = getActiveAccountId()
        let q = supabase.from('accounts').select('id').eq('user_id', user.id)
        if (activeId) q = q.eq('id', activeId)
        const { data: acc } = await q.limit(1).single()
        if (acc) {
          setAccountId(acc.id)
          const { data: liked } = await supabase
            .from('likes').select('video_id').eq('account_id', acc.id)
          if (liked) setLikedIds(new Set(liked.map((r: { video_id: string }) => r.video_id)))
        }
      }

      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('name', groupName)
        .single()

      if (!group) { setLoading(false); return }

      const { data } = await supabase
        .from('videos')
        .select('*, accounts(username, is_founder)')
        .eq('group_id', group.id)
        .order('like_count', { ascending: false })

      setVideos(data || [])
      setTotalCount((data || []).length)
      setLoading(false)
    }
    load()
  }, [groupName])

  // 공유 링크로 들어왔을 때 해당 영상으로 스크롤
  useEffect(() => {
    const videoId = new URLSearchParams(window.location.search).get('video')
    if (!videoId || videos.length === 0) return
    setHighlightId(videoId)
    setTimeout(() => {
      cardRefs.current[videoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    setTimeout(() => setHighlightId(null), 3000)
  }, [videos])

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
    if (!accountId || !commentVideoId || !commentText.trim()) return
    const { data, error } = await supabase
      .from('video_comments')
      .insert({ video_id: commentVideoId, account_id: accountId, content: commentText.trim() })
      .select('*, accounts(username)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setCommentText('')
    }
  }

  async function deleteComment(commentId: string) {
    await supabase.from('video_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  async function shareVideo(video: Video) {
    const url = `https://kverse-nine.vercel.app/universe/${encodeURIComponent(groupName)}?video=${video.id}`
    const text = `@${video.accounts.username}의 ${groupDisplayName(groupName, locale)} 커버 영상을 Kverse에서 보세요!`
    if (navigator.share) {
      await navigator.share({ title: video.title, text, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    }
  }

  async function toggleLike(video: Video) {
    if (!accountId) return
    const liked = likedIds.has(video.id)

    setLikedIds(prev => {
      const next = new Set(prev)
      liked ? next.delete(video.id) : next.add(video.id)
      return next
    })
    setVideos(prev => prev.map(v =>
      v.id === video.id ? { ...v, like_count: v.like_count + (liked ? -1 : 1) } : v
    ))

    if (liked) {
      await supabase.from('likes').delete().eq('account_id', accountId).eq('video_id', video.id)
      await supabase.from('videos').update({ like_count: video.like_count - 1 }).eq('id', video.id)
    } else {
      await supabase.from('likes').insert({ account_id: accountId, video_id: video.id })
      await supabase.from('videos').update({ like_count: video.like_count + 1 }).eq('id', video.id)
    }
  }

  async function handleVideoPlay(video: Video) {
    if (viewedIds.current.has(video.id)) return
    viewedIds.current.add(video.id)
    await supabase.from('videos').update({ view_count: video.view_count + 1 }).eq('id', video.id)
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, view_count: v.view_count + 1 } : v))
  }

  const filtered = filter === 'all' ? videos : videos.filter(v => v.category === filter)
  const vocalCount = videos.filter(v => v.category === 'vocal').length
  const danceCount = videos.filter(v => v.category === 'dance').length

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return t('common.justNow')
    if (m < 60) return t('common.minsAgo', { n: m })
    const h = Math.floor(m / 60)
    if (h < 24) return t('common.hoursAgo', { n: h })
    return t('common.daysAgo', { n: Math.floor(h / 24) })
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* 링크 복사 토스트 */}
      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white text-sm font-medium"
          style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}>
          🔗 링크가 복사됐어요
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">{t('nav.home')}</Link>
        </div>
        <KverseLogo />
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link href="/browse" className="text-white/40 hover:text-white transition text-sm">{t('nav.allFeed')}</Link>
          ) : (
            <Link href="/login" className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 text-sm font-medium">{t('nav.login')}</Link>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 그룹 헤더 */}
        <div
          className="rounded-3xl p-8 mb-8 flex flex-col items-center text-center border gap-3"
          style={{ background: `${theme.primary}12`, borderColor: `${accentColor}30` }}
        >
          <div className="relative inline-block">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: accentColor }}
            >
              {groupDisplayName(groupName, 'en').charAt(0).toUpperCase()}
            </div>
            <span className="absolute -top-2 -right-2 text-lg leading-none">{theme.emoji}</span>
          </div>
          <div>
            <p className="text-white/40 text-xs font-medium tracking-widest uppercase mb-1">{theme.world}</p>
            <h1 className="text-3xl font-black text-white">{groupDisplayName(groupName, locale)}</h1>
            <p className="text-sm mt-1" style={{ color: `${accentColor}90` }}>{worldName(theme, locale)}</p>
          </div>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 mb-6 justify-center">
          {([
            { key: 'all', label: t('common.all'), count: totalCount },
            { key: 'vocal', label: `VOCAL ${t('common.vocal')}`, count: vocalCount },
            { key: 'dance', label: `DANCE ${t('common.dance')}`, count: danceCount },
          ] as { key: Filter; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-4 py-2 rounded-full text-sm font-medium transition border flex items-center gap-1.5"
              style={filter === key ? {
                background: theme.gradient,
                borderColor: 'transparent',
                color: 'white',
              } : {
                borderColor: `${accentColor}30`,
                color: `${accentColor}70`,
              }}
            >
              {label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={filter === key
                  ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                  : { background: `${accentColor}15`, color: `${accentColor}80` }
                }
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* 영상 목록 — 인라인 스크롤 피드 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-white/20 animate-pulse">{t('common.loading')}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-4 mx-auto"
              style={{ background: accentColor }}>
              {groupDisplayName(groupName, 'en').charAt(0).toUpperCase()}
            </div>
            <p className="text-white/30 text-sm">
              {filter === 'all'
                ? t('uni.noVideos')
                : `${filter === 'vocal' ? t('common.vocal') : t('common.dance')} 커버가 아직 없어요`}
            </p>
            <Link
              href="/signup"
              className="inline-block mt-4 px-6 py-2.5 rounded-full text-white text-sm font-medium transition"
              style={{ background: theme.gradient }}
            >
              {t('uni.uploadCover')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((video, index) => (
              <div
                key={video.id}
                ref={el => { cardRefs.current[video.id] = el }}
                className="rounded-2xl overflow-hidden border transition-all duration-500"
                style={{
                  borderColor: highlightId === video.id ? accentColor : index === 0 ? `${accentColor}50` : `${accentColor}18`,
                  boxShadow: highlightId === video.id ? `0 0 0 2px ${accentColor}, 0 0 32px ${accentColor}40` : 'none',
                }}
              >
                {/* 헤더 */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: `${accentColor}08` }}>
                  <span className="font-bold text-sm w-6 text-center flex-shrink-0"
                    style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255,255,255,0.2)' }}>
                    {index + 1}
                  </span>
                  <Link href={isLoggedIn ? `/profile/${video.accounts.username}` : '/login'}
                    className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{ background: theme.gradient }}>
                      {video.accounts.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-semibold truncate">@{video.accounts.username}</span>
                    {video.accounts.is_founder && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                        ✦
                      </span>
                    )}
                  </Link>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${accentColor}18`, color: accentColor }}>
                    {video.category === 'vocal' ? `🎤 ${t('common.vocal')}` : `💃 ${t('common.dance')}`}
                  </span>
                </div>

                {/* 영상 */}
                <video
                  ref={el => { videoRefs.current[video.id] = el }}
                  src={video.video_url}
                  className="w-full block bg-black"
                  style={{ maxHeight: '65vh' }}
                  playsInline
                  muted
                  loop
                  controls
                  preload="none"
                  onPlay={() => handleVideoPlay(video)}
                />

                {/* 하단 정보 바 */}
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${accentColor}06` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{video.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-white/25 text-xs">{video.view_count} views</span>
                      <span className="text-white/20 text-xs">{timeAgo(video.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => shareVideo(video)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      📤
                    </button>
                    <button
                      onClick={() => { setCommentVideoId(video.id); fetchComments(video.id) }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      🗨️
                    </button>
                    {isLoggedIn && accountId ? (
                      <button
                        onClick={() => toggleLike(video)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition"
                        style={likedIds.has(video.id)
                          ? { background: theme.gradient, color: 'white' }
                          : { background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }
                        }
                      >
                        ♥ {video.like_count}
                      </button>
                    ) : (
                      <Link href="/login"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-white/10 text-white/40">
                        ♥ {video.like_count}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                    style={{ background: theme.gradient }}>
                    {comment.accounts.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-xs font-semibold">@{comment.accounts.username}</span>
                    <p className="text-white/70 text-sm mt-0.5 leading-relaxed">{comment.content}</p>
                  </div>
                  {accountId && comment.account_id === accountId && (
                    <button onClick={() => deleteComment(comment.id)}
                      className="text-white/20 hover:text-red-400 text-xs flex-shrink-0 transition">🗑</button>
                  )}
                </div>
              ))}
            </div>
            {isLoggedIn && accountId ? (
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
                  style={{ background: theme.gradient }}
                >
                  게시
                </button>
              </div>
            ) : (
              <div className="px-4 py-4 border-t border-white/5 text-center flex-shrink-0">
                <Link href="/login" className="text-white/40 text-sm hover:text-white/60 transition">로그인하면 댓글을 달 수 있어요</Link>
              </div>
            )}
          </div>
        </div>
      )}

        {/* 하단 CTA */}
        {!loading && (
          <div className="mt-10 text-center">
            <p className="text-white/20 text-sm mb-3">{t('uni.wantUpload', { group: groupDisplayName(groupName, locale) })}</p>
            <Link
              href="/signup"
              className="inline-block px-8 py-3 rounded-full text-white font-medium text-sm transition hover:opacity-90"
              style={{ background: theme.gradient }}
            >
              {worldName(theme, locale)}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

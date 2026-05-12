'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { getActiveAccountId, setActiveAccountId } from '@/lib/activeAccount'
import Avatar from '@/app/components/Avatar'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT, useLanguage } from '@/lib/i18n'
import { getFlagImageUrl } from '@/lib/countries'
import KverseLogo from '@/app/components/KverseLogo'

type Account = {
  id: string
  username: string
  group_id: string
  gender: string
  nationality?: string
  groups: { name: string; name_en: string }
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
  accounts: { username: string }
  groups: { name: string }
}

type Period = 'all' | 'week' | 'today'
type SortOrder = 'newest' | 'popular'

export default function FeedPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const [account, setAccount] = useState<Account | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [videosLoading, setVideosLoading] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [isPlus, setIsPlus] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)
  const [reportTarget, setReportTarget] = useState<Video | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDone, setReportDone] = useState(false)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const activeId = getActiveAccountId()
      let q = supabase.from('accounts').select('*, groups(name, name_en)').eq('user_id', user.id)
      if (activeId) q = q.eq('id', activeId)
      const { data } = await q.limit(1).single()

      if (!data) { router.push('/select-account'); return }
      setAccount(data)

      const { data: all } = await supabase
        .from('accounts').select('*, groups(name, name_en)').eq('user_id', user.id)
      setAllAccounts(all || [])

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('is_plus, plus_expires_at')
        .eq('user_id', user.id)
        .single()
      if (sub?.is_plus && sub.plus_expires_at && new Date(sub.plus_expires_at) > new Date()) {
        setIsPlus(true)
      }

      await Promise.all([
        fetchVideos(data.group_id, 'all', 'newest'),
        fetchLikedIds(data.id),
      ])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!account) return
    fetchVideos(account.group_id, period, sort)
  }, [period, sort])

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

  async function fetchVideos(groupId: string, p: Period, s: SortOrder) {
    setVideosLoading(true)
    let query = supabase
      .from('videos')
      .select('*, accounts(username), groups(name)')
      .eq('group_id', groupId)
      .or(`is_private.eq.false,account_id.eq.${account?.id}`)
      .order(s === 'newest' ? 'created_at' : 'like_count', { ascending: false })
      .limit(20)

    if (p === 'today') {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      query = query.gte('created_at', start.toISOString())
    } else if (p === 'week') {
      const start = new Date()
      start.setDate(start.getDate() - 7)
      query = query.gte('created_at', start.toISOString())
    }

    const { data: vids } = await query
    setVideos(vids || [])
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

  async function toggleLike(video: Video) {
    if (!account) return
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
      await supabase.from('likes').delete()
        .eq('account_id', account.id).eq('video_id', video.id)
      await supabase.from('videos').update({ like_count: video.like_count - 1 }).eq('id', video.id)
    } else {
      await supabase.from('likes').insert({ account_id: account.id, video_id: video.id })
      await supabase.from('videos').update({ like_count: video.like_count + 1 }).eq('id', video.id)
    }
  }

  const theme = account ? getTheme(account.groups.name) : null
  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">Loading Universe...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">

      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/"><KverseLogo /></Link>

          {theme && account && (
            <button
              onClick={() => setShowAccountMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition hover:opacity-80"
              style={{ color: accentColor, borderColor: accentColor, backgroundColor: `${theme.primary}15` }}
            >
              {account.username}
              <span className="text-white/30 ml-0.5">{allAccounts.length > 1 ? '▾' : ''}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dm" className="px-3 py-2 border border-white/20 hover:bg-white/10 text-white text-sm rounded-full transition whitespace-nowrap shrink-0">
            💬
          </Link>
          <Link href="/community" className="px-3 py-2 border border-white/20 hover:bg-white/10 text-white text-sm rounded-full transition whitespace-nowrap shrink-0">
            <span className="hidden sm:inline">{t('nav.community')}</span>
            <span className="sm:hidden">📋</span>
          </Link>
          <Link
            href="/upload"
            className="px-3 py-2 text-white text-sm font-medium rounded-full transition whitespace-nowrap shrink-0"
            style={{ background: theme?.gradient }}
          >
            + {t('nav.upload')}
          </Link>
          <Link href="/profile" className="px-3 py-2 border border-white/20 hover:bg-white/10 text-white text-sm rounded-full transition whitespace-nowrap shrink-0">
            {t('nav.profile')}
          </Link>
        </div>
      </nav>

      {/* 계정 전환 모달 */}
      {showAccountMenu && allAccounts.length > 1 && theme && account && (
        <div
          className="fixed inset-0 flex items-end justify-center pb-8 px-4"
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowAccountMenu(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-white/40 text-xs text-center">{t('feed.accountMgmt')}</p>
            </div>
            {allAccounts.map(acc => {
              const accTheme = getTheme(acc.groups.name)
              const isActive = acc.id === account.id
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    setActiveAccountId(acc.id)
                    setAccount(acc)
                    setShowAccountMenu(false)
                    fetchVideos(acc.group_id, period, sort)
                    fetchLikedIds(acc.id)
                  }}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/5 transition text-left"
                  style={isActive ? { background: `${accTheme.primary}15` } : {}}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: accTheme.gradient }}>
                    {accTheme.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">@{acc.username}</p>
                    <p className="text-white/30 text-xs truncate">{groupDisplayName(acc.groups.name, locale)}</p>
                  </div>
                  {isActive && <span className="ml-auto text-base" style={{ color: accTheme.primary === '#FFFFFF' ? '#C9A96E' : accTheme.primary }}>✓</span>}
                </button>
              )
            })}
            <div className="border-t border-white/5">
              <Link
                href="/select-account"
                onClick={() => setShowAccountMenu(false)}
                className="block px-4 py-3 text-white/30 hover:text-white/60 text-sm text-center transition"
              >
                + {t('feed.accountMgmt')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 계정 카드 */}
        {account && theme && (
          <div
            className="rounded-2xl p-5 mb-6 flex items-center gap-4 border relative overflow-hidden"
            style={isPlus ? {
              background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(124,58,237,0.12))',
              borderColor: 'rgba(251,191,36,0.5)',
            } : {
              background: `${theme.primary}10`,
              borderColor: `${theme.primary}40`,
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
                {isPlus && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: 'black' }}>
                    👑 PLUS
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: accentColor }}>
                {groupDisplayName(account.groups.name, locale)} · {worldName(theme, locale)}
              </p>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            {account?.groups.name ? groupDisplayName(account.groups.name, locale) : ''} {t('feed.ranking')}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => setSort('newest')} className="px-3 py-1 rounded-full text-xs font-medium transition border"
              style={sort === 'newest' ? { background: theme?.gradient, borderColor: 'transparent', color: 'white' } : { borderColor: `${accentColor}30`, color: `${accentColor}80` }}>
              {t('feed.byNewest')}
            </button>
            <button onClick={() => setSort('popular')} className="px-3 py-1 rounded-full text-xs font-medium transition border"
              style={sort === 'popular' ? { background: theme?.gradient, borderColor: 'transparent', color: 'white' } : { borderColor: `${accentColor}30`, color: `${accentColor}80` }}>
              {t('feed.byLikes')}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {([
            { key: 'all', label: t('common.all') },
            { key: 'week', label: t('feed.thisWeek') },
            { key: 'today', label: t('feed.today') },
          ] as { key: Period; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition border"
              style={period === key ? {
                background: theme?.gradient,
                borderColor: 'transparent',
                color: 'white',
              } : {
                borderColor: `${accentColor}30`,
                color: `${accentColor}80`,
              }}
            >
              {label}
            </button>
          ))}
          {videosLoading && <span className="text-white/20 text-sm self-center ml-1 animate-pulse">...</span>}
        </div>

        {/* 영상 목록 — 인라인 스크롤 피드 */}
        {videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">{theme?.emoji}</div>
            <p className="text-white/50 mb-6">{t('feed.beFirst')}</p>
            <Link
              href="/upload"
              className="px-8 py-3 text-white font-medium rounded-full transition"
              style={{ background: theme?.gradient }}
            >
              {t('feed.uploadFirst')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="rounded-2xl overflow-hidden border"
                style={{ borderColor: index === 0 ? `${accentColor}50` : `${accentColor}18` }}
              >
                {/* 헤더 */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: `${theme?.primary}08` }}>
                  <span className="text-white/20 font-bold text-sm w-6 text-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <Link
                    href={`/profile/${video.accounts.username}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{ background: theme?.gradient }}>
                      {video.accounts.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-semibold truncate">@{video.accounts.username}</span>
                  </Link>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {video.is_live && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {t('feed.liveBadge')}
                      </span>
                    )}
                    {video.is_private && <span className="text-white/30 text-xs">🔒</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${accentColor}18`, color: accentColor }}>
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
                  playsInline
                  muted
                  loop
                  controls
                  preload="none"
                />

                {/* 하단 정보 바 */}
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${theme?.primary}06` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{video.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-white/25 text-xs">{video.view_count} {t('feed.views')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {video.accounts.username !== account?.username && (
                      <>
                        <Link
                          href={`/dm?to=${video.accounts.username}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition text-sm"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
                        >
                          💬
                        </Link>
                        <button
                          onClick={() => { setReportTarget(video); setReportReason('') }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition text-sm"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
                        >
                          🚩
                        </button>
                      </>
                    )}
                    {video.accounts.username === account?.username && (
                      <button
                        onClick={() => setDeleteTarget(video)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}
                      >
                        🗑
                      </button>
                    )}
                    <button
                      onClick={() => toggleLike(video)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition"
                      style={likedIds.has(video.id) ? {
                        background: theme?.gradient, color: 'white',
                      } : {
                        background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30`,
                      }}
                    >
                      ♥ {video.like_count}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

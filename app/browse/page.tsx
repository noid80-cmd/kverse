'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, GROUP_THEMES } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import Link from 'next/link'
import { useT } from '@/lib/i18n'

type Video = {
  id: string
  title: string
  category: string
  like_count: number
  view_count: number
  video_url: string
  created_at: string
  accounts: { username: string }
  groups: { name: string }
}

type CategoryFilter = 'all' | 'vocal' | 'dance'

const ALL_GROUPS = Object.keys(GROUP_THEMES)

export default function BrowsePage() {
  const t = useT()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [accountId, setAccountId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function init() {
      // 로그인 상태 확인 + 계정 가져오기
      const user = await getAuthUser()
      if (!user) { window.location.href = '/login'; return }
      setAuthReady(true)
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

      // 전체 영상 로드 (비공개 제외)
      const { data } = await supabase
        .from('videos')
        .select('*, accounts(username), groups(name)')
        .eq('is_private', false)
        .order('like_count', { ascending: false })
        .limit(100)
      setVideos((data || []).filter((v: any) => v.accounts != null))
      setLoading(false)
    }
    init()
  }, [])

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
    if (selectedVideo?.id === video.id) {
      setSelectedVideo(v => v ? { ...v, like_count: v.like_count + (liked ? -1 : 1) } : v)
    }

    if (liked) {
      await supabase.from('likes').delete().eq('account_id', accountId).eq('video_id', video.id)
      await supabase.from('videos').update({ like_count: video.like_count - 1 }).eq('id', video.id)
    } else {
      await supabase.from('likes').insert({ account_id: accountId, video_id: video.id })
      await supabase.from('videos').update({ like_count: video.like_count + 1 }).eq('id', video.id)
    }
  }

  const filtered = videos.filter(v => {
    const matchGroup = groupFilter === 'all' || v.groups?.name === groupFilter
    const matchCat = categoryFilter === 'all' || v.category === categoryFilter
    return matchGroup && matchCat
  })

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return t('common.justNow')
    if (m < 60) return t('common.minsAgo', { n: m })
    const h = Math.floor(m / 60)
    if (h < 24) return t('common.hoursAgo', { n: h })
    return t('common.daysAgo', { n: Math.floor(h / 24) })
  }

  if (!authReady) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 영상 재생 모달 */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            <video src={selectedVideo.video_url} controls autoPlay className="w-full aspect-video bg-black" />
            <div className="bg-zinc-950 p-4">
              <p className="text-white font-bold text-lg">{selectedVideo.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/40 text-sm">@{selectedVideo.accounts.username}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                  {selectedVideo.groups?.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                  {selectedVideo.category === 'vocal' ? `VOCAL ${t('common.vocal')}` : `DANCE ${t('common.dance')}`}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                {isLoggedIn && accountId ? (
                  <button
                    onClick={() => toggleLike(selectedVideo)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition"
                    style={likedIds.has(selectedVideo.id)
                      ? { background: 'linear-gradient(135deg, #EC4899, #7C3AED)', color: 'white' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }
                    }
                  >
                    <span style={likedIds.has(selectedVideo.id) ? { color: 'white' } : { color: 'rgba(255,255,255,0.6)' }}>♥</span> {selectedVideo.like_count}
                  </button>
                ) : (
                  <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-white/8 text-white/40 border border-white/10">
                    <span style={{ color: 'inherit' }}>♥</span> {selectedVideo.like_count} <span className="text-xs">({t('browse.loginToLike')})</span>
                  </Link>
                )}
                <span className="text-white/30 text-sm">{selectedVideo.view_count} views</span>
                <button onClick={() => setSelectedVideo(null)} className="ml-auto text-white/40 hover:text-white text-sm">{t('browse.close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">{t('nav.home')}</Link>
        </div>
        <span className="font-black text-white">
          {t('nav.allFeed')}
        </span>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link href="/feed" className="text-white/40 hover:text-white text-sm transition">{t('nav.myFeed')}</Link>
              <Link href="/profile" className="text-white/40 hover:text-white text-sm transition">{t('nav.profile')}</Link>
            </>
          ) : (
            <Link href="/login" className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 text-sm font-medium">
              {t('nav.login')}
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">{t('browse.title')}</h1>
          <p className="text-white/30 text-sm mt-1">
            {isLoggedIn ? t('browse.loggedInDesc') : t('browse.guestDesc')}
          </p>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'all', label: t('common.all') },
            { key: 'vocal', label: `VOCAL ${t('common.vocal')}` },
            { key: 'dance', label: `DANCE ${t('common.dance')}` },
          ] as { key: CategoryFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition border"
              style={categoryFilter === key
                ? { background: 'linear-gradient(135deg, #EC4899, #7C3AED)', borderColor: 'transparent', color: 'white' }
                : { borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* 그룹 필터 (가로 스크롤) */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          <button
            onClick={() => setGroupFilter('all')}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition border"
            style={groupFilter === 'all'
              ? { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }
              : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }
            }
          >
            {t('common.all')}
          </button>
          {ALL_GROUPS.map(name => {
            const grpTheme = getTheme(name)
            const isActive = groupFilter === name
            return (
              <button
                key={name}
                onClick={() => setGroupFilter(name)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition border flex items-center gap-1"
                style={isActive
                  ? { background: grpTheme.gradient, borderColor: 'transparent', color: 'white' }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }
                }
              >
                {grpTheme.emoji} {name}
              </button>
            )
          })}
        </div>

        {/* 영상 목록 */}
        {loading ? (
          <div className="text-center py-20 text-white/20 animate-pulse">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-white/30 text-sm">{t('browse.noVideos')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((video, index) => {
              const vTheme = getTheme(video.groups?.name || '')
              const vAccent = vTheme.primary === '#FFFFFF' ? '#C9A96E' : vTheme.primary
              const liked = likedIds.has(video.id)
              return (
                <div
                  key={video.id}
                  className="rounded-2xl p-4 flex items-center gap-4 border cursor-pointer hover:scale-[1.01] transition-transform"
                  style={{
                    background: `${vAccent}08`,
                    borderColor: index < 3 ? `${vAccent}40` : `${vAccent}15`,
                  }}
                >
                  {/* 순위 */}
                  <div className="text-xl font-bold w-8 text-center flex-shrink-0" style={{
                    color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255,255,255,0.15)'
                  }}>
                    {index + 1}
                  </div>

                  {/* 썸네일 */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${vAccent}18`, color: vAccent }}
                    onClick={() => setSelectedVideo(video)}
                  >
                    {video.category === 'vocal' ? 'VOCAL' : 'DANCE'}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0" onClick={() => setSelectedVideo(video)}>
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <p className="text-white font-semibold text-sm truncate">{video.title}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                        style={{ background: `${vAccent}20`, color: vAccent }}
                      >
                        {video.category === 'vocal' ? t('common.vocal') : t('common.dance')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: vTheme.gradient, color: 'white' }}
                      >
                        {vTheme.emoji} {video.groups?.name}
                      </span>
                      <span className="text-white/30 text-xs">@{video.accounts.username}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: liked ? '#EC4899' : 'rgba(255,255,255,0.25)' }}>♥ {video.like_count}</span>
                      <span className="text-white/20 text-xs">{video.view_count} views</span>
                      <span className="text-white/15 text-xs">{timeAgo(video.created_at)}</span>
                    </div>
                  </div>

                  {/* 좋아요 버튼 */}
                  {isLoggedIn && accountId ? (
                    <button
                      onClick={() => toggleLike(video)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition text-base"
                      style={liked
                        ? { background: 'linear-gradient(135deg, #EC4899, #7C3AED)' }
                        : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }
                      }
                    >
                      <span style={liked ? { color: 'white' } : { color: 'rgba(255,255,255,0.5)' }}>♥</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                      style={{ background: vTheme.gradient }}
                    >
                      ▶
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

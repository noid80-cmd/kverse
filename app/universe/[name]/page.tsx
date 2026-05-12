'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import KverseLogo from '@/app/components/KverseLogo'

type Video = {
  id: string
  title: string
  category: string
  like_count: number
  view_count: number
  video_url: string
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
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [accountId, setAccountId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function load() {
      // 로그인 상태 확인
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
        .select('*, accounts(username)')
        .eq('group_id', group.id)
        .order('like_count', { ascending: false })

      setVideos(data || [])
      setTotalCount((data || []).length)
      setLoading(false)
    }
    load()
  }, [groupName])

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
      {/* 영상 재생 모달 */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden border"
            style={{ borderColor: `${accentColor}40` }}
            onClick={e => e.stopPropagation()}
          >
            <video
              src={selectedVideo.video_url}
              controls
              autoPlay
              className="w-full aspect-video bg-black"
            />
            <div className="bg-zinc-950 p-4">
              <p className="text-white font-semibold text-lg">{selectedVideo.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-white/40 text-sm">@{selectedVideo.accounts.username}</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${accentColor}20`, color: accentColor }}
                >
                  {selectedVideo.category === 'vocal' ? `VOCAL ${t('common.vocal')}` : `DANCE ${t('common.dance')}`}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                {isLoggedIn && accountId ? (
                  <button
                    onClick={() => toggleLike(selectedVideo)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition"
                    style={likedIds.has(selectedVideo.id)
                      ? { background: theme.gradient, color: 'white' }
                      : { background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}40` }
                    }
                  >
                    <span style={likedIds.has(selectedVideo.id) ? { color: 'white' } : { color: accentColor }}>♥</span> {selectedVideo.like_count}
                  </button>
                ) : (
                  <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-white/10 text-white/40">
                    <span style={{ color: 'inherit' }}>♥</span> {selectedVideo.like_count} <span className="text-xs">({t('browse.loginToLike')})</span>
                  </Link>
                )}
                <span className="text-white/30 text-sm">{selectedVideo.view_count} views</span>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="ml-auto text-white/40 hover:text-white text-sm transition"
                >
                  {t('browse.close')}
                </button>
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
        <KverseLogo />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {isLoggedIn ? (
            <Link href="/browse" className="text-white/40 hover:text-white transition text-sm">{t('nav.allFeed')}</Link>
          ) : (
            <Link href="/login" className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 text-sm font-medium">{t('nav.login')}</Link>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
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
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-white/30 text-xs">{t('uni.videoCount', { count: totalCount })}</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/30 text-xs">VOCAL {t('common.vocal')} {vocalCount}</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/30 text-xs">DANCE {t('common.dance')} {danceCount}</span>
            </div>
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

        {/* 영상 목록 */}
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
          <div className="flex flex-col gap-3">
            {filtered.map((video, index) => (
              <div
                key={video.id}
                className="rounded-2xl p-4 flex items-center gap-4 border cursor-pointer hover:scale-[1.01] transition-transform"
                style={{
                  background: `${accentColor}08`,
                  borderColor: index === 0 ? `${accentColor}50` : `${accentColor}15`,
                }}
                onClick={() => setSelectedVideo(video)}
              >
                {/* 순위 */}
                <div className="text-xl font-bold w-8 text-center flex-shrink-0" style={{
                  color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255,255,255,0.15)'
                }}>
                  {index + 1}
                </div>

                {/* 썸네일 자리 */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${accentColor}18`, color: accentColor }}
                >
                  {video.category === 'vocal' ? 'VOCAL' : 'DANCE'}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-semibold text-sm truncate">{video.title}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                      style={{ background: `${accentColor}20`, color: accentColor }}
                    >
                      {video.category === 'vocal' ? t('common.vocal') : t('common.dance')}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs">@{video.accounts.username} · {timeAgo(video.created_at)}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: accentColor }}>♥ {video.like_count}</span>
                    <span className="text-white/20 text-xs">{video.view_count} views</span>
                  </div>
                </div>

                {/* 좋아요 / 재생 */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  {isLoggedIn && accountId ? (
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike(video) }}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition text-base"
                      style={likedIds.has(video.id)
                        ? { background: theme.gradient }
                        : { background: `${accentColor}15`, border: `1px solid ${accentColor}30` }
                      }
                    >
                      <span style={likedIds.has(video.id) ? { color: 'white' } : { color: accentColor }}>♥</span>
                    </button>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm"
                      style={{ background: theme.gradient }}
                    >
                      ▶
                    </div>
                  )}
                </div>
              </div>
            ))}
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

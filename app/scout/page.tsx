'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, groupDisplayName } from '@/lib/groupThemes'
import { getFlagImageUrl } from '@/lib/countries'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import KverseLogo from '@/app/components/KverseLogo'

type ScoutAccount = {
  id: string
  username: string
  agency_name: string | null
  is_scout_verified: boolean
}

type Video = {
  id: string
  title: string
  category: string
  like_count: number
  view_count: number
  created_at: string
  is_live: boolean
  account: {
    id: string
    username: string
    nationality: string | null
    birth_year: number | null
    groups: { name: string } | null
  }
}

type SavedId = string

export default function ScoutPage() {
  const router = useRouter()
  const [scout, setScout] = useState<ScoutAccount | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [savedIds, setSavedIds] = useState<Set<SavedId>>(new Set())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const { data: acc } = await supabase
        .from('accounts')
        .select('id, username, agency_name, is_scout_verified, account_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!acc || acc.account_type !== 'scout') { router.push('/feed'); return }
      setScout(acc)

      if (!acc.is_scout_verified) { setLoading(false); return }

      const [videosRes, savedRes] = await Promise.all([
        supabase
          .from('videos')
          .select('id, title, category, like_count, view_count, created_at, is_live, account:account_id(id, username, nationality, birth_year, groups(name))')
          .eq('is_private', false)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('scout_lists')
          .select('target_id')
          .eq('scout_id', acc.id),
      ])

      setVideos((videosRes.data || []).map((v: any) => ({
        ...v,
        account: Array.isArray(v.account) ? v.account[0] : v.account,
      })))
      setSavedIds(new Set((savedRes.data || []).map((r: any) => r.target_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleVideoClick(video: Video) {
    if (!scout || !video.account) return

    await supabase.from('video_views').insert({
      viewer_id: scout.id,
      video_id: video.id,
    })

    window.location.href = `/profile/${video.account.username}`
  }

  async function toggleSave(accountId: string) {
    if (!scout || saving) return
    setSaving(accountId)
    if (savedIds.has(accountId)) {
      await supabase.from('scout_lists').delete().eq('scout_id', scout.id).eq('target_id', accountId)
      setSavedIds(prev => { const s = new Set(prev); s.delete(accountId); return s })
    } else {
      await supabase.from('scout_lists').insert({ scout_id: scout.id, target_id: accountId })
      setSavedIds(prev => new Set([...prev, accountId]))

      const video = videos.find(v => v.account?.id === accountId)
      if (video?.account) {
        await supabase.from('notifications').insert({
          account_id: accountId,
          type: 'scout_view',
          from_username: scout.agency_name || 'Scout',
          video_id: video.id,
          video_title: video.title,
          video_group: video.account.groups?.name || null,
        })
      }
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30 animate-pulse text-sm">Loading...</div>
      </div>
    )
  }

  // 심사 중
  if (!scout?.is_scout_verified) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-5">⏳</div>
        <h1 className="text-xl font-black text-white mb-2">심사 중이에요</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-2">
          <span className="text-white font-semibold">{scout?.agency_name || ''}</span> 계정을 검토하고 있어요.
        </p>
        <p className="text-white/30 text-sm mb-8">승인 완료 후 이용 가능해요 (1~3 영업일)</p>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          className="text-white/30 hover:text-white text-sm transition"
        >
          로그아웃
        </button>
      </div>
    )
  }

  const savedAccountIds = Array.from(savedIds)
  const savedVideos = videos.filter(v => savedIds.has(v.account?.id))
  const displayVideos = activeTab === 'saved' ? savedVideos : videos

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/"><KverseLogo /></Link>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full font-bold border border-yellow-500/30 text-yellow-400">
            🎯 {scout.agency_name || 'Scout'}
          </span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-white/30 hover:text-white text-xs transition"
          >
            로그아웃
          </button>
        </div>
      </nav>

      {/* 탭 */}
      <div className="border-b border-white/10 px-6 flex gap-1">
        {[
          { key: 'all', label: '전체 커버' },
          { key: 'saved', label: `⭐ 스카우트 리스트 ${savedAccountIds.length > 0 ? `(${savedAccountIds.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'all' | 'saved')}
            className={`px-4 py-3.5 text-sm font-medium border-b-2 transition ${activeTab === tab.key ? 'border-pink-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {displayVideos.length === 0 ? (
          <div className="text-center py-20 text-white/20 text-sm">
            {activeTab === 'saved' ? '아직 저장한 아티스트가 없어요' : '업로드된 영상이 없어요'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayVideos.map(video => {
              const acc = video.account
              if (!acc) return null
              const theme = getTheme(acc.groups?.name || '')
              const accent = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary
              const isSaved = savedIds.has(acc.id)
              const age = acc.birth_year ? new Date().getFullYear() - acc.birth_year : null

              return (
                <div key={video.id}
                  className="rounded-2xl border p-4 flex gap-4 cursor-pointer hover:border-white/20 transition"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                  onClick={() => handleVideoClick(video)}>

                  {/* 아티스트 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/profile/${acc.username}`}
                        className="text-white font-bold text-sm hover:underline">
                        @{acc.username}
                      </Link>
                      {acc.nationality && (
                        <img src={getFlagImageUrl(acc.nationality, 20)} alt={acc.nationality}
                          className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                      )}
                      {age && <span className="text-white/30 text-xs">{age}세</span>}
                      {acc.groups?.name && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${accent}20`, color: accent }}>
                          {theme.emoji} {groupDisplayName(acc.groups.name, 'ko')}
                        </span>
                      )}
                    </div>

                    <p className="text-white/70 text-sm mb-2 truncate">{video.title}</p>

                    <div className="flex items-center gap-3 text-xs text-white/30">
                      <span>♥ {video.like_count}</span>
                      <span>👁 {video.view_count}</span>
                      <span>{video.category === 'vocal' ? '🎤 보컬' : '💃 댄스'}</span>
                      {video.is_live && (
                        <span className="text-orange-400 font-bold">LIVE</span>
                      )}
                    </div>
                  </div>

                  {/* 저장 버튼 */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleSave(acc.id) }}
                    disabled={saving === acc.id}
                    className="flex-shrink-0 self-center w-9 h-9 rounded-full flex items-center justify-center transition"
                    style={isSaved
                      ? { background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }
                    }
                  >
                    <span className="text-base">{isSaved ? '⭐' : '☆'}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

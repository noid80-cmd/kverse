'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, GroupTheme, groupDisplayName } from '@/lib/groupThemes'
import Avatar from '@/app/components/Avatar'
import type { EquippedItems } from '@/app/components/Avatar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'
import { COUNTRIES, getFlagImageUrl } from '@/lib/countries'

type Account = {
  id: string
  username: string
  display_name: string
  bio: string
  created_at: string
  gender: string
  nationality?: string
  is_founder?: boolean
  equipped: Record<string, string>
  rpm_avatar_url?: string | null
  groups: { name: string; name_en: string } | null
}

type Video = {
  id: string
  title: string
  category: string
  like_count: number
  view_count: number
  created_at: string
  is_private: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const [account, setAccount] = useState<Account | null>(null)
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<GroupTheme | null>(null)
  const [equippedVisuals, setEquippedVisuals] = useState<EquippedItems>({})
  const [nationality, setNationality] = useState('KR')
  const [editingNationality, setEditingNationality] = useState(false)
  const [nationalitySearch, setNationalitySearch] = useState('')
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [tab, setTab] = useState<'videos' | 'liked'>('videos')
  const [likedVideos, setLikedVideos] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      try {
        const user = await getAuthUser()
        if (!user) { router.push('/login'); return }

        const { data: accounts } = await supabase
          .from('accounts')
          .select('*, groups(name, name_en)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (!accounts || accounts.length === 0) { router.push('/login'); return }

        const groupAccounts = accounts.filter((a: any) => a.groups != null)
        const citizenAccount = accounts.find((a: any) => a.groups == null)
        const activeAccount = groupAccounts.length > 0 ? groupAccounts[0] : citizenAccount
        if (!activeAccount) { router.push('/login'); return }

        setAllAccounts(groupAccounts)
        setAccount(activeAccount)
        if (activeAccount.groups) setTheme(getTheme(activeAccount.groups.name))
        setNationality(activeAccount.nationality || 'KR')

        const [videosRes, equippedResult, followersRes, followingRes, likedRes] = await Promise.all([
          supabase.from('videos').select('*').eq('account_id', activeAccount.id).order('created_at', { ascending: false }),
          loadEquippedVisuals(activeAccount.equipped || {}),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', activeAccount.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', activeAccount.id),
          supabase.from('likes').select('videos(*)').eq('account_id', activeAccount.id),
        ])
        setVideos(videosRes.data || [])
        setEquippedVisuals(equippedResult)
        setFollowerCount(followersRes.count || 0)
        setFollowingCount(followingRes.count || 0)
        setLikedVideos((likedRes.data || []).map((r: any) => r.videos).filter(Boolean))
        setLoading(false)
      } catch (e) {
        console.error(e)
        setLoading(false)
      }
    }
    load()
  }, [])

  async function switchAccount(acc: Account) {
    setAccount(acc)
    if (acc.groups) setTheme(getTheme(acc.groups.name))
    setNationality(acc.nationality || 'KR')
    const [videosRes, equippedResult, followersRes, followingRes] = await Promise.all([
      supabase.from('videos').select('*').eq('account_id', acc.id).order('created_at', { ascending: false }),
      loadEquippedVisuals(acc.equipped || {}),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', acc.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', acc.id),
    ])
    setVideos(videosRes.data || [])
    setEquippedVisuals(equippedResult)
    setFollowerCount(followersRes.count || 0)
    setFollowingCount(followingRes.count || 0)
  }

  async function togglePrivacy(video: Video) {
    const { error } = await supabase.from('videos').update({ is_private: !video.is_private }).eq('id', video.id)
    if (!error) setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_private: !v.is_private } : v))
  }

  async function updateNationality(code: string) {
    if (!account) return
    await supabase.from('accounts').update({ nationality: code }).eq('id', account.id)
    setNationality(code)
    setAccount(prev => prev ? { ...prev, nationality: code } : prev)
    setEditingNationality(false)
    setNationalitySearch('')
  }

  async function loadEquippedVisuals(equipped: Record<string, string>): Promise<EquippedItems> {
    const ids = Object.values(equipped).filter(Boolean)
    if (ids.length === 0) return {}
    const { data } = await supabase.from('shop_items').select('id, slot, visual, emoji').in('id', ids)
    if (!data) return {}
    const result: EquippedItems = {}
    for (const item of data) {
      const v = item.visual || {}
      if (item.slot === 'outfit') result.outfit = { outfitColor: v.outfitColor, type: v.type }
      if (item.slot === 'hat') result.hat = { hatColor: v.hatColor, style: v.style, hatEmoji: item.emoji }
      if (item.slot === 'accessory') result.accessory = { type: v.type, color: v.color, emoji: item.emoji }
      if (item.slot === 'glowstick') result.glowstick = { glowColor: v.glowColor, shape: v.shape }
      if (item.slot === 'skin') result.skin = { auraColor: v.auraColor, gradient: v.gradient }
    }
    return result
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">{t('common.loadingUniverse')}</div>
      </div>
    )
  }

  const totalLikes = videos.reduce((sum, v) => sum + v.like_count, 0)
  const totalViews = videos.reduce((sum, v) => sum + v.view_count, 0)
  const accent = theme?.primary === '#FFFFFF' ? '#C9A96E' : (theme?.primary || '#7C3AED')

  return (
    <div className="min-h-screen bg-black text-white">

      {/* 네비게이션 */}
      <nav className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 grid grid-cols-3 items-center">
        <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">{t('nav.backBtn')}</Link>
        <div className="flex justify-center"><Link href="/"><KverseLogo /></Link></div>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-white/40 hover:text-white text-xs rounded-full border border-white/15 px-3 py-1.5 transition"
          >
            {t('nav.logout')}
          </button>
          <Link href="/upload"
            className="text-white text-xs font-medium rounded-full px-3 py-1.5 transition"
            style={{ background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }}>
            {t('prof.upload')}
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-8">

        {/* 프로필 */}
        {account && (
          <div className="flex flex-col items-center mb-8">
            {/* 아바타 */}
            <div className="relative mb-4">
              <Link href="/avatar" className="hover:opacity-90 transition block">
                <div className="rounded-2xl p-1.5"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)`, boxShadow: '0 0 0 3px #000' }}>
                  <Avatar
                    gender={(account.gender as 'male' | 'female') || 'female'}
                    equipped={equippedVisuals}
                    groupColor={accent}
                    size={96}
                    rpmAvatarUrl={account.rpm_avatar_url}
                    username={account.username}
                  />
                </div>
              </Link>
              <img
                src={getFlagImageUrl(nationality, 20)}
                alt={nationality}
                className="absolute -top-1 -right-1 w-5 h-3.5 rounded-sm object-cover shadow-lg border border-black/80 z-10"
              />
            </div>

            {/* 유저네임 */}
            <div className="flex items-center gap-2 flex-wrap justify-center mb-1">
              <h1 className="text-2xl font-black text-white">@{account.username}</h1>
              {account.is_founder && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                  ✦ FOUNDER
                </span>
              )}
            </div>

            {/* 그룹 뱃지 */}
            {account.groups ? (
              <span className="text-sm font-medium px-3 py-1 rounded-full mb-2"
                style={{ background: `${accent}22`, color: accent }}>
                {groupDisplayName(account.groups.name, locale)}
              </span>
            ) : (
              <span className="text-sm font-medium px-3 py-1 rounded-full mb-2"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                {t('prof.citizen')}
              </span>
            )}

            {/* 국적 */}
            <button
              onClick={() => setEditingNationality(true)}
              className="flex items-center gap-1.5 text-white/30 hover:text-white/50 transition"
            >
              <img src={getFlagImageUrl(nationality, 20)} alt={nationality} className="w-5 h-3.5 rounded-sm object-cover" />
              <span className="text-xs">
                {locale === 'ko' ? COUNTRIES.find(c => c.code === nationality)?.nameKo : COUNTRIES.find(c => c.code === nationality)?.name}
              </span>
              <span className="text-[10px] opacity-50">✏️</span>
            </button>
          </div>
        )}

        {/* 계정 전환 */}
        {allAccounts.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 justify-center">
            {allAccounts.map(acc => {
              const accT = getTheme(acc.groups?.name || '')
              const isActive = account?.id === acc.id
              const accAccent = accT.primary === '#FFFFFF' ? '#C9A96E' : accT.primary
              return (
                <button key={acc.id} onClick={() => switchAccount(acc)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border flex-shrink-0"
                  style={isActive
                    ? { background: accT.gradient, borderColor: 'transparent', color: 'white' }
                    : { borderColor: `${accAccent}40`, color: accAccent }}>
                  {acc.username}
                </button>
              )
            })}
          </div>
        )}

        {/* 스탯 */}
        {account && (
          <div className="rounded-2xl p-5 mb-6 border" style={{ background: `${accent}0A`, borderColor: `${accent}25` }}>
            <div className="grid grid-cols-3 gap-0 mb-4 pb-4 border-b" style={{ borderColor: `${accent}20` }}>
              <div className="text-center border-r" style={{ borderColor: `${accent}20` }}>
                <p className="text-3xl font-bold text-white">{videos.length}</p>
                <p className="text-white/40 text-xs mt-1">{t('prof.coverVideos')}</p>
              </div>
              <div className="text-center border-r" style={{ borderColor: `${accent}20` }}>
                <p className="text-3xl font-bold" style={{ color: accent }}>{totalLikes}</p>
                <p className="text-white/40 text-xs mt-1">{t('prof.totalLikes')}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{totalViews}</p>
                <p className="text-white/40 text-xs mt-1">{t('prof.totalViews')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-0">
              <div className="text-center border-r" style={{ borderColor: `${accent}20` }}>
                <p className="text-2xl font-bold text-white">{followerCount}</p>
                <p className="text-white/40 text-xs mt-1">{t('prof.followers')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{followingCount}</p>
                <p className="text-white/40 text-xs mt-1">{t('prof.following')}</p>
              </div>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-2 mb-5">
          {(['videos', 'liked'] as const).map(key => (
            <button key={key} onClick={() => setTab(key)}
              className="px-5 py-2 rounded-full text-sm font-medium transition border"
              style={tab === key
                ? { background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', borderColor: 'transparent', color: 'white' }
                : { borderColor: `${accent}30`, color: `${accent}70` }}>
              {key === 'videos' ? t('prof.videosTab') : t('prof.likedTab')}
            </button>
          ))}
        </div>

        {/* 영상 목록 */}
        {tab === 'liked' ? (
          likedVideos.length === 0 ? (
            <div className="text-center py-14 text-white/20 text-sm">{t('prof.noLikedVideos')}</div>
          ) : (
            <div className="flex flex-col gap-2.5 pb-10">
              {likedVideos.map((video: any) => (
                <div key={video.id} className="rounded-xl p-4 flex items-center gap-3 border"
                  style={{ background: `${accent}08`, borderColor: `${accent}18` }}>
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${accent}20`, color: accent }}>
                    {video.category === 'vocal' ? 'VOCAL' : 'DANCE'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{video.title}</p>
                    <span className="text-xs" style={{ color: accent }}>♥ {video.like_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : videos.length === 0 ? (
          <div className="text-center py-14 rounded-2xl border" style={{ borderColor: `${accent}15` }}>
            <div className="text-5xl mb-3">{theme?.emoji || '🎤'}</div>
            <p className="text-white/30 text-sm mb-4">{t('prof.noVideos')}</p>
            <Link href="/upload" className="px-6 py-2.5 text-white font-medium rounded-full text-sm"
              style={{ background: theme?.gradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }}>
              {t('prof.uploadFirst')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pb-10">
            {videos.map(video => (
              <div key={video.id} className="rounded-xl p-4 flex items-center gap-3 border transition hover:opacity-90"
                style={{ background: `${accent}08`, borderColor: `${accent}18` }}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${accent}20`, color: accent }}>
                  {video.category === 'vocal' ? 'VOCAL' : 'DANCE'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{video.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: accent }}>♥ {video.like_count}</span>
                    <span className="text-white/30 text-xs">{video.view_count} {t('feed.views')}</span>
                    <span className="text-white/20 text-xs">{new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => togglePrivacy(video)}
                  className="text-xs px-2 py-1 rounded-full border transition shrink-0"
                  style={video.is_private
                    ? { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
                    : { borderColor: `${accent}40`, color: accent }}>
                  {video.is_private ? '🔒' : '🌐'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 국적 변경 모달 */}
      {editingNationality && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center px-4 pb-8"
          onClick={() => { setEditingNationality(false); setNationalitySearch('') }}>
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-bold mb-4 text-center">🌍 {t('prof.changeNationality')}</h2>
            <input
              type="text"
              value={nationalitySearch}
              onChange={e => setNationalitySearch(e.target.value)}
              placeholder={t('prof.searchCountry')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm mb-2"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
              {COUNTRIES.filter(c =>
                c.name.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
                c.nameKo.includes(nationalitySearch)
              ).map(c => (
                <button key={c.code} onClick={() => updateNationality(c.code)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-left text-sm rounded-lg">
                  <img src={getFlagImageUrl(c.code, 20)} alt={c.code} className="w-6 h-4 rounded-sm object-cover flex-shrink-0" />
                  <span className="text-white">{locale === 'ko' ? c.nameKo : c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

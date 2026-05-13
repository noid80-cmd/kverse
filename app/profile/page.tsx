'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, GroupTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
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
  groups: { name: string; name_en: string }
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
  const [videos, setVideos] = useState<Video[]>([])
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<GroupTheme | null>(null)
  const [equippedVisuals, setEquippedVisuals] = useState<EquippedItems>({})
  const [nationality, setNationality] = useState('KR')
  const [editingNationality, setEditingNationality] = useState(false)
  const [nationalitySearch, setNationalitySearch] = useState('')
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const { data: accounts } = await supabase
        .from('accounts')
        .select('*, groups(name, name_en)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!accounts || accounts.length === 0) { router.push('/select-group'); return }

      setAllAccounts(accounts)
      setAccount(accounts[0])
      setTheme(getTheme(accounts[0].groups.name))
      setNationality(accounts[0].nationality || 'KR')

      const [{ data: vids }, equippedResult, { count: fc }, { count: fg }] = await Promise.all([
        supabase.from('videos').select('*').eq('account_id', accounts[0].id).order('created_at', { ascending: false }),
        loadEquippedVisuals(accounts[0].equipped || {}),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', accounts[0].id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', accounts[0].id),
      ])
      setFollowerCount(fc || 0)
      setFollowingCount(fg || 0)

      setVideos(vids || [])
      setEquippedVisuals(equippedResult)
      setLoading(false)
    }
    load()
  }, [])

  async function switchAccount(acc: Account) {
    setAccount(acc)
    setTheme(getTheme(acc.groups.name))
    setNationality(acc.nationality || 'KR')
    const [{ data: vids }, equippedResult, { count: fc }, { count: fg }] = await Promise.all([
      supabase.from('videos').select('*').eq('account_id', acc.id).order('created_at', { ascending: false }),
      loadEquippedVisuals(acc.equipped || {}),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', acc.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', acc.id),
    ])
    setVideos(vids || [])
    setEquippedVisuals(equippedResult)
    setFollowerCount(fc || 0)
    setFollowingCount(fg || 0)
  }

  async function togglePrivacy(video: Video) {
    const { error } = await supabase
      .from('videos')
      .update({ is_private: !video.is_private })
      .eq('id', video.id)
    if (!error) {
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_private: !v.is_private } : v))
    }
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

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">🏠</Link>
          <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">← {t('nav.back')}</Link>
        </div>
        <KverseLogo />
        <div className="flex items-center gap-2">
          <Link href="/community" className="px-3 py-1.5 text-white/40 hover:text-white text-xs rounded-full border border-white/10 transition">
            📋
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="px-3 py-1.5 text-white/40 hover:text-white text-xs rounded-full border border-white/10 transition"
          >
            {t('nav.logout')}
          </button>
          <Link href="/upload" className="px-3 py-1.5 text-white text-xs font-medium rounded-full" style={{ background: theme?.gradient }}>
            {t('prof.upload')}
          </Link>
        </div>
      </nav>

      {/* ── HERO BANNER ── */}
      {account && theme && (
        <div className="relative overflow-hidden" style={{ height: 220 }}>
          {/* full-color gradient fill */}
          <div className="absolute inset-0" style={{ background: theme.gradient }} />
          {/* strong bottom fade — avatar overlaps into this */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.95) 100%)' }} />

          {/* star decorations */}
          {['14%,18%', '72%,12%', '88%,55%', '8%,70%', '55%,82%', '38%,8%', '92%,28%'].map((pos, i) => {
            const [l, t2] = pos.split(',')
            return (
              <span key={i} style={{
                position: 'absolute', left: l, top: t2,
                color: 'white', opacity: 0.3 + (i % 3) * 0.15,
                fontSize: [10, 7, 8, 6, 9, 7, 6][i],
                fontFamily: 'serif',
              }}>✦</span>
            )
          })}

          {/* content in upper portion — bottom stays clear for avatar overlap */}
          <div className="absolute top-7 inset-x-0 flex flex-col items-center gap-1.5">
            <span className="text-3xl leading-none">
              {theme.emoji}
            </span>
            <p className="text-white font-bold text-xl tracking-wide" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              {worldName(theme, locale)}
            </p>
            <p className="text-white/70 text-sm font-medium">
              {groupDisplayName(account.groups.name, locale)}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-5">

        {/* ── PROFILE SECTION (centered, overlapping hero) ── */}
        {account && theme && (
          <div className="flex flex-col items-center -mt-12 mb-6">
            {/* avatar with glow ring */}
            <div className="relative group mb-5">
              <Link href="/avatar" className="hover:opacity-90 transition block">
                <div
                  className="rounded-2xl p-1.5"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}55)`,
                    boxShadow: `0 0 0 3px #000`,
                  }}
                >
                  <Avatar
                    gender={(account.gender as 'male' | 'female') || 'female'}
                    equipped={equippedVisuals}
                    groupColor={accent}
                    size={100}
                    rpmAvatarUrl={account.rpm_avatar_url}
                    username={account.username}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-2xl bg-black/30 pointer-events-none">
                  <span className="text-white text-xs font-medium">{t('nav.avatar')}</span>
                </div>
              </Link>
              <img
                src={getFlagImageUrl(nationality, 20)}
                alt={nationality}
                className="absolute -top-1 -right-1 w-5 h-3.5 rounded-sm object-cover shadow-lg border border-black/80 z-10"
              />
            </div>

            {/* username */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <h1 className="text-2xl font-black text-white leading-tight">@{account.username}</h1>
              {account.is_founder && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                  ✦ FOUNDER
                </span>
              )}
            </div>

            {/* group badge */}
            <span className="mt-1.5 text-sm font-medium px-3 py-1 rounded-full" style={{ background: `${accent}22`, color: accent }}>
              {groupDisplayName(account.groups.name, locale)}
            </span>

            {/* joined date */}
            <p className="text-white/25 text-xs mt-1.5">
              {new Date(account.created_at).toLocaleDateString()} {t('common.joined')}
            </p>

            {/* nationality (editable) */}
            <button
              onClick={() => setEditingNationality(true)}
              className="flex items-center gap-1.5 mt-2 text-white/30 hover:text-white/50 transition"
            >
              <img src={getFlagImageUrl(nationality, 20)} alt={nationality} className="w-5 h-3.5 rounded-sm object-cover" />
              <span className="text-xs">
                {locale === 'ko' ? COUNTRIES.find(c => c.code === nationality)?.nameKo : COUNTRIES.find(c => c.code === nationality)?.name}
              </span>
              <span className="text-[10px] opacity-50">✏️</span>
            </button>
          </div>
        )}

        {/* ── ACCOUNT SWITCHER ── */}
        {allAccounts.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 justify-center">
            {allAccounts.map((acc) => {
              const accT = getTheme(acc.groups.name)
              const isActive = account?.id === acc.id
              const accAccent = accT.primary === '#FFFFFF' ? '#C9A96E' : accT.primary
              return (
                <button
                  key={acc.id}
                  onClick={() => switchAccount(acc)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border flex-shrink-0"
                  style={isActive
                    ? { background: accT.gradient, borderColor: 'transparent', color: 'white' }
                    : { borderColor: `${accAccent}40`, color: accAccent }
                  }
                >
                  {acc.username}
                </button>
              )
            })}
          </div>
        )}

        {/* ── STATS CARD ── */}
        {account && theme && (
          <div
            className="rounded-2xl p-5 mb-5 border grid grid-cols-5 gap-0"
            style={{ background: `${accent}0A`, borderColor: `${accent}25` }}
          >
            <div className="text-center border-r" style={{ borderColor: `${accent}20` }}>
              <p className="text-2xl font-bold text-white">{videos.length}</p>
              <p className="text-white/40 text-xs mt-1">{t('prof.coverVideos')}</p>
            </div>
            <div className="text-center border-r" style={{ borderColor: `${accent}20` }}>
              <p className="text-2xl font-bold" style={{ color: accent }}>{totalLikes}</p>
              <p className="text-white/40 text-xs mt-1">{t('prof.totalLikes')}</p>
            </div>
            <div className="text-center border-r" style={{ borderColor: `${accent}20` }}>
              <p className="text-2xl font-bold text-white">{totalViews}</p>
              <p className="text-white/40 text-xs mt-1">{t('prof.totalViews')}</p>
            </div>
            <div className="text-center border-r" style={{ borderColor: `${accent}20` }}>
              <p className="text-2xl font-bold text-white">{followerCount}</p>
              <p className="text-white/40 text-xs mt-1">{t('prof.followers')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{followingCount}</p>
              <p className="text-white/40 text-xs mt-1">{t('prof.following')}</p>
            </div>
          </div>
        )}

        {/* ── ADD ACCOUNT ── */}
        {allAccounts.length < 3 ? (
          <Link
            href="/select-group"
            className="flex items-center justify-center gap-2 border border-dashed rounded-xl py-3 text-sm mb-6 transition hover:opacity-70"
            style={{ borderColor: `${accent}30`, color: `${accent}60` }}
          >
            + {t('prof.addAccount')} ({allAccounts.length}/3)
          </Link>
        ) : (
          <Link
            href="/upgrade"
            className="flex items-center justify-center gap-2 border border-dashed rounded-xl py-3 text-sm mb-6 transition hover:opacity-80"
            style={{ borderColor: 'rgba(251,191,36,0.25)', color: 'rgba(251,191,36,0.5)' }}
          >
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>PLUS</span>
            {t('prof.addAccount')} (3/3)
          </Link>
        )}

        {/* ── VIDEOS ── */}
        <h2 className="text-base font-bold text-white mb-3 text-center">{t('prof.myVideos')}</h2>

        {videos.length === 0 ? (
          <div className="text-center py-14 rounded-2xl border" style={{ borderColor: `${accent}15` }}>
            <div className="text-5xl mb-3">{theme?.emoji}</div>
            <p className="text-white/30 text-sm mb-4">{t('prof.noVideos')}</p>
            <Link
              href="/upload"
              className="px-6 py-2.5 text-white font-medium rounded-full text-sm"
              style={{ background: theme?.gradient }}
            >
              {t('prof.uploadFirst')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pb-10">
            {videos.map((video) => (
              <div
                key={video.id}
                className="rounded-xl p-4 flex items-center gap-3 border transition hover:opacity-90"
                style={{ background: `${accent}08`, borderColor: `${accent}18` }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${accent}20`, color: accent }}
                >
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
                <button
                  onClick={() => togglePrivacy(video)}
                  className="text-xs px-2 py-1 rounded-full border transition shrink-0"
                  style={video.is_private
                    ? { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
                    : { borderColor: `${accent}40`, color: accent }
                  }
                >
                  {video.is_private ? '🔒' : '🌐'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* nationality edit modal */}
      {editingNationality && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center px-4 pb-8"
          onClick={() => { setEditingNationality(false); setNationalitySearch('') }}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white font-bold mb-4 text-center">🌍 국적 변경</h2>
            <input
              type="text"
              value={nationalitySearch}
              onChange={e => setNationalitySearch(e.target.value)}
              placeholder="나라 검색 / Search country"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm mb-2"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
              {COUNTRIES.filter(c =>
                c.name.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
                c.nameKo.includes(nationalitySearch)
              ).map(c => (
                <button
                  key={c.code}
                  onClick={() => updateNationality(c.code)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-left text-sm rounded-lg"
                >
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

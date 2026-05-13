'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, GroupTheme, groupDisplayName } from '@/lib/groupThemes'
import Avatar from '@/app/components/Avatar'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'
import { getFlagImageUrl } from '@/lib/countries'

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
  is_live: boolean
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const username = params.username as string
  const [profile, setProfile] = useState<Account | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [theme, setTheme] = useState<GroupTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwn, setIsOwn] = useState(false)
  const [myAccountId, setMyAccountId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()

      const { data: acc } = await supabase
        .from('accounts')
        .select('*, groups(name, name_en)')
        .eq('username', username)
        .single()

      if (!acc) { router.push('/feed'); return }

      setProfile(acc)
      setTheme(getTheme(acc.groups.name))

      const { data: vids } = await supabase
        .from('videos')
        .select('id, title, category, like_count, view_count, created_at, is_live')
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
          .from('accounts')
          .select('id, username')
          .eq('user_id', user.id)
        if (myAccounts && myAccounts.length > 0) {
          const ownAcc = myAccounts.find((a: { id: string; username: string }) => a.username === username)
          if (ownAcc) {
            setIsOwn(true)
            setMyAccountId(ownAcc.id)
          } else {
            setMyAccountId(myAccounts[0].id)
            const { data: followRow } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', myAccounts[0].id)
              .eq('following_id', acc.id)
              .maybeSingle()
            setIsFollowing(!!followRow)
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [username])

  async function toggleFollow() {
    if (!myAccountId || !profile) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', myAccountId).eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: myAccountId, following_id: profile.id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setFollowLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">{t('common.loadingUniverse')}</div>
      </div>
    )
  }

  if (!profile || !theme) return null

  const accent = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary
  const totalLikes = videos.reduce((sum, v) => sum + v.like_count, 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">🏠</Link>
          <button onClick={() => router.back()} className="text-white/40 hover:text-white transition text-sm">← {t('nav.back')}</button>
        </div>
        <KverseLogo />
        <div />
      </nav>

      {/* 히어로 배너 */}
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        <div className="absolute inset-0" style={{ background: theme.gradient }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.9) 100%)' }} />
      </div>

      <div className="max-w-2xl mx-auto px-5">
        {/* 프로필 섹션 */}
        <div className="flex flex-col items-center -mt-10 mb-6">
          <div className="rounded-2xl p-1.5 mb-3" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)`, boxShadow: '0 0 0 3px #000' }}>
            <Avatar
              gender={(profile.gender as 'male' | 'female') || 'female'}
              groupColor={accent}
              size={90}
              rpmAvatarUrl={profile.rpm_avatar_url}
              username={profile.username}
            />
          </div>
          <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
            <h1 className="text-2xl font-black text-white">@{profile.username}</h1>
            {profile.nationality && (
              <img src={getFlagImageUrl(profile.nationality, 20)} alt={profile.nationality} className="w-5 h-3.5 rounded-sm object-cover" />
            )}
            {profile.is_founder && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                ✦ FOUNDER
              </span>
            )}
          </div>
          <span className="text-sm font-medium px-3 py-1 rounded-full mb-2" style={{ background: `${accent}22`, color: accent }}>
            {groupDisplayName(profile.groups.name, locale)}
          </span>
          {profile.bio && <p className="text-white/50 text-sm text-center max-w-xs">{profile.bio}</p>}

          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{videos.length}</p>
              <p className="text-white/40 text-xs">{t('prof.coverVideos')}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: accent }}>{totalLikes}</p>
              <p className="text-white/40 text-xs">{t('prof.totalLikes')}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{followerCount}</p>
              <p className="text-white/40 text-xs">{t('prof.followers')}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{followingCount}</p>
              <p className="text-white/40 text-xs">{t('prof.following')}</p>
            </div>
          </div>

          {!isOwn && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={toggleFollow}
                disabled={followLoading || !myAccountId}
                className="px-6 py-2 text-white text-sm font-bold rounded-full transition disabled:opacity-50"
                style={isFollowing
                  ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }
                  : { background: theme.gradient }
                }
              >
                {isFollowing ? t('prof.unfollow') : t('prof.follow')}
              </button>
              <Link
                href={`/dm?to=${profile.username}`}
                className="px-5 py-2 text-white text-sm font-medium rounded-full transition border border-white/20 hover:bg-white/10"
              >
                💬
              </Link>
            </div>
          )}
          {isOwn && (
            <Link href="/profile" className="mt-4 px-6 py-2 text-white/50 text-sm rounded-full border border-white/10 hover:text-white transition">
              {t('prof.editProfile')}
            </Link>
          )}
        </div>

        {/* 영상 목록 */}
        <h2 className="text-base font-bold text-white mb-3 text-center">{t('prof.myVideos')}</h2>
        {videos.length === 0 ? (
          <div className="text-center py-14 rounded-2xl border" style={{ borderColor: `${accent}15` }}>
            <div className="text-5xl mb-3">{theme.emoji}</div>
            <p className="text-white/30 text-sm">{t('prof.noVideos')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pb-10">
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/universe/${encodeURIComponent(profile.groups.name)}?video=${video.id}`}
                className="rounded-xl p-4 flex items-center gap-3 border block hover:opacity-80 transition"
                style={{ background: `${accent}08`, borderColor: `${accent}18` }}
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${accent}20` }}>
                  {video.category === 'vocal' ? '🎤' : '💃'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm truncate">{video.title}</p>
                    {video.is_live && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {t('feed.liveBadge')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: accent }}>♥ {video.like_count}</span>
                    <span className="text-white/30 text-xs">{video.view_count} {t('feed.views')}</span>
                    <span className="text-white/20 text-xs">{new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="text-white/20 text-xs flex-shrink-0">▶</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

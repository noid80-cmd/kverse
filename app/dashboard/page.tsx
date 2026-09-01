'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import { useTalentNav } from '@/components/layout/talentNav'
import PushSubscribe from '@/components/PushSubscribe'
import AuditionCountdown from '@/components/AuditionCountdown'
import { daysUntilLaunch } from '@/lib/launch'
import LiveTicker from '@/components/LiveTicker'
import Link from 'next/link'
import { Plus, Megaphone, Bookmark, MessageCircle, User, ChevronRight, Play } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT, LANG_LABELS, LANGS, type Lang } from '@/lib/i18n/translations'

type Profile = { name: string; avatar_url: string | null; bio: string | null }
type RecentVideo = { id: string; title: string; thumbnail_url: string | null }
type RecentAudition = { id: string; title: string; category: string; deadline: string | null; agency: { name: string; logo_url: string | null } | null; translations?: Record<string, { title: string; description: string }> | null }
type PageData = {
  profile: Profile | null
  recentVideos: RecentVideo[]
  videoCount: number
  bookmarks: number
  contacts: number
  recentAuditions: RecentAudition[]
  agencyCount: number
  applications: { total: number; pending: number; invited: number }
}

const CACHE_KEY = 'kpick-dashboard-v5'



function getAuditionDisplayTitle(a: RecentAudition, lang: string) {
  if (lang === 'ko') return a.title
  const key = lang === 'ja' ? 'ja' : (lang === 'zh' || lang === 'zh-TW') ? 'zh-CN' : lang === 'th' ? 'th' : 'en'
  return a.translations?.[key]?.title || a.title
}


export default function DashboardPage() {
  const { lang, setLang } = useLang()
  const tx = useT(lang)

  const categoryLabel: Record<string, string> = {
    vocal: tx.videos.vocal, dance: tx.videos.dance, acting: tx.videos.acting, rap: tx.videos.rap, other: tx.videos.other
  }

  const talentNav = useTalentNav()

  const [data, setData] = useState<PageData | null>(() => {
    try { const c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : null } catch { return null }
  })
  const [auditionIdx, setAuditionIdx] = useState(0)
  const [langOpen, setLangOpen] = useState(false)
  const [unread, setUnread] = useState({ bookmarks: 0, messages: 0 })
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!langOpen) return
    const close = () => setLangOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [langOpen])

  useEffect(() => {
    if (!data || data.recentAuditions.length <= 1) return
    const t = setInterval(() => setAuditionIdx(i => (i + 1) % data.recentAuditions.length), 3500)
    return () => clearInterval(t)
  }, [data?.recentAuditions.length])

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }

      const { data: roleData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (roleData?.role === 'admin') setIsAdmin(true)
      if (roleData?.role === 'agency') { window.location.replace('/agency/discover'); return }

      const [{ data: prof }, { data: vids, count: vCount }, { count: bCount }, { data: convs, count: cCount }, { data: auds }, { count: agCount }, { data: apps }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, bio').eq('id', user.id).single(),
        supabase.from('videos').select('id, title, thumbnail_url', { count: 'exact' }).eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(6),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('talent_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact' }).eq('talent_id', user.id).eq('deleted_by_talent', false),
        supabase.from('auditions').select('id, title, category, deadline, translations, agency:agencies(name, logo_url)')
          .eq('status', 'active')
          .or(`deadline.is.null,deadline.gte.${new Date().toISOString().slice(0, 10)}`)
          .order('created_at', { ascending: false }).limit(8),
        // 참여 기획사 수는 실제로 센다. 예전엔 티커에 16이 박혀 있었는데 초대만
        // 해두고 가입 안 한 곳까지 센 숫자였다. 세어서 쓰면 다시는 안 틀린다.
        supabase.from('agencies').select('id', { count: 'exact', head: true }),
        supabase.from('audition_applications').select('status').eq('talent_id', user.id),
      ])

      const appRows = (apps as { status: string }[] | null) ?? []

      const fresh: PageData = {
        profile: prof,
        recentVideos: (vids as unknown as RecentVideo[]) ?? [],
        videoCount: vCount ?? 0,
        bookmarks: bCount ?? 0,
        contacts: cCount ?? 0,
        recentAuditions: (auds as unknown as RecentAudition[]) ?? [],
        agencyCount: agCount ?? 0,
        applications: {
          total: appRows.length,
          pending: appRows.filter(a => a.status === 'pending').length,
          invited: appRows.filter(a => a.status === 'invited').length,
        },
      }
      setData(fresh)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)) } catch {}

      // 미확인 배지
      const lastSeenBmRaw = localStorage.getItem('kpick-seen-bm')
      if (lastSeenBmRaw === null) localStorage.setItem('kpick-seen-bm', String(bCount ?? 0))
      const lastSeenBm = lastSeenBmRaw !== null ? parseInt(lastSeenBmRaw) : (bCount ?? 0)
      const newBm = Math.max(0, (bCount ?? 0) - lastSeenBm)
      let unreadMsg = 0
      const convIds = (convs ?? []).map((c: { id: string }) => c.id)
      if (convIds.length > 0) {
        const { count: mc } = await supabase.from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)
        unreadMsg = mc ?? 0
      }
      setUnread({ bookmarks: newBm, messages: unreadMsg })
    }

    async function refreshProfile() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('name, avatar_url, bio').eq('id', user.id).single()
      if (prof) setData(prev => {
        if (!prev) return prev
        const updated = { ...prev, profile: prof }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(updated)) } catch {}
        return updated
      })
    }

    load()

    const onVisible = () => { if (document.visibilityState === 'visible') refreshProfile() }
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) refreshProfile() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PushSubscribe />
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(36,28,21,0.1)', borderTop: '3px solid #D84A1E', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const { profile, recentVideos, videoCount, bookmarks, contacts, recentAuditions, agencyCount, applications } = data

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', paddingBottom: 112, position: 'relative', overflow: 'hidden' }}>
      {isAdmin && (
        <a href="/admin" style={{
          position: 'fixed', bottom: 24, right: 16, zIndex: 999,
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: 'white', fontSize: 12, fontWeight: 800,
          padding: '8px 14px', borderRadius: 20,
          textDecoration: 'none', boxShadow: '0 4px 16px rgba(109,40,217,0.35)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>⚙️ 관리자</a>
      )}
      <PushSubscribe />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        .no-scrollbar::-webkit-scrollbar{display:none}
      `}</style>

      {/* Atmospheric background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse at center top, rgba(255,111,60,0.12) 0%, rgba(216,74,30,0.04) 40%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,111,60,0.06) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(216,74,30,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(216,74,30,0.02) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Krookie 로고 ── */}
        <div className="max-w-lg mx-auto px-4" style={{ paddingTop: 'var(--safe-top)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <svg width="24" height="24" viewBox="0 0 100 100">
            <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#FF6F3C" />
            <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="rgba(216,74,30,0.7)" />
          </svg>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#241C15', letterSpacing: -0.5 }}>Krookie</span>
        </div>

        {/* ── Profile header ── */}
        <div className="max-w-lg mx-auto px-4" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
            <Link href="/profile/edit" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 26,
                background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                border: '2px solid rgba(255,111,60,0.4)',
                boxShadow: '0 0 0 4px rgba(255,111,60,0.1), 0 0 24px rgba(255,111,60,0.15)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'white', fontWeight: 900, fontSize: 30 }}>{profile?.name?.[0] ?? 'K'}</span>
                }
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#241C15', lineHeight: 1.2 }}>
                  {profile?.name ?? '...'}
                </h1>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setLangOpen(o => !o) }}
                    style={{ background: 'rgba(36,28,21,0.05)', border: '1px solid rgba(36,28,21,0.12)', borderRadius: 10, padding: '5px 8px', fontSize: 12, color: '#8A7F6E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 76, WebkitAppearance: 'none', appearance: 'none' }}>
                    <span style={{ width: 12, flexShrink: 0 }} />
                    <span>{LANG_LABELS[lang as Lang]}</span>
                    <span style={{ width: 12, flexShrink: 0, fontSize: 9, opacity: 0.5, textAlign: 'right' }}>▼</span>
                  </button>
                  {langOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 100, boxShadow: '0 8px 24px rgba(36,28,21,0.15)' }}>
                      {LANGS.map(l => (
                        <button key={l} onClick={e => { e.stopPropagation(); setLang(l as Lang); setLangOpen(false) }}
                          style={{ display: 'block', width: '100%', padding: '9px 14px', fontSize: 13, textAlign: 'center', cursor: 'pointer', background: l === lang ? 'rgba(255,111,60,0.12)' : 'none', color: l === lang ? '#D84A1E' : '#5B5346', border: 'none', fontWeight: l === lang ? 700 : 400 }}>
                          {LANG_LABELS[l as Lang]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {profile?.bio
                ? null
                : <Link href="/profile/edit" style={{ textDecoration: 'none' }}><span style={{ fontSize: 12, color: '#D84A1E', fontWeight: 600 }}>{tx.dashboard.addBio}</span></Link>
              }
            </div>
          </div>

        </div>

        {/* ── 뉴스 티커 ── */}
        <div style={{ marginBottom: 28, overflow: 'hidden', borderTop: '1px solid rgba(219,39,119,0.25)', borderBottom: '1px solid rgba(219,39,119,0.25)', background: 'rgba(219,39,119,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 40 }}>
            <div style={{ flexShrink: 0, padding: '0 14px', borderRight: '1px solid rgba(219,39,119,0.25)', height: '100%', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#DB2777', letterSpacing: '0.05em' }}>LIVE</span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <LiveTicker items={[
                { dot: true, text: `FNC Entertainment ${tx.dashboard.tickerFinalPass}` },
                { dot: false, text: `${agencyCount}${tx.dashboard.tickerAgencies}` },
              ]} />
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4">

          {/* ── Auditions ── */}
          <div style={{ marginBottom: 28, background: 'rgba(255,111,60,0.05)', border: '1px solid rgba(255,111,60,0.18)', borderRadius: 22, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#241C15' }}>{tx.dashboard.openAuditions}</h2>
              <Link href="/dashboard/auditions" style={{ fontSize: 13, color: '#D84A1E', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                {tx.common.viewAll} <ChevronRight size={14} />
              </Link>
            </div>

            {recentAuditions.length === 0 ? (
              // 오픈 전이면 카운트다운이, 오픈일이 지났는데 공고가 비면 원래 안내가 뜬다.
              <>
                <AuditionCountdown />
                {daysUntilLaunch() < 0 && (
                  <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '24px 20px', textAlign: 'center', border: '1px solid rgba(36,28,21,0.06)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,111,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#D84A1E' }}>
                      <Megaphone size={20} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontWeight: 700, color: '#241C15', fontSize: 14, marginBottom: 4 }}>{tx.dashboard.noAuditions}</div>
                    <div style={{ fontSize: 12, color: '#8A7F6E' }}>{tx.dashboard.auditionDesc}</div>
                  </div>
                )}
              </>
            ) : (() => {
              const safeIdx = auditionIdx < recentAuditions.length ? auditionIdx : 0
              const a = recentAuditions[safeIdx]
              return (
                <div>
                  <Link href="/dashboard/auditions" style={{ textDecoration: 'none' }}>
                    <div key={auditionIdx} style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(36,28,21,0.07)', background: '#FFFFFF', animation: 'fadeSlide 0.4s ease' }}>
                      <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {a.agency?.logo_url && (
                          <span style={{
                            width: 40, height: 40, borderRadius: 11, overflow: 'hidden', flexShrink: 0,
                            background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.07)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <img src={a.agency.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </span>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#241C15', fontSize: 14, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getAuditionDisplayTitle(a, lang)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: '#8A7F6E' }}>{a.agency?.name ?? tx.auditions.agencyLabel}</span>
                            {a.category.split(',').map(c => (
                              <span key={c} style={{ fontSize: 10, color: '#D84A1E', background: 'rgba(255,111,60,0.12)', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                                {categoryLabel[c.trim()] ?? c.trim()}
                              </span>
                            ))}
                            {a.deadline && <span style={{ fontSize: 11, color: '#8A7F6E' }}>~{a.deadline}</span>}
                          </div>
                        </div>
                        <ChevronRight size={16} color="#C9B79E" />
                      </div>
                    </div>
                  </Link>
                  {recentAuditions.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                      {recentAuditions.map((_, i) => (
                        <button key={i} onClick={() => setAuditionIdx(i)}
                          style={{ width: i === auditionIdx ? 16 : 5, height: 5, borderRadius: 3, border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                            background: i === auditionIdx ? '#D84A1E' : 'rgba(36,28,21,0.15)',
                            padding: 0,
                          }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* ── 내 지원 현황 ── */}
          {/* 지원자가 앱을 다시 여는 가장 큰 이유가 "내 지원 어떻게 됐지?"인데,
              예전 홈에는 이 정보가 아예 없어서 오디션 목록까지 들어가야 보였다. */}
          {applications.total > 0 && (
            <Link href="/dashboard/auditions" style={{ textDecoration: 'none' }}>
              <div style={{ marginBottom: 28, background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.07)', borderRadius: 22, padding: '18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#241C15' }}>{tx.dashboard.myApplications}</h2>
                  <ChevronRight size={16} color="#C9B79E" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { n: applications.total, label: tx.dashboard.appTotal, color: '#241C15' },
                    { n: applications.pending, label: tx.dashboard.appPending, color: '#8A7F6E' },
                    { n: applications.invited, label: tx.dashboard.appInvited, color: '#D84A1E' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(36,28,21,0.03)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.n}</div>
                      <div style={{ fontSize: 11, color: '#8A7F6E', marginTop: 5 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          )}

          {/* Stats grid */}
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#241C15', marginBottom: 14 }}>{tx.dashboard.agencyReactions}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            <Link href="/reactions?tab=bookmarks" style={{ textDecoration: 'none' }}
              onClick={() => { localStorage.setItem('kpick-seen-bm', String(bookmarks)); setUnread(u => ({ ...u, bookmarks: 0 })) }}>
              <div style={{ position: 'relative', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.07)', borderRadius: 20, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,111,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D84A1E', flexShrink: 0 }}>
                  <Bookmark size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#241C15', lineHeight: 1 }}>{bookmarks}</div>
                  <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 5 }}>{tx.dashboard.bookmarks}</div>
                </div>
                {unread.bookmarks > 0 && (
                  <div style={{ position: 'absolute', top: 10, right: 12, background: '#FF6F3C', borderRadius: 10, minWidth: 18, height: 18, fontSize: 10, fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                    +{unread.bookmarks}
                  </div>
                )}
              </div>
            </Link>
            <Link href="/reactions" style={{ textDecoration: 'none' }}>
              <div style={{ position: 'relative', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.07)', borderRadius: 20, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,111,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D84A1E', flexShrink: 0 }}>
                  <MessageCircle size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#241C15', lineHeight: 1 }}>{contacts}</div>
                  <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 5 }}>{tx.dashboard.chats}</div>
                </div>
                {unread.messages > 0 && (
                  <div style={{ position: 'absolute', top: 10, right: 12, background: '#DC2626', borderRadius: 10, minWidth: 18, height: 18, fontSize: 10, fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                    {unread.messages}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* ── My Videos (horizontal scroll) ── */}
        <div style={{ marginBottom: 36 }}>
          <div className="max-w-lg mx-auto px-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#241C15' }}>{tx.dashboard.myVideos}</h2>
            {videoCount > 0 && (
              <Link href="/videos" style={{ fontSize: 13, color: '#D84A1E', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                {tx.common.viewAll} <ChevronRight size={14} />
              </Link>
            )}
          </div>

          <div className="max-w-lg mx-auto no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 16, scrollbarWidth: 'none' }}>
            {recentVideos.slice(0, 5).map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div style={{ width: 152 }}>
                  <div style={{
                    width: 152, height: 102, borderRadius: 16, overflow: 'hidden', marginBottom: 8,
                    background: 'linear-gradient(135deg, #F5EADB, #EFDFC9)',
                    border: '1px solid rgba(36,28,21,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Play size={26} color="#C9B79E" strokeWidth={1.5} />
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(36,28,21,0.35) 0%, transparent 55%)' }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#4A4438', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 152 }}>{v.title}</div>
                </div>
              </Link>
            ))}

            {/* Upload card */}
            <Link href="/videos/upload" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: 152 }}>
                <div style={{
                  width: 152, height: 102, borderRadius: 16, marginBottom: 8,
                  background: 'rgba(255,111,60,0.05)',
                  border: '1.5px dashed rgba(255,111,60,0.32)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Plus size={26} color="#D84A1E" strokeWidth={2} />
                  <span style={{ fontSize: 12, color: '#D84A1E', fontWeight: 700 }}>{tx.nav.upload}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6B6355', fontWeight: 600 }}>{tx.dashboard.addVideo}</div>
              </div>
            </Link>

            <div style={{ width: 6, flexShrink: 0 }} />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4">

          {/* Profile CTA */}
          {!profile?.bio && (
            <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(255,111,60,0.07)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(255,111,60,0.18)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,111,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#D84A1E' }}>
                  <User size={16} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#241C15', fontSize: 13 }}>{tx.dashboard.completeProfile}</div>
                  <div style={{ fontSize: 12, color: '#D84A1E', marginTop: 1 }}>{tx.dashboard.profileDesc}</div>
                </div>
                <ChevronRight size={16} color="#D84A1E" />
              </div>
            </Link>
          )}

        </div>
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}


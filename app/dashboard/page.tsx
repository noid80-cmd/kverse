'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import PushSubscribe from '@/components/PushSubscribe'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone, Video, Bookmark, MessageCircle, User, ChevronRight, Play } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT, LANG_LABELS, LANGS, type Lang } from '@/lib/i18n/translations'

type Profile = { name: string; avatar_url: string | null; bio: string | null }
type RecentVideo = { id: string; title: string; thumbnail_url: string | null }
type RecentAudition = { id: string; title: string; category: string; deadline: string | null; agency: { name: string } | null; translations?: Record<string, { title: string; description: string }> | null }
type PageData = {
  profile: Profile | null
  recentVideos: RecentVideo[]
  videoCount: number
  bookmarks: number
  contacts: number
  recentAuditions: RecentAudition[]
}

const CACHE_KEY = 'kpick-dashboard-v4'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}


function getAuditionDisplayTitle(a: RecentAudition, lang: string) {
  if (lang === 'ko') return a.title
  const key = lang === 'ja' ? 'ja' : (lang === 'zh' || lang === 'zh-TW') ? 'zh-CN' : lang === 'th' ? 'th' : 'en'
  return a.translations?.[key]?.title || a.title
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '방금'
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const { lang, setLang } = useLang()
  const tx = useT(lang)
  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} /> },
  ]

  const [data, setData] = useState<PageData | null>(() => {
    try { const c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : null } catch { return null }
  })
  const [auditionIdx, setAuditionIdx] = useState(0)
  const [langOpen, setLangOpen] = useState(false)
  const [unread, setUnread] = useState({ bookmarks: 0, messages: 0 })
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

      const [{ data: prof }, { data: vids, count: vCount }, { count: bCount }, { data: convs, count: cCount }, { data: auds }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, bio').eq('id', user.id).single(),
        supabase.from('videos').select('id, title, thumbnail_url', { count: 'exact' }).eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(6),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('talent_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact' }).eq('talent_id', user.id).eq('deleted_by_talent', false),
        supabase.from('auditions').select('id, title, category, deadline, translations, agency:agencies(name)').eq('status', 'active').order('created_at', { ascending: false }).limit(8),
      ])

      const fresh: PageData = {
        profile: prof,
        recentVideos: (vids as unknown as RecentVideo[]) ?? [],
        videoCount: vCount ?? 0,
        bookmarks: bCount ?? 0,
        contacts: cCount ?? 0,
        recentAuditions: (auds as unknown as RecentAudition[]) ?? [],
      }
      setData(fresh)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)) } catch {}

      // 미확인 배지
      const lastSeenBm = parseInt(localStorage.getItem('kpick-seen-bm') ?? '0')
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
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PushSubscribe />
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #0891b2', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const { profile, recentVideos, videoCount, bookmarks, contacts, recentAuditions } = data

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', paddingBottom: 112, position: 'relative', overflow: 'hidden' }}>
      <PushSubscribe />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        .no-scrollbar::-webkit-scrollbar{display:none}
      `}</style>

      {/* Atmospheric background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse at center top, rgba(6,182,212,0.10) 0%, rgba(8,145,178,0.04) 40%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.012) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Profile header ── */}
        <div className="max-w-lg mx-auto px-4 pt-10" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
            <Link href="/profile/edit" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 26,
                background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                border: '2px solid rgba(6,182,212,0.4)',
                boxShadow: '0 0 0 4px rgba(6,182,212,0.1), 0 0 24px rgba(6,182,212,0.18)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'white', fontWeight: 900, fontSize: 30 }}>{profile?.name?.[0] ?? 'K'}</span>
                }
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#eeeeff', lineHeight: 1.2 }}>
                  {profile?.name ?? '...'}
                </h1>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setLangOpen(o => !o) }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '5px 8px', fontSize: 12, color: '#8888aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 76, WebkitAppearance: 'none', appearance: 'none' }}>
                    <span style={{ width: 12, flexShrink: 0 }} />
                    <span>{LANG_LABELS[lang as Lang]}</span>
                    <span style={{ width: 12, flexShrink: 0, fontSize: 9, opacity: 0.5, textAlign: 'right' }}>▼</span>
                  </button>
                  {langOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#111118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                      {LANGS.map(l => (
                        <button key={l} onClick={e => { e.stopPropagation(); setLang(l as Lang); setLangOpen(false) }}
                          style={{ display: 'block', width: '100%', padding: '9px 14px', fontSize: 13, textAlign: 'center', cursor: 'pointer', background: l === lang ? 'rgba(6,182,212,0.15)' : 'none', color: l === lang ? '#22d3ee' : '#ccccdd', border: 'none', fontWeight: l === lang ? 700 : 400 }}>
                          {LANG_LABELS[l as Lang]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {profile?.bio
                ? <p style={{ fontSize: 13, color: '#8888aa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{profile.bio}</p>
                : <Link href="/profile/edit" style={{ textDecoration: 'none' }}><span style={{ fontSize: 12, color: '#0891b2', fontWeight: 600 }}>+ 자기소개 추가하기</span></Link>
              }
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Link href="/reactions?tab=bookmarks" style={{ textDecoration: 'none' }}
              onClick={() => { localStorage.setItem('kpick-seen-bm', String(bookmarks)); setUnread(u => ({ ...u, bookmarks: 0 })) }}>
              <div style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee', flexShrink: 0 }}>
                  <Bookmark size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#eeeeff', lineHeight: 1 }}>{bookmarks}</div>
                  <div style={{ fontSize: 12, color: '#555570', marginTop: 5 }}>관심</div>
                </div>
                {unread.bookmarks > 0 && (
                  <div style={{ position: 'absolute', top: 10, right: 12, background: '#22d3ee', borderRadius: 10, minWidth: 18, height: 18, fontSize: 10, fontWeight: 900, color: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                    +{unread.bookmarks}
                  </div>
                )}
              </div>
            </Link>
            <Link href="/reactions" style={{ textDecoration: 'none' }}>
              <div style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee', flexShrink: 0 }}>
                  <MessageCircle size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#eeeeff', lineHeight: 1 }}>{contacts}</div>
                  <div style={{ fontSize: 12, color: '#555570', marginTop: 5 }}>채팅</div>
                </div>
                {unread.messages > 0 && (
                  <div style={{ position: 'absolute', top: 10, right: 12, background: '#f87171', borderRadius: 10, minWidth: 18, height: 18, fontSize: 10, fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
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
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>내 영상</h2>
            {videoCount > 0 && (
              <Link href="/videos" style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                전체보기 <ChevronRight size={14} />
              </Link>
            )}
          </div>

          <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 16, scrollbarWidth: 'none' }}>
            {recentVideos.slice(0, 5).map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div style={{ width: 152 }}>
                  <div style={{
                    width: 152, height: 102, borderRadius: 16, overflow: 'hidden', marginBottom: 8,
                    background: 'linear-gradient(135deg, #111825, #0d1520)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Play size={26} color="#333350" strokeWidth={1.5} />
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)' }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#cccce8', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 152 }}>{v.title}</div>
                </div>
              </Link>
            ))}

            {/* Upload card */}
            <Link href="/videos/upload" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: 152 }}>
                <div style={{
                  width: 152, height: 102, borderRadius: 16, marginBottom: 8,
                  background: 'rgba(6,182,212,0.05)',
                  border: '1.5px dashed rgba(6,182,212,0.28)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Plus size={26} color="#22d3ee" strokeWidth={2} />
                  <span style={{ fontSize: 12, color: '#22d3ee', fontWeight: 700 }}>업로드</span>
                </div>
                <div style={{ fontSize: 12, color: '#444460', fontWeight: 600 }}>새 영상 추가</div>
              </div>
            </Link>

            <div style={{ width: 6, flexShrink: 0 }} />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4">

          {/* ── Auditions ── */}
          <div style={{ marginBottom: 28, background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 22, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>열린 오디션</h2>
              <Link href="/dashboard/auditions" style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                전체보기 <ChevronRight size={14} />
              </Link>
            </div>

            {recentAuditions.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 18, padding: '24px 20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#22d3ee' }}>
                  <Megaphone size={20} strokeWidth={1.5} />
                </div>
                <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 4 }}>현재 열린 오디션이 없어요</div>
                <div style={{ fontSize: 12, color: '#555570' }}>새 오디션이 열리면 알려드릴게요</div>
              </div>
            ) : (() => {
              const a = recentAuditions[auditionIdx]
              return (
                <div>
                  <Link href="/dashboard/auditions" style={{ textDecoration: 'none' }}>
                    <div key={auditionIdx} style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', animation: 'fadeSlide 0.4s ease' }}>
                      <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getAuditionDisplayTitle(a, lang)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: '#8888aa' }}>{a.agency?.name ?? '기획사'}</span>
                            {a.category.split(',').map(c => (
                              <span key={c} style={{ fontSize: 10, color: '#22d3ee', background: 'rgba(6,182,212,0.12)', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                                {categoryLabel[c.trim()] ?? c.trim()}
                              </span>
                            ))}
                            {a.deadline && <span style={{ fontSize: 11, color: '#555570' }}>~{a.deadline}</span>}
                          </div>
                        </div>
                        <ChevronRight size={16} color="#333350" />
                      </div>
                    </div>
                  </Link>
                  {recentAuditions.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                      {recentAuditions.map((_, i) => (
                        <button key={i} onClick={() => setAuditionIdx(i)}
                          style={{ width: i === auditionIdx ? 16 : 5, height: 5, borderRadius: 3, border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                            background: i === auditionIdx ? '#22d3ee' : 'rgba(255,255,255,0.15)',
                            padding: 0,
                          }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Profile CTA */}
          {!profile?.bio && (
            <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(6,182,212,0.06)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#22d3ee' }}>
                  <User size={16} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 13 }}>프로필을 완성해보세요</div>
                  <div style={{ fontSize: 12, color: '#22d3ee', marginTop: 1 }}>자기소개를 추가하면 기획사에 더 잘 보여요</div>
                </div>
                <ChevronRight size={16} color="#22d3ee" />
              </div>
            </Link>
          )}

        </div>
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

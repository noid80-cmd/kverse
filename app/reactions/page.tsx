'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import PushSubscribe from '@/components/PushSubscribe'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, Compass, Plus, Bell, Megaphone, MessageCircle, Bookmark, Trash2, Video, BellOff, BellRing, X } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

type Conversation = {
  id: string; created_at: string; agency_member_id: string
  agency_member: { name: string; avatar_url: string | null } | null
  lastMessage?: string
}

type Bookmark = {
  id: string; created_at: string; note: string | null
  video: { id: string; title: string } | null
  agency_member: { name: string } | null
}

const CACHE_KEY = 'kpick-reactions'

export default function ReactionsPage() {
  const { lang } = useLang()
  const tx = useT(lang)

  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} /> },
  ]

  const [pageData, setPageData] = useState<{ convs: Conversation[]; bookmarks: Bookmark[] } | null>(() => {
    try { const c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : null } catch { return null }
  })
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'contacts' | 'bookmarks'>('contacts')
  const [toast, setToast] = useState<string | null>(null)
  const [notifModal, setNotifModal] = useState(false)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | null>(null)

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission)
  }, [])
  const userIdRef = useRef<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function load(userId: string) {
    const [{ data: convData }, { data: b }] = await Promise.all([
      supabase.from('conversations')
        .select('id, created_at, agency_member_id, agency_member:profiles!agency_member_id(name, avatar_url)')
        .eq('talent_id', userId).neq('deleted_by_talent', true).order('created_at', { ascending: false }),
      supabase.from('bookmarks').select('id, created_at, note, video:videos(id, title), agency_member:profiles!agency_member_id(name)')
        .eq('talent_id', userId).order('created_at', { ascending: false }),
    ])

    const list = (convData as unknown as Conversation[]) ?? []
    if (list.length > 0) {
      const ids = list.map(c => c.id)
      const { data: lastMsgs } = await supabase
        .from('messages').select('conversation_id, content').in('conversation_id', ids).order('created_at', { ascending: false })
      const lastMap: Record<string, string> = {}
      lastMsgs?.forEach(m => { if (!lastMap[m.conversation_id]) lastMap[m.conversation_id] = m.content })
      list.forEach(c => { c.lastMessage = lastMap[c.id] })
    }

    const fresh = { convs: list, bookmarks: (b as unknown as Bookmark[]) ?? [] }
    setPageData(fresh)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)) } catch {}

    if (list.length > 0) {
      const profileIds = list.map(c => c.agency_member_id)
      const { data: ams } = await supabase
        .from('agency_members').select('profile_id, agency_id').in('profile_id', profileIds)
      if (ams && ams.length > 0) {
        const agencyIds = ams.map(a => a.agency_id)
        const { data: agencies } = await supabase
          .from('agencies').select('id, is_verified').in('id', agencyIds)
        const verifiedAgencyIds = new Set((agencies ?? []).filter(a => a.is_verified).map(a => a.id))
        const agencyIdByProfile: Record<string, string> = {}
        ams.forEach(a => { agencyIdByProfile[a.profile_id] = a.agency_id })
        const verified = new Set(profileIds.filter(pid => verifiedAgencyIds.has(agencyIdByProfile[pid])))
        setVerifiedIds(verified)
      }
    }
  }

  async function deleteConv(convId: string) {
    if (!confirm(tx.reactions.deleteConfirm)) return
    const { error } = await supabase.from('conversations').update({ deleted_by_talent: true }).eq('id', convId)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setPageData(prev => {
      if (!prev) return prev
      const newData = { ...prev, convs: prev.convs.filter(c => c.id !== convId) }
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(newData)) } catch {}
      return newData
    })
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    function onVisible() {
      if (document.visibilityState === 'visible' && userIdRef.current) {
        load(userIdRef.current)
      }
    }

    async function init() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }
      userIdRef.current = user.id
      await load(user.id)

      document.addEventListener('visibilitychange', onVisible)
      pollInterval = setInterval(() => {
        if (userIdRef.current) load(userIdRef.current)
      }, 30000)

      channel = supabase.channel(`reactions-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookmarks', filter: `talent_id=eq.${user.id}` },
          () => { load(user.id); showToast(tx.reactions.newInterestToast) })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `talent_id=eq.${user.id}` },
          () => { load(user.id); showToast(tx.reactions.agencyChatToast) })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          () => { if (userIdRef.current) load(userIdRef.current) })
        .subscribe()
    }

    init()
    return () => {
      channel && supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      pollInterval && clearInterval(pollInterval)
    }
  }, [])

  if (!pageData) return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #0891b2', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const { convs, bookmarks } = pageData

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <PushSubscribe />

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: '#1a1a25', color: '#eeeeff', padding: '12px 20px', borderRadius: 14,
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap', animation: 'fadeIn 0.3s ease',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>

      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111118', border: '1px solid rgba(255,255,255,0.08)', color: '#eeeeff', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff', flex: 1 }}>{tx.reactions.pageTitle}</h1>
          <button onClick={() => setNotifModal(true)} style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#111118', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', flexShrink: 0,
            color: notifPerm === 'granted' ? '#22d3ee' : notifPerm === 'denied' ? '#f87171' : '#555570',
          }}>
            {notifPerm === 'denied' ? <BellOff size={18} strokeWidth={1.8} /> : <BellRing size={18} strokeWidth={1.8} />}
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#8888aa', marginBottom: 20 }}>{tx.reactions.pageDesc}</p>

        <div style={{ display: 'flex', background: '#111118', borderRadius: 16, padding: 4, marginBottom: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['contacts', 'bookmarks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14, transition: 'all 0.15s', cursor: 'pointer',
                background: tab === t ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'transparent',
                color: tab === t ? 'white' : '#555570',
              }}>
              {t === 'contacts' ? `${tx.dashboard.chats} ${convs.length}` : `${tx.dashboard.bookmarks} ${bookmarks.length}`}
            </button>
          ))}
        </div>

        {tab === 'contacts' ? (
          convs.length === 0 ? (
            <div style={{ background: '#111118', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#22d3ee' }}>
                <MessageCircle size={22} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 700, color: '#eeeeff', marginBottom: 4 }}>{tx.reactions.noChats}</div>
              <div style={{ fontSize: 13, color: '#555570' }}>{tx.reactions.noChatsDesc}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {convs.map(c => (
                <div key={c.id} style={{ background: '#0f1419', borderRadius: 18, border: '1px solid rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => router.push(`/chat/${c.id}`)}
                    style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 16, flexShrink: 0, overflow: 'hidden',
                      background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {c.agency_member?.avatar_url
                        ? <img src={c.agency_member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{c.agency_member?.name?.[0] ?? 'A'}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: '#eeeeff', fontSize: 15 }}>{c.agency_member?.name ?? tx.auditions.agencyLabel}</span>
                        {verifiedIds.has(c.agency_member_id) && (
                          <span style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>{tx.common.verified}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#555570', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {c.lastMessage ?? tx.reactions.startChat}
                      </div>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#333350" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button onClick={() => deleteConv(c.id)}
                    style={{ padding: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#333350', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={16} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          bookmarks.length === 0 ? (
            <div style={{ background: '#111118', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#22d3ee' }}>
                <Bookmark size={22} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 700, color: '#eeeeff', marginBottom: 4 }}>{tx.reactions.noBookmarksYet}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookmarks.map(b => (
                <Link key={b.id} href={b.video ? `/videos/${b.video.id}` : '#'} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#121018', borderRadius: 18, padding: '16px 20px', border: '1px solid rgba(168,85,247,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Bookmark size={14} strokeWidth={2} color="#22d3ee" fill="#22d3ee" />
                      <span style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14 }}>{b.agency_member?.name ?? tx.auditions.agencyLabel}</span>
                      <span style={{ fontSize: 12, color: '#555570', marginLeft: 'auto' }}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {b.video && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#22d3ee', fontWeight: 600 }}>
                        <Video size={13} strokeWidth={2} />
                        {b.video.title}
                      </div>
                    )}
                    {b.note && <div style={{ fontSize: 13, color: '#8888aa', marginTop: 6, fontStyle: 'italic' }}>{b.note}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      <BottomNav items={talentNav} />

      {notifModal && (
        <>
          <div onClick={() => setNotifModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
            background: '#13131e', borderRadius: '24px 24px 0 0',
            padding: '28px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)', maxWidth: 480, margin: '0 auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 24px' }} />
            <button onClick={() => setNotifModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#555570' }}>
              <X size={16} strokeWidth={2} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: notifPerm === 'granted' ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : notifPerm === 'denied' ? 'rgba(248,113,113,0.15)' : '#1a1a25',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {notifPerm === 'denied'
                  ? <BellOff size={24} strokeWidth={1.8} color="#f87171" />
                  : <BellRing size={24} strokeWidth={1.8} color={notifPerm === 'granted' ? 'white' : '#555570'} />
                }
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#eeeeff', marginBottom: 3 }}>알림 설정</div>
                <div style={{ fontSize: 13, color: notifPerm === 'granted' ? '#22d3ee' : notifPerm === 'denied' ? '#f87171' : '#555570' }}>
                  {notifPerm === 'granted' ? '알림이 켜져 있어요' : notifPerm === 'denied' ? '알림이 차단되어 있어요' : '알림이 꺼져 있어요'}
                </div>
              </div>
            </div>

            {notifPerm === 'denied' ? (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: '#fca5a5', fontWeight: 700, marginBottom: 10 }}>브라우저 설정에서 직접 허용해주세요</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Chrome', desc: '주소창 왼쪽 자물쇠 🔒 → 알림 → 허용' },
                    { label: 'Safari (iOS)', desc: '설정 앱 → Safari → kpick.app → 알림 허용' },
                  ].map(item => (
                    <div key={item.label}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>{item.label}</span>
                      <p style={{ fontSize: 12, color: '#8888aa', margin: '2px 0 0' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : notifPerm === 'granted' ? (
              <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: '#22d3ee', margin: 0 }}>기획사 관심, 채팅, 오디션 공고 알림을 받고 있어요.</p>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <button onClick={async () => {
                  const perm = await Notification.requestPermission()
                  setNotifPerm(perm)
                }} style={{
                  width: '100%', padding: '15px',
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(6,182,212,0.35)',
                }}>
                  알림 켜기
                </button>
              </div>
            )}

            <button onClick={() => setNotifModal(false)} style={{ width: '100%', padding: '13px', background: 'none', border: 'none', color: '#555570', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              닫기
            </button>
          </div>
        </>
      )}
    </div>
  )
}

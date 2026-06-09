'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import PushSubscribe from '@/components/PushSubscribe'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, Compass, Plus, Bell, Megaphone, MessageCircle, Bookmark, Trash2, Video } from 'lucide-react'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: <Home size={22} strokeWidth={1.8} /> },
  { href: '/explore', label: '탐색', icon: <Compass size={22} strokeWidth={1.8} /> },
  { href: '/dashboard/auditions', label: '오디션', icon: <Megaphone size={22} strokeWidth={1.8} /> },
  { href: '/videos/upload', label: '올리기', icon: <Plus size={22} strokeWidth={1.8} /> },
  { href: '/reactions', label: '반응', icon: <Bell size={22} strokeWidth={1.8} /> },
]

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

const CACHE_KEY = 'kverse-reactions'

export default function ReactionsPage() {
  const [pageData, setPageData] = useState<{ convs: Conversation[]; bookmarks: Bookmark[] } | null>(() => {
    try { const c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : null } catch { return null }
  })
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'contacts' | 'bookmarks'>('contacts')
  const [toast, setToast] = useState<string | null>(null)
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
        .eq('talent_id', userId).eq('deleted_by_talent', false).order('created_at', { ascending: false }),
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
    if (!confirm('내 채팅 목록에서 삭제할까요?')) return
    const { error } = await supabase.from('conversations').update({ deleted_by_talent: true }).eq('id', convId)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setPageData(prev => {
      if (!prev) return prev
      const newData = { ...prev, convs: prev.convs.filter(c => c.id !== convId) }
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(newData)) } catch {}
      try {
        const dash = localStorage.getItem('kverse-dashboard')
        if (dash) {
          const d = JSON.parse(dash)
          d.contacts = Math.max((d.contacts ?? 1) - 1, 0)
          localStorage.setItem('kverse-dashboard', JSON.stringify(d))
        }
      } catch {}
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
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'bookmarks',
          filter: `talent_id=eq.${user.id}`,
        }, () => {
          load(user.id)
          showToast('새로운 관심 표시가 왔어요!')
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'conversations',
          filter: `talent_id=eq.${user.id}`,
        }, () => {
          load(user.id)
          showToast('기획사에서 채팅을 시작했어요!')
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
        }, () => {
          if (userIdRef.current) load(userIdRef.current)
        })
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
    <div style={{ minHeight: '100vh', background: '#f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e0e0f0', borderTop: '3px solid #6366f1', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const { convs, bookmarks } = pageData

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <PushSubscribe />

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: '#1e1b4b', color: 'white', padding: '12px 20px', borderRadius: 14,
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap', animation: 'fadeIn 0.3s ease',
        }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>

      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>기획사 반응</h1>
        <p style={{ fontSize: 13, color: '#8b8baa', marginBottom: 20 }}>내 영상에 관심을 보인 기획사들</p>

        <div style={{ display: 'flex', background: '#fff', borderRadius: 16, padding: 4, marginBottom: 20, border: '1px solid #e8e8f2' }}>
          {(['contacts', 'bookmarks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14, transition: 'all 0.15s', cursor: 'pointer',
                background: tab === t ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: tab === t ? 'white' : '#8b8baa',
              }}>
              {t === 'contacts' ? `채팅 ${convs.length}` : `북마크 ${bookmarks.length}`}
            </button>
          ))}
        </div>

        {tab === 'contacts' ? (
          convs.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#6366f1' }}>
                <MessageCircle size={22} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 대화가 없어요</div>
              <div style={{ fontSize: 13, color: '#8b8baa' }}>영상을 올리면 기획사에서 채팅이 올 수 있어요</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {convs.map(c => (
                <div key={c.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => router.push(`/chat/${c.id}`)}
                    style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 16, flexShrink: 0, overflow: 'hidden',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {c.agency_member?.avatar_url
                        ? <img src={c.agency_member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{c.agency_member?.name?.[0] ?? 'A'}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 15 }}>{c.agency_member?.name ?? '기획사'}</span>
                        {verifiedIds.has(c.agency_member_id) && (
                          <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>인증</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#8b8baa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {c.lastMessage ?? '대화를 시작해보세요'}
                      </div>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button onClick={() => deleteConv(c.id)}
                    style={{ padding: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={16} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          bookmarks.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#6366f1' }}>
                <Bookmark size={22} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 관심 표시가 없어요</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookmarks.map(b => (
                <Link key={b.id} href={b.video ? `/videos/${b.video.id}` : '#'} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Bookmark size={14} strokeWidth={2} color="#6366f1" fill="#6366f1" />
                      <span style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{b.agency_member?.name ?? '담당자'}</span>
                      <span style={{ fontSize: 12, color: '#8b8baa', marginLeft: 'auto' }}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {b.video && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6366f1', fontWeight: 600 }}>
                        <Video size={13} strokeWidth={2} />
                        {b.video.title}
                      </div>
                    )}
                    {b.note && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>{b.note}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

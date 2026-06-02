'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/explore', label: '탐색', icon: '🔍' },
  { href: '/videos/upload', label: '올리기', icon: '➕' },
  { href: '/reactions', label: '반응', icon: '⭐' },
  { href: '/profile/edit', label: '프로필', icon: '👤' },
]

type Conversation = {
  id: string; created_at: string
  agency_member: { name: string; avatar_url: string | null } | null
  lastMessage?: string
}

type Bookmark = {
  id: string; created_at: string; note: string | null
  video: { id: string; title: string } | null
  agency_member: { name: string } | null
}

export default function ReactionsPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [tab, setTab] = useState<'contacts' | 'bookmarks'>('contacts')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [{ data: convData }, { data: b }] = await Promise.all([
        supabase.from('conversations')
          .select('id, created_at, agency_member:profiles!agency_member_id(name, avatar_url)')
          .eq('talent_id', user.id).order('created_at', { ascending: false }),
        supabase.from('bookmarks').select('id, created_at, note, video:videos(id, title), agency_member:profiles!agency_member_id(name)')
          .eq('talent_id', user.id).order('created_at', { ascending: false }),
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

      setConvs(list)
      setBookmarks((b as unknown as Bookmark[]) ?? [])
    }
    load()
  }, [])

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>기획사 반응</h1>
        <p style={{ fontSize: 13, color: '#8b8baa', marginBottom: 20 }}>내 영상에 관심을 보인 기획사들</p>

        {/* 탭 */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: 16, padding: 4, marginBottom: 20, border: '1px solid #e8e8f2' }}>
          {(['contacts', 'bookmarks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14, transition: 'all 0.15s',
                background: tab === t ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: tab === t ? 'white' : '#8b8baa',
              }}>
              {t === 'contacts' ? `💬 채팅 ${convs.length}` : `⭐ 북마크 ${bookmarks.length}`}
            </button>
          ))}
        </div>

        {tab === 'contacts' ? (
          convs.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 대화가 없어요</div>
              <div style={{ fontSize: 13, color: '#8b8baa' }}>영상을 올리면 기획사에서 채팅이 올 수 있어요</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {convs.map(c => (
                <button key={c.id} onClick={() => router.push(`/chat/${c.id}`)}
                  style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%', cursor: 'pointer' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 16, flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.agency_member?.avatar_url
                      ? <img src={c.agency_member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{c.agency_member?.name?.[0] ?? '🏢'}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 15, marginBottom: 3 }}>{c.agency_member?.name ?? '기획사'}</div>
                    <div style={{ fontSize: 13, color: '#8b8baa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {c.lastMessage ?? '대화를 시작해보세요'}
                    </div>
                  </div>
                  <span style={{ color: '#c0c0d8', fontSize: 18, flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          )
        ) : (
          bookmarks.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
              <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 관심 표시가 없어요</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookmarks.map(b => (
                <Link key={b.id} href={b.video ? `/videos/${b.video.id}` : '#'} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>⭐</span>
                      <span style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{b.agency_member?.name ?? '담당자'}</span>
                      <span style={{ fontSize: 12, color: '#8b8baa', marginLeft: 'auto' }}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {b.video && <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>🎬 {b.video.title}</div>}
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

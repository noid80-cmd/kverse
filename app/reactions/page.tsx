'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/videos', label: '내 영상', icon: '🎬' },
  { href: '/videos/upload', label: '올리기', icon: '➕' },
  { href: '/reactions', label: '반응', icon: '⭐' },
  { href: '/profile/edit', label: '프로필', icon: '👤' },
]

type Contact = {
  id: string; message: string; status: string; created_at: string
  agency: { name: string; logo_url: string | null }
}

type Bookmark = {
  id: string; created_at: string; note: string | null
  video: { id: string; title: string } | null
  agency_member: { name: string } | null
}

export default function ReactionsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [tab, setTab] = useState<'contacts' | 'bookmarks'>('contacts')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [{ data: c }, { data: b }] = await Promise.all([
        supabase.from('contacts').select('id, message, status, created_at, agency:agencies(name, logo_url)')
          .eq('talent_id', user.id).order('created_at', { ascending: false }),
        supabase.from('bookmarks').select('id, created_at, note, video:videos(id, title), agency_member:profiles(name)')
          .eq('talent_id', user.id).order('created_at', { ascending: false }),
      ])
      setContacts((c as unknown as Contact[]) ?? [])
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
              {t === 'contacts' ? `💌 연락 ${contacts.length}` : `⭐ 북마크 ${bookmarks.length}`}
            </button>
          ))}
        </div>

        {tab === 'contacts' ? (
          contacts.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💌</div>
              <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 연락이 없어요</div>
              <div style={{ fontSize: 13, color: '#8b8baa' }}>영상을 올리면 기획사에서 연락이 올 수 있어요</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {contacts.map(c => (
                <div key={c.id} style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {c.agency?.logo_url
                        ? <img src={c.agency.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'white', fontWeight: 900, fontSize: 14 }}>🏢</span>
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{c.agency?.name ?? '기획사'}</div>
                      <div style={{ fontSize: 11, color: '#8b8baa' }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</div>
                    </div>
                    {c.status === 'sent' && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, background: '#fef9c3', color: '#d97706', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>새 연락</span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, background: '#f8f7ff', borderRadius: 12, padding: '12px 14px' }}>{c.message}</p>
                </div>
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
                <div key={b.id} style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>⭐</span>
                    <span style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{b.agency_member?.name ?? '담당자'}</span>
                    <span style={{ fontSize: 12, color: '#8b8baa', marginLeft: 'auto' }}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {b.video && <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>🎬 {b.video.title}</div>}
                  {b.note && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>{b.note}</div>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

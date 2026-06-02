'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'

type Contact = {
  id: string; message: string; status: string; created_at: string
  talent: { name: string; avatar_url: string | null } | null
}

export default function AgencyContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data } = await supabase.from('contacts').select(`
        id, message, status, created_at,
        talent:profiles!talent_id(name, avatar_url)
      `).eq('sender_id', user.id).order('created_at', { ascending: false })

      setContacts((data as unknown as Contact[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>연락 내역</h1>
        <p style={{ fontSize: 13, color: '#8b8baa', marginBottom: 20 }}>지망생에게 보낸 연락</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : contacts.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💌</div>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 6 }}>아직 연락한 내역이 없어요</div>
            <div style={{ fontSize: 13, color: '#8b8baa' }}>영상을 보고 마음에 드는 지망생에게 연락해보세요</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {contacts.map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.talent?.avatar_url
                      ? <img src={c.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{c.talent?.name?.[0] ?? '?'}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{c.talent?.name ?? '지망생'}</div>
                    <div style={{ fontSize: 11, color: '#8b8baa' }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                    background: c.status === 'read' ? '#f0fdf4' : c.status === 'replied' ? '#ede9fe' : '#fef9c3',
                    color: c.status === 'read' ? '#16a34a' : c.status === 'replied' ? '#7c3aed' : '#d97706',
                  }}>
                    {c.status === 'read' ? '읽음' : c.status === 'replied' ? '답장함' : '전송됨'}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, background: '#f8f7ff', borderRadius: 12, padding: '12px 14px' }}>{c.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AgencyNav />
    </div>
  )
}

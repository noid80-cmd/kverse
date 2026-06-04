'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import { useRouter } from 'next/navigation'
import { MessageCircle, Trash2 } from 'lucide-react'

type Conversation = {
  id: string; created_at: string
  talent: { name: string; avatar_url: string | null } | null
  lastMessage?: string
}

export default function AgencyContactsPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  async function deleteConv(convId: string) {
    if (!confirm('내 채팅 목록에서 삭제할까요?')) return
    const { error } = await supabase.from('conversations').update({ deleted_by_agency: true }).eq('id', convId)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setConvs(prev => prev.filter(c => c.id !== convId))
  }

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'agency') { window.location.href = '/dashboard'; return }

      const { data } = await supabase
        .from('conversations')
        .select('id, created_at, talent:profiles!talent_id(name, avatar_url)')
        .eq('agency_member_id', user.id).eq('deleted_by_agency', false)
        .order('created_at', { ascending: false })

      const list = (data as unknown as Conversation[]) ?? []

      if (list.length > 0) {
        const ids = list.map(c => c.id)
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false })

        const lastMap: Record<string, string> = {}
        lastMsgs?.forEach(m => { if (!lastMap[m.conversation_id]) lastMap[m.conversation_id] = m.content })
        list.forEach(c => { c.lastMessage = lastMap[c.id] })
      }

      setConvs(list)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>채팅</h1>
        <p style={{ fontSize: 13, color: '#8b8baa', marginBottom: 20 }}>지망생과의 대화</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : convs.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#6366f1' }}>
              <MessageCircle size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 6 }}>아직 대화가 없어요</div>
            <div style={{ fontSize: 13, color: '#8b8baa' }}>영상을 보고 마음에 드는 지망생에게 채팅을 시작해보세요</div>
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
                    {c.talent?.avatar_url
                      ? <img src={c.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{c.talent?.name?.[0] ?? '?'}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 15, marginBottom: 3 }}>{c.talent?.name ?? '지망생'}</div>
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
        )}
      </div>
      <AgencyNav />
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

type Message = { id: string; content: string; sender_id: string; created_at: string; is_read: boolean }
type Conversation = {
  id: string; agency_member_id: string; talent_id: string
  agency_member: { name: string; avatar_url: string | null } | null
  talent: { name: string; avatar_url: string | null } | null
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [conv, setConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [input, setInput] = useState('')
  const [myId, setMyId] = useState('')
  const [sending, setSending] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [agencyName, setAgencyName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null)
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: convData } = await supabase
        .from('conversations')
        .select('id, agency_member_id, talent_id, agency_member:profiles!agency_member_id(name, avatar_url), talent:profiles!talent_id(name, avatar_url)')
        .eq('id', id)
        .single()
      if (!convData) { router.back(); return }

      const conv = convData as unknown as Conversation
      const [{ data: am }, { data: msgs }] = await Promise.all([
        supabase.from('agency_members').select('agency_id').eq('profile_id', conv.agency_member_id).single(),
        supabase.from('messages').select('id, content, sender_id, created_at, is_read').eq('conversation_id', id).order('created_at', { ascending: true }),
      ])

      if (am?.agency_id) {
        const { data: ag } = await supabase
          .from('agencies').select('name, is_verified').eq('id', am.agency_id).single()
        if (ag) { setIsVerified(ag.is_verified); setAgencyName(ag.name) }
      }

      setMessages(msgs ?? [])
      setConv(conv)

      await supabase.from('messages')
        .update({ is_read: true })
        .eq('conversation_id', id)
        .neq('sender_id', user.id)
        .eq('is_read', false)
    }
    load()

    const user = (await supabase.auth.getSession()).data.session?.user
    const channel = supabase.channel(`chat:${id}`, { config: { presence: { key: user?.id ?? '' } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => (prev ?? []).some(m => m.id === msg.id) ? prev : [...(prev ?? []), msg])
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>()
        const ids = new Set(Object.values(state).flat().map(p => p.user_id))
        setActiveUsers(ids)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({ user_id: user.id })
        }
      })

    const poll = setInterval(async () => {
      const { data } = await supabase.from('messages').select('id, content, sender_id, created_at, is_read')
        .eq('conversation_id', id).order('created_at', { ascending: true })
      if (data) setMessages(data)
    }, 3000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!input.trim() || sending || !myId) return
    setSending(true)
    const content = input.trim()
    setInput('')
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...(prev ?? []), { id: tempId, content, sender_id: myId, created_at: new Date().toISOString(), is_read: false }])
    const { error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: myId, content })
    if (error) {
      setMessages(prev => (prev ?? []).filter(m => m.id !== tempId))
      setInput(content)
      alert('전송 실패: ' + error.message)
    } else if (conv) {
      const recipientId = myId === conv.talent_id ? conv.agency_member_id : conv.talent_id
      if (!activeUsers.has(recipientId)) {
        const senderName = myId === conv.talent_id
          ? (conv.talent?.name ?? '지망생')
          : (agencyName || conv.agency_member?.name || '기획사')
        fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: recipientId, title: `💬 ${senderName}`, body: content.length > 60 ? content.slice(0, 60) + '...' : content, url: `/chat/${id}` }) })
      }
    }
    setSending(false)
  }

  async function deleteMessage(msgId: string) {
    await supabase.from('messages').delete().eq('id', msgId)
    setMessages(prev => (prev ?? []).filter(m => m.id !== msgId))
    setSelectedMsgId(null)
  }

  async function deleteConversation() {
    if (!confirm('내 채팅 목록에서 삭제할까요?')) return
    setDeleting(true)
    const isAgency = conv && myId === conv.agency_member_id
    await supabase.from('conversations')
      .update(isAgency ? { deleted_by_agency: true } : { deleted_by_talent: true })
      .eq('id', id)
    router.back()
  }

  const other = conv ? (myId === conv.talent_id ? conv.agency_member : conv.talent) : null

  if (!conv) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f8' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e0e0f0', borderTop: '3px solid #6366f1', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f0f0f8' }}>
      <div style={{
        flexShrink: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e8e8f2', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8b8baa', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
        <div style={{
          width: 40, height: 40, borderRadius: 13, overflow: 'hidden', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {other?.avatar_url
            ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{other?.name?.[0] ?? '?'}</span>
          }
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 17 }}>
              {conv && myId === conv.talent_id && agencyName ? agencyName : other?.name ?? '...'}
            </span>
            {isVerified && conv && myId === conv.talent_id && (
              <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>인증</span>
            )}
          </div>
          {conv && myId === conv.talent_id && agencyName && other?.name && (
            <span style={{ fontSize: 12, color: '#8b8baa' }}>{other.name}</span>
          )}
        </div>
        <button onClick={deleteConversation} disabled={deleting}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 10, color: '#c0b0cc', fontSize: 20 }}
          title="대화 삭제">
          🗑️
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {messages !== null && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#b0b0cc', fontSize: 13, marginTop: 60 }}>첫 메시지를 보내보세요</div>
        )}
        {(messages ?? []).map(msg => {
          const isMine = msg.sender_id === myId
          const isSelected = selectedMsgId === msg.id
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}
              onClick={() => isMine ? setSelectedMsgId(isSelected ? null : msg.id) : setSelectedMsgId(null)}>
              <div style={{
                maxWidth: '72%', padding: '10px 14px',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isMine ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
                color: isMine ? 'white' : '#1e1b4b',
                fontSize: 15, lineHeight: 1.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                opacity: isSelected ? 0.85 : 1,
                cursor: isMine ? 'pointer' : 'default',
              }}>
                {msg.content}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {isSelected && (
                <button onClick={e => { e.stopPropagation(); deleteMessage(msg.id) }}
                  style={{ marginTop: 4, fontSize: 12, color: '#ef4444', background: '#fff', border: '1px solid #fca5a5', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                  삭제
                </button>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        flexShrink: 0,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid #e8e8f2',
        padding: '10px 16px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'flex', gap: 10,
      }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="메시지 입력..."
          style={{ flex: 1, background: '#f0f0f8', border: 'none', borderRadius: 22, padding: '11px 16px', fontSize: 15, color: '#1e1b4b', outline: 'none' }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e0e0f0',
            color: 'white', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>↑</button>
      </div>
    </div>
  )
}

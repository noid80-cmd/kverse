'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getTheme, GroupTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'

type Account = {
  id: string
  username: string
  groups: { name: string }
}

type ConvAccount = {
  id: string
  username: string
  groups: { name: string }
}

type Conversation = {
  id: string
  account1: ConvAccount
  account2: ConvAccount
}

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
}

export default function DMChatPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<Account | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [theme, setTheme] = useState<GroupTheme | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const activeId = getActiveAccountId()
      let q = supabase.from('accounts').select('*, groups(name)').eq('user_id', user.id)
      if (activeId) q = q.eq('id', activeId)
      const { data: acc } = await q.limit(1).single()

      if (!acc) { router.push('/select-account'); return }
      setAccount(acc)
      setTheme(getTheme(acc.groups.name))

      const { data: conv } = await supabase
        .from('conversations')
        .select('*, account1:account1_id(id, username, groups(name)), account2:account2_id(id, username, groups(name))')
        .eq('id', id)
        .single()

      if (!conv) { router.push('/dm'); return }
      setConversation(conv as Conversation)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])
      setLoading(false)
    }
    load()
  }, [id])

  // 실시간 메시지 구독
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!account || !content.trim() || sending) return
    const text = content.trim()
    setSending(true)
    setContent('')

    await supabase.from('messages').insert({
      conversation_id: id,
      sender_id: account.id,
      content: text,
    })

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    setSending(false)
    inputRef.current?.focus()
  }

  function getOther() {
    if (!conversation || !account) return null
    return conversation.account1.id === account.id ? conversation.account2 : conversation.account1
  }

  function timeStr(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const other = getOther()
  const otherTheme = other ? getTheme((other.groups as any)?.name || '') : null
  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">Loading Universe...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* 헤더 */}
      <nav className="flex-shrink-0 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center gap-4 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">Home</Link>
          <Link href="/dm" className="text-white/40 hover:text-white transition text-sm">←</Link>
        </div>
        {other && otherTheme && (
          <>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white text-sm flex-shrink-0"
              style={{ background: otherTheme.gradient }}
            >
              {other.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">@{other.username}</p>
              <p className="text-xs" style={{ color: `${accentColor}70` }}>
                {groupDisplayName((other.groups as any)?.name || '', locale)} · {otherTheme.emoji} {worldName(otherTheme, locale)}
              </p>
            </div>
          </>
        )}
      </nav>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-white/20 text-sm mt-20">
            {t('dm.firstMessage')}
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === account?.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[72%]">
                <div
                  className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
                  style={isMine ? {
                    background: theme?.gradient,
                    color: 'white',
                    borderBottomRightRadius: '6px',
                  } : {
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                    borderBottomLeftRadius: '6px',
                  }}
                >
                  {msg.content}
                </div>
                <p className={`text-white/20 text-xs mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {timeStr(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="flex-shrink-0 border-t border-white/10 px-6 py-4 bg-black/80 backdrop-blur">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={t('dm.placeholder')}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition text-sm"
          />
          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="px-5 py-2.5 rounded-xl text-white font-medium text-sm transition disabled:opacity-40 flex-shrink-0"
            style={{ background: theme?.gradient }}
          >
            {t('dm.send')}
          </button>
        </div>
      </div>
    </div>
  )
}

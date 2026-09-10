'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

// 눈에 띄지 않되 찾으면 있는 자리에 둔다. 평소엔 글자 버튼 하나로 접혀 있고,
// 누르면 그 자리에서 펼쳐진다 — 새 화면으로 보내면 쓰다 만 내용이 날아간다.
export default function BugReport() {
  const { lang } = useLang()
  const tx = useT(lang)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    const message = text.trim()
    if (!message) return
    setSending(true); setError('')
    try {
      const supabase = createClient()
      const { data: s } = await supabase.auth.getSession()
      const token = s.session?.access_token
      if (!token) { setError(tx.bug.failed); setSending(false); return }
      const res = await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, page: window.location.pathname }),
      })
      if (!res.ok) { setError(tx.bug.failed); setSending(false); return }
      setDone(true); setText('')
      setTimeout(() => { setDone(false); setOpen(false) }, 2600)
    } catch {
      setError(tx.bug.failed)
    }
    setSending(false)
  }

  if (!open) {
    return (
      <div style={{ textAlign: 'center' }}>
        <button type="button" onClick={() => setOpen(true)} style={{
          background: 'none', border: 'none', color: '#8A7F6E', fontSize: 11.5, fontWeight: 600,
          cursor: 'pointer', padding: 8, textDecoration: 'underline',
        }}>{tx.bug.entry}</button>
      </div>
    )
  }

  const canSend = !sending && !!text.trim()

  return (
    <div style={{
      textAlign: 'left', marginTop: 8,
      background: '#FFFFFF',
      border: '1px solid rgba(36,28,21,0.12)',
      borderRadius: 16, padding: '16px 16px 14px',
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#241C15', marginBottom: 4 }}>{tx.bug.title}</div>
      <div style={{ fontSize: 12, color: '#8A7F6E', marginBottom: 10, lineHeight: 1.6 }}>
        {tx.bug.desc}
      </div>
      <textarea
        value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={2000}
        placeholder={tx.bug.placeholder}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'vertical',
          background: '#FFF8E7', border: '1px solid rgba(36,28,21,0.13)',
          borderRadius: 12, padding: '11px 12px', fontSize: 13.5, color: '#241C15',
          outline: 'none', lineHeight: 1.6, fontFamily: 'inherit',
        }} />
      {error && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 8, fontWeight: 600 }}>{error}</div>}
      {done && <div style={{ fontSize: 12, color: '#15803D', marginTop: 8, fontWeight: 600 }}>{tx.bug.sent}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={() => { setOpen(false); setError('') }} style={{
          flex: 1, padding: '10px', borderRadius: 11, cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(36,28,21,0.14)',
          color: '#8A7F6E', fontSize: 13, fontWeight: 700,
        }}>{tx.bug.close}</button>
        <button type="button" onClick={send} disabled={!canSend} style={{
          flex: 1, padding: '10px', borderRadius: 11, border: 'none',
          cursor: canSend ? 'pointer' : 'default',
          background: canSend ? '#D84A1E' : 'rgba(36,28,21,0.12)',
          color: canSend ? '#FFF8E7' : '#8A7F6E',
          fontSize: 13, fontWeight: 800,
        }}>{sending ? tx.bug.sending : tx.bug.send}</button>
      </div>
    </div>
  )
}

'use client'

/**
 * 어드민 공지 발송.
 *
 * 푸시는 취소가 안 된다. 그래서 바로 보낼 수 있게 만들지 않았다 —
 * [미리보기]로 대상 수를 확인해야 [발송] 버튼이 열린다. 그리고 문구를
 * 한 글자라도 고치면 미리보기가 풀린다. 확인한 문구와 보내는 문구가
 * 달라지는 게 이런 화면에서 가장 흔한 사고다.
 */

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'
import { Megaphone, Users, Smartphone, Globe } from 'lucide-react'

type Preview = { people: number; web: number; app: number }
type Sent = {
  id: string; title: string; body: string; url: string | null
  recipients: number; web_sent: number; app_sent: number; created_at: string
}

const inputStyle = {
  background: '#f8f8fc', border: '1px solid #e0e0f0',
  borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#1e1b4b', width: '100%',
  boxSizing: 'border-box' as const,
}

const DESTINATIONS = [
  { value: '/dashboard/auditions', label: '오디션 목록' },
  { value: '/dashboard', label: '홈' },
  { value: '/reactions', label: '반응' },
]

export default function AdminBroadcast() {
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState(DESTINATIONS[0].value)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string>('')
  const [history, setHistory] = useState<Sent[]>([])
  const [tableMissing, setTableMissing] = useState(false)

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/admin/broadcast')
    if (!res.ok) { setHistory([]); return }
    const data = await res.json()
    setTableMissing(!!data.missing)
    setHistory(data.rows ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }
      await loadHistory()
      setLoading(false)
    }
    init()
  }, [loadHistory])

  // 문구가 바뀌면 확인했던 내용과 달라진다. 미리보기를 풀어서 다시 확인하게 한다.
  function edit<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPreview(null); setResult('') }
  }

  async function runPreview() {
    setBusy(true); setResult('')
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url, dry: true }),
      })
      const data = await res.json()
      if (!res.ok) { setResult(data.error ?? '미리보기에 실패했어요.'); return }
      setPreview(data)
    } finally { setBusy(false) }
  }

  async function send() {
    if (!preview) return
    if (!confirm(`${preview.people}명에게 지금 발송합니다.\n\n제목: ${title}\n내용: ${body}\n\n푸시는 취소할 수 없습니다. 보낼까요?`)) return
    setBusy(true); setResult('')
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url }),
      })
      const data = await res.json()
      if (!res.ok) { setResult(data.error ?? '발송에 실패했어요.'); return }
      setResult(data.recorded === false
        ? `발송 완료 — 웹 ${data.web}건 · 앱 ${data.app}건 (기록에는 남지 않았습니다)`
        : `발송 완료 — 웹 ${data.web}건 · 앱 ${data.app}건`)
      setTitle(''); setBody(''); setPreview(null)
      await loadHistory()
    } finally { setBusy(false) }
  }

  const canPreview = title.trim().length > 0 && body.trim().length > 0

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#f0f0f8' }}>
        <AdminNav />
        <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: '#f0f0f8' }}>
      <AdminNav />

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>공지 발송</h1>
        <p style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 24, lineHeight: 1.6 }}>
          알림을 켜둔 지망생 전원에게 보냅니다. 기획사 담당자는 대상에서 빠집니다.
          <strong style={{ color: '#dc2626' }}> 보낸 푸시는 취소할 수 없습니다.</strong>
        </p>

        {tableMissing && (
          <div style={{
            background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.35)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>
              발송 기록 테이블이 아직 없습니다
            </div>
            <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.6 }}>
              공지는 보낼 수 있지만 기록이 남지 않아, 같은 공지를 두 번 보내는 걸 막지 못합니다.
              <br />
              <code style={{ fontSize: 11.5 }}>supabase/migration_broadcasts.sql</code> 을 SQL Editor에서 실행해주세요.
            </div>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e8e8f2', marginBottom: 20 }}>
          <label style={{ fontSize: 12.5, fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: 6 }}>제목</label>
          <input value={title} onChange={e => edit(setTitle)(e.target.value)} maxLength={40}
            placeholder="예) 이번 주 오디션이 열렸어요" style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={{ fontSize: 12.5, fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: 6 }}>내용</label>
          <textarea value={body} onChange={e => edit(setBody)(e.target.value)} maxLength={120} rows={3}
            placeholder="예) 이번 회차는 일요일 밤 11시 59분에 마감돼요."
            style={{ ...inputStyle, marginBottom: 16, resize: 'vertical', fontFamily: 'inherit' }} />

          <label style={{ fontSize: 12.5, fontWeight: 800, color: '#1e1b4b', display: 'block', marginBottom: 6 }}>누르면 갈 화면</label>
          <select value={url} onChange={e => edit(setUrl)(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }}>
            {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          {preview && (
            <div style={{
              background: 'rgba(216,74,30,0.06)', border: '1px solid rgba(216,74,30,0.25)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Users size={16} strokeWidth={2} color="#D84A1E" />
                <span style={{ fontSize: 15, fontWeight: 900, color: '#241C15' }}>{preview.people}명에게 갑니다</span>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: '#6B6355' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={13} /> 웹 {preview.web}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={13} /> 앱 {preview.app}</span>
              </div>
              {preview.people === 0 && (
                <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>
                  알림을 켜둔 사람이 없어 아무에게도 가지 않습니다.
                </div>
              )}
            </div>
          )}

          {result && (
            <div style={{ fontSize: 13, color: result.startsWith('발송 완료') ? '#16a34a' : '#dc2626', marginBottom: 16, fontWeight: 700 }}>
              {result}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={runPreview} disabled={!canPreview || busy}
              style={{
                flex: 1, padding: '13px', borderRadius: 12, border: '1px solid #e0e0f0',
                background: '#f8f8fc', color: '#1e1b4b', fontSize: 14, fontWeight: 800,
                cursor: canPreview && !busy ? 'pointer' : 'not-allowed', opacity: canPreview && !busy ? 1 : 0.5,
              }}>
              미리보기
            </button>
            <button onClick={send} disabled={!preview || busy || preview.people === 0}
              style={{
                flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                background: preview && preview.people > 0 ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : '#d8d4cc',
                color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: preview && !busy && preview.people > 0 ? 'pointer' : 'not-allowed',
                opacity: busy ? 0.6 : 1,
              }}>
              {busy ? '처리 중...' : '발송'}
            </button>
          </div>

          {!preview && (
            <div style={{ fontSize: 11.5, color: '#8A7F6E', marginTop: 10, textAlign: 'center' }}>
              미리보기로 대상 수를 확인해야 발송할 수 있어요
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Megaphone size={15} strokeWidth={2} color="#8A7F6E" />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b' }}>최근 보낸 공지</span>
        </div>

        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: '#8A7F6E', padding: '18px 0' }}>아직 보낸 공지가 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map(h => (
              <div key={h.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid #e8e8f2' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e1b4b', marginBottom: 3 }}>{h.title}</div>
                <div style={{ fontSize: 12.5, color: '#6B6355', marginBottom: 8, lineHeight: 1.5 }}>{h.body}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                  {h.created_at.slice(0, 16).replace('T', ' ')} · 대상 {h.recipients}명 · 웹 {h.web_sent} · 앱 {h.app_sent}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

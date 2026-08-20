'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Flag, ShieldOff, MoreVertical } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'

const REASONS_KO = ['부적절한 콘텐츠', '괴롭힘/혐오 발언', '스팸/사기', '저작권 침해', '기타']
const REASONS_EN = ['Inappropriate content', 'Harassment / hate speech', 'Spam / scam', 'Copyright infringement', 'Other']

export default function ReportBlockMenu({
  targetType,
  targetId,
  reportedUserId,
  myId,
  onBlocked,
}: {
  targetType: 'video' | 'profile'
  targetId: string
  reportedUserId: string
  myId: string
  onBlocked?: () => void
}) {
  const { lang } = useLang()
  const isKo = lang === 'ko'
  const reasons = isKo ? REASONS_KO : REASONS_EN
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'report'>('menu')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!myId || myId === reportedUserId) return null

  async function submitReport(reason: string) {
    setSubmitting(true)
    await supabase.from('reports').insert({
      reporter_id: myId,
      target_type: targetType,
      target_id: targetId,
      reported_user_id: reportedUserId,
      reason,
    })
    setSubmitting(false)
    setDone(true)
    setTimeout(() => { setOpen(false); setMode('menu'); setDone(false) }, 1400)
  }

  async function handleBlock() {
    if (!confirm(isKo ? '이 사용자를 차단하시겠어요? 이후 이 사용자의 콘텐츠가 더 이상 보이지 않아요.' : 'Block this user? Their content will no longer be shown to you.')) return
    setSubmitting(true)
    await supabase.from('blocked_users').insert({ blocker_id: myId, blocked_id: reportedUserId })
    // 차단은 운영진에게도 자동으로 신고 큐를 통해 알림 — Apple 1.2 요구사항
    await supabase.from('reports').insert({
      reporter_id: myId,
      target_type: targetType,
      target_id: targetId,
      reported_user_id: reportedUserId,
      reason: isKo ? '(자동) 사용자 차단됨' : '(auto) user blocked',
    })
    setSubmitting(false)
    setOpen(false)
    onBlocked?.()
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} aria-label="more"
        style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#8A7F6E' }}>
        <MoreVertical size={20} strokeWidth={1.8} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 32, right: 0, zIndex: 50, minWidth: 220,
          background: '#FFFFFF', borderRadius: 16, border: '1px solid rgba(36,28,21,0.09)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 8,
        }}>
          {mode === 'menu' && !done && (
            <>
              <button onClick={() => setMode('report')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, color: '#241C15', fontWeight: 600, textAlign: 'left' }}>
                <Flag size={16} strokeWidth={1.8} /> {isKo ? '신고하기' : 'Report'}
              </button>
              <button onClick={handleBlock} disabled={submitting}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, color: '#DC2626', fontWeight: 600, textAlign: 'left' }}>
                <ShieldOff size={16} strokeWidth={1.8} /> {isKo ? '사용자 차단' : 'Block user'}
              </button>
            </>
          )}
          {mode === 'report' && !done && (
            <div style={{ padding: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 6, padding: '0 8px' }}>
                {isKo ? '신고 사유를 선택하세요' : 'Select a reason'}
              </div>
              {reasons.map(r => (
                <button key={r} onClick={() => submitReport(r)} disabled={submitting}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 8px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#241C15' }}>
                  {r}
                </button>
              ))}
            </div>
          )}
          {done && (
            <div style={{ padding: '14px 12px', fontSize: 13, color: '#22c55e', fontWeight: 700, textAlign: 'center' }}>
              {isKo ? '신고가 접수되었어요' : 'Report submitted'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

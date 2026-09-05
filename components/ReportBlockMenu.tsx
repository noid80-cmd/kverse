'use client'

import { useState, useEffect } from 'react'
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
  tone = 'light',
  variant = 'plain',
  detail,
}: {
  targetType: 'video' | 'profile'
  targetId: string
  reportedUserId: string
  myId: string
  /** 신고와 함께 남길 증거. 대화 신고처럼 관리자가 맥락을 봐야 하는 경우에 쓴다 */
  detail?: string
  onBlocked?: () => void
  /** 어두운 배경(영상 위) 에서는 'dark' 로 두어 아이콘을 흰색으로 */
  tone?: 'light' | 'dark'
  /** 'circle' 은 스와이프 뷰어의 좋아요/음소거 버튼과 같은 원형 버튼 */
  variant?: 'plain' | 'circle'
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

  // 바깥을 눌러도 닫히지 않아서 한 번 열면 화면을 가린 채로 남았다.
  // 감싼 div가 stopPropagation을 하므로 안쪽 클릭은 여기까지 오지 않는다.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  if (!myId || myId === reportedUserId) return null

  async function submitReport(reason: string) {
    setSubmitting(true)
    await supabase.from('reports').insert({
      reporter_id: myId,
      target_type: targetType,
      target_id: targetId,
      reported_user_id: reportedUserId,
      reason,
      detail: detail ?? null,
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

  const iconColor = tone === 'dark' ? '#FFFFFF' : '#8A7F6E'

  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v) }} aria-label={isKo ? '더보기' : 'more'}
        style={variant === 'circle'
          ? { width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, padding: 0 }
          : { background: tone === 'dark' ? 'rgba(0,0,0,0.45)' : 'none', backdropFilter: tone === 'dark' ? 'blur(4px)' : undefined, borderRadius: tone === 'dark' ? 8 : 0, border: 'none', padding: 6, cursor: 'pointer', color: iconColor, display: 'flex' }}>
        <MoreVertical size={variant === 'circle' ? 22 : 20} strokeWidth={1.8} />
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

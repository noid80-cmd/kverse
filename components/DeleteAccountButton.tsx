'use client'

/**
 * 계정 삭제 진입점 (Apple Guideline 5.1.1(v)).
 * 되돌릴 수 없으므로 무엇이 지워지는지 먼저 보여주고, "삭제"를 직접 입력하게 한다.
 * Apple 은 확인 단계는 허용하지만, 전화·이메일 같은 외부 절차를 요구하는 건 금지한다.
 */
import { useState } from 'react'

export default function DeleteAccountButton({ label = '계정 삭제' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const canDelete = confirmText.trim() === '삭제' && !deleting

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || '계정 삭제에 실패했습니다.')
        setDeleting(false)
        return
      }
      // 세션까지 확실히 정리한 뒤 이동
      window.location.href = '/login?deleted=1'
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setDeleting(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ width: '100%', padding: 14, borderRadius: 14, background: 'none', border: '1px solid rgba(220,38,38,0.35)', color: '#DC2626', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {label}
      </button>

      {open && (
        <>
          <div onClick={() => !deleting && setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', zIndex: 301, left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            width: 'min(400px, calc(100vw - 40px))', maxHeight: '85vh', overflowY: 'auto',
            background: '#FFF8E7', borderRadius: 20, padding: 24,
            boxShadow: '0 12px 48px rgba(0,0,0,0.28)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#241C15', marginBottom: 10 }}>
              계정을 삭제할까요?
            </div>
            <div style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.7, marginBottom: 14 }}>
              삭제하면 되돌릴 수 없습니다. 아래 항목이 모두 사라집니다.
            </div>
            <ul style={{ fontSize: 13, color: '#5A4F42', lineHeight: 1.9, margin: '0 0 16px', paddingLeft: 18 }}>
              <li>계정과 프로필 정보</li>
              <li>업로드한 영상과 썸네일</li>
              <li>받은 좋아요·기획사 관심 기록</li>
              <li>오디션 지원 내역</li>
              <li>채팅 대화 내용</li>
            </ul>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#241C15', marginBottom: 6 }}>
              확인을 위해 <span style={{ color: '#DC2626' }}>삭제</span> 라고 입력해주세요
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
              disabled={deleting} placeholder="삭제"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(36,28,21,0.15)', fontSize: 15, background: '#fff', marginBottom: 14 }} />

            {error && (
              <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 12 }}>{error}</div>
            )}

            <button type="button" onClick={handleDelete} disabled={!canDelete}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, marginBottom: 8,
                background: canDelete ? '#DC2626' : 'rgba(220,38,38,0.35)', color: '#fff', cursor: canDelete ? 'pointer' : 'not-allowed' }}>
              {deleting ? '삭제하는 중…' : '영구 삭제'}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={deleting}
              style={{ width: '100%', padding: 12, background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </>
      )}
    </>
  )
}

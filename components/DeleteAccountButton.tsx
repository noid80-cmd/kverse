'use client'

/**
 * 계정 삭제 진입점 (Apple Guideline 5.1.1(v)).
 * 되돌릴 수 없으므로 무엇이 지워지는지 먼저 보여주고, "삭제"를 직접 입력하게 한다.
 * Apple 은 확인 단계는 허용하지만, 전화·이메일 같은 외부 절차를 요구하는 건 금지한다.
 */
import { useState } from 'react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

export default function DeleteAccountButton({ label }: { label?: string }) {
  const { lang } = useLang()
  const tx = useT(lang)
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // 언어를 바꾸면 확인 단어도 바뀐다. 한국어 '삭제'는 어느 언어에서든 받아준다.
  const typed = confirmText.trim().toUpperCase()
  const canDelete = (typed === tx.account.deleteWord.toUpperCase() || typed === '삭제') && !deleting

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || tx.account.deleteFailed)
        setDeleting(false)
        return
      }
      // 세션까지 확실히 정리한 뒤 이동
      window.location.href = '/login?deleted=1'
    } catch {
      setError(tx.account.networkError)
      setDeleting(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ width: '100%', padding: 14, borderRadius: 14, background: 'none', border: '1px solid rgba(220,38,38,0.35)', color: '#DC2626', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {label ?? tx.account.deleteAccount}
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
              {tx.account.deleteTitle}
            </div>
            <div style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.7, marginBottom: 14 }}>
              {tx.account.deleteWarn}
            </div>
            <ul style={{ fontSize: 13, color: '#5A4F42', lineHeight: 1.9, margin: '0 0 16px', paddingLeft: 18 }}>
              <li>{tx.account.deleteItem1}</li>
              <li>{tx.account.deleteItem2}</li>
              <li>{tx.account.deleteItem3}</li>
              <li>{tx.account.deleteItem4}</li>
              <li>{tx.account.deleteItem5}</li>
            </ul>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#241C15', marginBottom: 6 }}>
              {tx.account.deleteTypePrompt.split('{word}')[0]}<span style={{ color: '#DC2626' }}>{tx.account.deleteWord}</span>{tx.account.deleteTypePrompt.split('{word}')[1]}
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
              disabled={deleting} placeholder={tx.account.deleteWord}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(36,28,21,0.15)', fontSize: 15, background: '#fff', marginBottom: 14 }} />

            {error && (
              <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 12 }}>{error}</div>
            )}

            <button type="button" onClick={handleDelete} disabled={!canDelete}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, marginBottom: 8,
                background: canDelete ? '#DC2626' : 'rgba(220,38,38,0.35)', color: '#fff', cursor: canDelete ? 'pointer' : 'not-allowed' }}>
              {deleting ? tx.account.deleting : tx.account.deleteForever}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={deleting}
              style={{ width: '100%', padding: 12, background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {tx.common.cancel}
            </button>
          </div>
        </>
      )}
    </>
  )
}

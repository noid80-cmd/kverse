'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'
import { AuthShell, authInputStyle, authSubmitStyle } from '@/components/AuthShell'

export default function ForgotPasswordPage() {
  const { lang } = useLang()
  const tx = useT(lang).auth
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('kpick-last-email')
      if (remembered) setEmail(remembered)
    } catch { /* non-critical */ }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    // 리다이렉트 주소는 현재 접속한 호스트를 그대로 쓴다 — kpick.app과
    // www.kpick.app 둘 다 살아있어서 고정값을 넣으면 한쪽에서 링크가 깨진다.
    // (Supabase Redirect URLs에 두 호스트 모두 등록돼 있어야 함)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    // 계정 존재 여부가 새어나가지 않도록 실패해도 동일하게 "보냈다"고 안내한다.
    // 단, 재요청 제한(rate limit)만은 그대로 알려야 사용자가 기다릴 줄 안다.
    if (err && /second|rate|limit/i.test(err.message)) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthShell title={tx.resetTitle}>
      {sent ? (
        <>
          <p style={{ fontSize: 14, color: 'rgba(36,28,21,0.7)', lineHeight: 1.7, textAlign: 'center', margin: '0 0 20px' }}>
            {tx.resetSent}
          </p>
          <Link href="/login" style={{
            display: 'block', textAlign: 'center', padding: '15px', borderRadius: 16,
            background: 'rgba(36,28,21,0.04)', color: '#241C15', fontSize: 15, fontWeight: 600,
            textDecoration: 'none', border: '1px solid rgba(36,28,21,0.1)',
          }}>{tx.backToLogin}</Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(36,28,21,0.6)', lineHeight: 1.7, textAlign: 'center', margin: '0 0 4px' }}>
            {tx.resetDesc}
          </p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={tx.emailPlaceholder} required autoFocus className="kpick-input"
            style={authInputStyle} />
          {error && <p style={{ color: '#DC2626', fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} className="submit-btn" style={authSubmitStyle(loading)}>
            {loading ? tx.resetSending : tx.resetSend}
          </button>
          <Link href="/login" style={{
            textAlign: 'center', fontSize: 13, color: 'rgba(36,28,21,0.5)',
            fontWeight: 600, textDecoration: 'none', marginTop: 4,
          }}>{tx.backToLogin}</Link>
        </form>
      )}
    </AuthShell>
  )
}

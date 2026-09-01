'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'
import { AuthShell, authInputStyle, authSubmitStyle } from '@/components/AuthShell'

type Stage = 'verifying' | 'form' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang).auth
  const [stage, setStage] = useState<Stage>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // 복구 링크가 세션을 어떤 형태로 실어보내는지는 Supabase 설정에 따라 셋으로 갈린다.
  //   ?code=...        PKCE (기본) — 재설정을 요청한 그 브라우저에서만 교환된다
  //   ?token_hash=...  이메일 템플릿을 {{ .TokenHash }}로 바꿨을 때. 기기가 달라도 됨
  //   #access_token=.. implicit — SDK의 detectSessionInUrl이 알아서 처리
  // 셋 다 받아둬야 "메일은 왔는데 링크가 안 먹는다"는 신고를 안 받는다.
  useEffect(() => {
    const supabase = createClient()

    async function run() {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      if (url.searchParams.get('error_description') || hash.get('error_description')) {
        setStage('invalid'); return
      }

      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
      } else if (tokenHash) {
        await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash }).catch(() => {})
      }

      // 세션이 쿠키에 반영될 때까지 짧게 재시도 — /auth/callback에서 검증된 패턴.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) { setStage('form'); return }
        await new Promise(r => setTimeout(r, 300))
      }
      setStage('invalid')
    }

    run()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(tx.resetTooShort); return }
    if (password !== confirm) { setError(tx.resetMismatch); return }

    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    // 새 비밀번호가 실제로 통하는지 사용자가 바로 확인하도록 로그아웃 후 로그인 화면으로.
    // (복구 세션을 그대로 들고 대시보드로 보내면 비번이 틀려도 모른 채 넘어간다)
    await supabase.auth.signOut().catch(() => {})
    setStage('done')
    setTimeout(() => router.push('/login'), 1800)
  }

  return (
    <AuthShell title={stage === 'invalid' ? tx.resetTitle : tx.resetNewTitle}>
      {stage === 'verifying' && (
        <p style={{ fontSize: 14, color: 'rgba(36,28,21,0.6)', textAlign: 'center', margin: 0 }}>
          {tx.resetVerifying}
        </p>
      )}

      {stage === 'invalid' && (
        <>
          <p style={{ fontSize: 14, color: '#DC2626', lineHeight: 1.7, textAlign: 'center', margin: '0 0 20px' }}>
            {tx.resetLinkInvalid}
          </p>
          <Link href="/forgot-password" style={{
            display: 'block', textAlign: 'center', padding: '15px', borderRadius: 16,
            background: 'linear-gradient(135deg, #D84A1E 0%, #FF6F3C 100%)',
            color: 'white', fontSize: 15, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(216,74,30,0.3)',
          }}>{tx.resetSend}</Link>
        </>
      )}

      {stage === 'done' && (
        <p style={{ fontSize: 14, color: '#15803D', fontWeight: 600, lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
          {tx.resetDone}
        </p>
      )}

      {stage === 'form' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder={tx.newPasswordPlaceholder} required autoFocus
            autoComplete="new-password" className="kpick-input" style={authInputStyle} />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder={tx.newPasswordConfirm} required
            autoComplete="new-password" className="kpick-input" style={authInputStyle} />
          {error && <p style={{ color: '#DC2626', fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={saving} className="submit-btn" style={authSubmitStyle(saving)}>
            {saving ? tx.resetSaving : tx.resetSaveBtn}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

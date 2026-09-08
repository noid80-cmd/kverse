'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/PasswordInput'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

// 이메일 코드로 들어온 직후에 여기로 온다.
//
// 코드 로그인은 "못 들어가는 사람을 들여보내는" 것까지만 한다. 그걸로 끝내면
// 다음에도 또 코드를 받아야 하고, 특히 초대 링크로 시작한 기획사 계정은
// 비밀번호가 아예 없어서 매번 그렇게 된다. 들어온 김에 비밀번호를 만들어두면
// 다음부터는 그냥 로그인한다.
//
// 건너뛰기는 두지 않는다. 건너뛰면 다음에도 코드를 받아야 하고, 그 "다음"은
// 대개 급할 때 온다. 여기서 30초 쓰는 게 낫다.
export default function AccountPasswordPage() {
  const router = useRouter()
  const { lang } = useLang()
  const tt = useT(lang)
  const tx = tt.auth
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [home, setHome] = useState('/dashboard')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      setHome(p?.role === 'admin' ? '/admin' : p?.role === 'agency' ? '/agency/auditions' : '/dashboard')
    })
  }, [router])

  async function save() {
    if (pw.length < 6) { setError(tx.pwTooShort); return }
    if (pw !== pw2) { setError(tx.pwMismatch); return }
    setSaving(true); setError('')
    const { error: e } = await createClient().auth.updateUser({ password: pw })
    setSaving(false)
    if (e) { setError(e.message); return }
    router.replace(home)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#241C15', marginBottom: 8 }}>{tx.setPwTitle}</div>
          <div style={{ fontSize: 13.5, color: '#8A7F6E', lineHeight: 1.6 }}>
            {tx.setPwSub}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '22px 20px', border: '1px solid rgba(36,28,21,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PasswordInput value={pw} onChange={e => setPw(e.target.value)}
              placeholder={tx.newPwPlaceholder} autoComplete="new-password" autoFocus
              style={{ width: '100%', background: 'rgba(36,28,21,0.04)', border: '1px solid rgba(36,28,21,0.12)', borderRadius: 12, padding: '13px 15px', fontSize: 15, color: '#241C15', boxSizing: 'border-box', outline: 'none' }} />
            <PasswordInput value={pw2} onChange={e => setPw2(e.target.value)}
              placeholder={tx.repeatPwPlaceholder} autoComplete="new-password"
              style={{ width: '100%', background: 'rgba(36,28,21,0.04)', border: '1px solid rgba(36,28,21,0.12)', borderRadius: 12, padding: '13px 15px', fontSize: 15, color: '#241C15', boxSizing: 'border-box', outline: 'none' }} />

            {error && <div style={{ fontSize: 13, color: '#DC2626' }}>{error}</div>}

            <button onClick={save} disabled={saving} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1, marginTop: 2,
            }}>{saving ? tt.profile.saving : tx.saveAndStart}</button>
          </div>
        </div>

      </div>
    </div>
  )
}

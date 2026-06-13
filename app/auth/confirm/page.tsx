'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthConfirm() {
  const [msg, setMsg] = useState('로그인 처리 중...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('c')
    const roleParam = params.get('r') as 'talent' | 'agency' | null

    if (!code) {
      setMsg('코드 없음')
      setTimeout(() => { window.location.href = '/login' }, 3000)
      return
    }

    setMsg(`코드: ${code.slice(0, 8)}... 교환 중`)

    const allCookies = document.cookie
    const hasVerifier = allCookies.includes('code-verifier')
    setMsg(`코드: ${code.slice(0, 8)}... | verifier: ${hasVerifier ? 'O' : 'X'} | 교환 중`)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { skipAutoInitialize: true },
        isSingleton: false,
      }
    )

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.user) {
        const errMsg = error?.message ?? '유저 없음'
        setMsg(`실패: ${errMsg}`)
        setTimeout(() => { window.location.href = '/login' }, 8000)
        return
      }

      setMsg('성공! 이동 중...')

      if (roleParam) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (!profile || profile.role === 'talent') {
          await supabase.from('profiles').update({ role: roleParam }).eq('id', data.user.id)
        }
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      const role = roleParam ?? profile?.role ?? 'talent'
      const dest = role === 'admin' ? '/admin' : role === 'agency' ? '/agency/discover' : '/dashboard'

      window.location.href = dest
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontFamily: 'monospace', textAlign: 'center', padding: 20 }}>
        {msg}
      </div>
    </div>
  )
}

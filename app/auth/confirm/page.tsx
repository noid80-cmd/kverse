'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirm() {
  const [status, setStatus] = useState('로그인 처리 중...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('c')
    const roleParam = params.get('r') as 'talent' | 'agency' | null

    if (!code) {
      setStatus('코드 없음 → /login')
      setTimeout(() => { window.location.href = '/login' }, 3000)
      return
    }

    setStatus(`코드 받음 (${code.slice(0, 8)}...) 교환 중...`)

    const supabase = createClient()

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.user) {
        const msg = error?.message ?? '유저 없음'
        setStatus(`실패: ${msg}`)
        setTimeout(() => { window.location.href = '/login' }, 5000)
        return
      }

      setStatus('성공! 이동 중...')

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
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontFamily: 'monospace', textAlign: 'center', padding: 20 }}>
        {status}
      </div>
    </div>
  )
}

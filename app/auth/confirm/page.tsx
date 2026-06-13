'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirm() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('c')
    const roleParam = params.get('r') as 'talent' | 'agency' | null

    if (!code) {
      window.location.href = '/login'
      return
    }

    const supabase = createClient()

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.user) {
        console.error('[confirm] exchangeCodeForSession error:', error?.message)
        window.location.href = '/login'
        return
      }

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
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>로그인 처리 중...</div>
    </div>
  )
}

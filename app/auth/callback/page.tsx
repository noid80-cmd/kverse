'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handle() {
      // detectSessionInUrl:true 가 URL 해시에서 세션을 자동 처리함
      // 약간 대기 후 세션 확인
      await new Promise(r => setTimeout(r, 800))

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = '/login'
        return
      }

      const back = sessionStorage.getItem('auth_back') || '/feed'
      sessionStorage.removeItem('auth_back')

      const { data: acc } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle()

      if (acc) {
        window.location.href = back
      } else {
        window.location.href = `/signup/complete?back=${encodeURIComponent(back)}`
      }
    }
    handle()
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-pink-400 text-sm animate-pulse">Loading...</div>
    </div>
  )
}

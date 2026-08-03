'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthRecover() {
  return (
    <Suspense>
      <AuthRecoverContent />
    </Suspense>
  )
}

function AuthRecoverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('로그인 처리 중...')

  useEffect(() => {
    const code = searchParams.get('code')
    const role = searchParams.get('role')

    async function run() {
      let verifier: string | null = null
      try { verifier = sessionStorage.getItem('kpick-oauth-verifier') } catch { /* non-critical */ }
      if (!verifier) {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          const { value } = await Preferences.get({ key: 'kpick-oauth-verifier' })
          verifier = value
        } catch { /* not native, ignore */ }
      }

      if (!code || !verifier) {
        setMessage('로그인에 실패했어요. 다시 시도해주세요.')
        setTimeout(() => router.push('/login'), 1200)
        return
      }

      try {
        const res = await fetch('/api/auth/exchange-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, verifier, role }),
        })
        const result = await res.json()
        if (!res.ok || result.error) {
          setMessage('로그인에 실패했어요. 다시 시도해주세요.')
          setTimeout(() => router.push('/login'), 1200)
          return
        }
        try { sessionStorage.removeItem('kpick-oauth-verifier') } catch { /* non-critical */ }
        router.push(result.href)
        router.refresh()
      } catch {
        setMessage('로그인에 실패했어요. 다시 시도해주세요.')
        setTimeout(() => router.push('/login'), 1200)
      }
    }
    run()
  }, [router, searchParams])

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>{message}</div>
    </div>
  )
}

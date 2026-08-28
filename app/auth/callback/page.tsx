'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveAfterAuth } from '@/lib/intent'

export default function AuthCallback() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  )
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('로그인 처리 중...')

  useEffect(() => {
    const code = searchParams.get('code')
    const role = searchParams.get('role')
    const supabase = createClient()

    // 서버(Route Handler)가 요청 쿠키에서 code_verifier를 읽으면 못 찾는 게
    // 실측 확인됨(네이티브 앱 WKWebView). 대신 클라이언트 SDK가 document.cookie를
    // 직접 읽게 해서 교환한다 — 브라우저 쿠키 저장소에 값이 실제로 남아있는지가
    // 관건이라, 서버 왕복이 아니라 여기서 바로 시도.
    async function run() {
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
      }

      // 세션이 반영될 때까지 짧게 재시도(최대 5초) — 연습실앱에서 검증된 패턴.
      let session = null
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) { session = data.session; break }
        await new Promise(r => setTimeout(r, 500))
      }

      if (!session) {
        setMessage('로그인에 실패했어요. 다시 시도해주세요.')
        setTimeout(() => router.push('/login'), 1200)
        return
      }

      try {
        const res = await fetch('/api/auth/post-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        })
        const result = await res.json()
        if (!res.ok || result.error) {
          router.push(resolveAfterAuth('/dashboard'))
          return
        }
        router.push(resolveAfterAuth(result.href))
        router.refresh()
      } catch {
        router.push(resolveAfterAuth('/dashboard'))
      }
    }
    run()
  }, [router, searchParams])

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(36,28,21,0.65)', fontSize: 15 }}>{message}</div>
    </div>
  )
}

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
  const [detail, setDetail] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const role = searchParams.get('role')
    const supabase = createClient()

    function fail(msg: string, why: string) {
      setMessage(msg)
      setDetail(why)
      setFailed(true)
      // 예전엔 1.2초 뒤 /login으로 자동으로 튕겼는데, 그러면 실패 원인을 아무도
      // 못 읽어서 "다시 로그인 창이 뜬다"는 제보만 남고 진단이 불가능했다.
      // 이제는 멈춰서 원인을 보여주고, 돌아가는 건 사용자가 누르게 한다.
    }

    // Supabase는 실패를 쿼리(?error=...)로 줄 때도 있고 해시(#error=...)로 줄 때도
    // 있다. 한쪽만 보면 놓친다.
    function readAuthError(): string | null {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = searchParams.get('error_code') ?? searchParams.get('error')
        ?? hash.get('error_code') ?? hash.get('error')
      if (!code) return null
      const desc = searchParams.get('error_description') ?? hash.get('error_description')
      return desc ? `${code} · ${decodeURIComponent(desc.replace(/\+/g, ' '))}` : code
    }

    // 서버(Route Handler)가 요청 쿠키에서 code_verifier를 읽으면 못 찾는 게
    // 실측 확인됨(네이티브 앱 WKWebView). 대신 클라이언트 SDK가 document.cookie를
    // 직접 읽게 해서 교환한다 — 브라우저 쿠키 저장소에 값이 실제로 남아있는지가
    // 관건이라, 서버 왕복이 아니라 여기서 바로 시도.
    async function run() {
      const authError = readAuthError()
      if (authError) {
        fail('로그인이 완료되지 않았어요', authError)
        return
      }

      let exchangeError: string | null = null
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) exchangeError = error.message
      }

      // 세션이 반영될 때까지 짧게 재시도(최대 5초) — 연습실앱에서 검증된 패턴.
      let session = null
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) { session = data.session; break }
        await new Promise(r => setTimeout(r, 500))
      }

      if (!session) {
        fail('로그인에 실패했어요', exchangeError
          ?? (code
            ? '인증 코드는 받았는데 세션이 만들어지지 않았어요 (code_verifier 유실 가능)'
            : '인증 코드를 받지 못했어요'))
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
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ color: failed ? '#241C15' : 'rgba(36,28,21,0.65)', fontSize: failed ? 17 : 15, fontWeight: failed ? 700 : 400 }}>
          {message}
        </div>

        {failed && detail && (
          <>
            <div style={{ marginTop: 14, fontSize: 13, color: '#8A7F6E', lineHeight: 1.6 }}>
              아래 내용을 캡처해서 보내주시면 바로 확인할 수 있어요.
            </div>
            <div style={{
              marginTop: 10, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(36,28,21,0.05)', border: '1px solid rgba(36,28,21,0.1)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12, color: '#241C15', lineHeight: 1.6,
              wordBreak: 'break-word', textAlign: 'left',
            }}>
              {detail}
            </div>
            <button onClick={() => router.push('/login')} style={{
              marginTop: 18, width: '100%', padding: '13px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: '#FFFFFF',
              fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}>
              다시 시도하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

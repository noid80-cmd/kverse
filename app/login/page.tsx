'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolveAfterAuth } from '@/lib/intent'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'
import { isNativeApp } from '@/lib/capacitor'

export default function LoginPage() {
  // 계정 삭제 직후 /login?deleted=1 로 돌아온다. 삭제가 끝났다는 걸 명확히 알린다.
  const [justDeleted, setJustDeleted] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('deleted') === '1') {
      setJustDeleted(true)
    }
  }, [])

  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang).auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isKakao, setIsKakao] = useState(false)

  useEffect(() => {
    setIsKakao(/KAKAOTALK/i.test(navigator.userAgent))
    try {
      const remembered = localStorage.getItem('kpick-last-email')
      if (remembered) setEmail(remembered)
    } catch { /* non-critical */ }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      // 서버 라우트를 거쳐 로그인한다 — 클라이언트에서 직접
      // signInWithPassword를 호출하면 세션 쿠키가 JS document.cookie로
      // 쓰이는데, 네이티브 앱(WKWebView)에서는 이게 다음 네비게이션의
      // 요청에 곧바로 반영되지 않아 로그인 페이지로 튕기는 경우가 있었음
      // ("2~3번 시도해야 로그인됨"). 서버 라우트는 실제 Set-Cookie 응답
      // 헤더로 쿠키를 심어서 훨씬 안정적으로 반영된다.
      // 응답이 안 오면 버튼이 "로그인 중..."인 채로 영원히 멈춘다.
      // 끊어주고 에러를 보여주는 게 낫다.
      const ac = new AbortController()
      const killer = setTimeout(() => ac.abort(), 15000)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: ac.signal,
      })
      clearTimeout(killer)
      const result = await res.json()
      if (!res.ok || result.error) {
        setError(
          res.status === 403 && result.error ? result.error
          : result.code === 'email_not_confirmed' ? tx.emailNotConfirmed
          : tx.loginError
        )
        setLoading(false)
        return
      }
      try { localStorage.setItem('kpick-last-email', email) } catch { /* non-critical */ }
      try { localStorage.setItem('kpick-has-logged-in', '1') } catch { /* non-critical */ }
      // 전체 새로고침(window.location.href) 대신 앱 내 화면 전환으로 이동.
      // 네이티브 앱(WKWebView)에서 로그인 직후 하드 리로드를 하면 그 순간
      // 쿠키 반영 타이밍 문제로 로그인 페이지로 되튕기는 경우가 잦았음
      // ("여러 번 시도해야 로그인됨"). router.push는 같은 JS 컨텍스트를
      // 유지해서 이 문제를 피하고, RSC 페치가 실패해도 Next.js가 자동으로
      // 브라우저 네비게이션으로 대체한다.
      const target = resolveAfterAuth(result.href)
      router.push(target)
      router.refresh()

      // router.push가 조용히 아무것도 안 하는 경우가 있다(대상 페이지가 쿠키
      // 반영 전에 다시 /login으로 되돌리는 등). 그러면 성공했는데도 버튼이
      // "로그인 중..."인 채로 영원히 멈추고, 사용자는 실패인지 성공인지도 모른다.
      // 잠시 뒤에도 여전히 로그인 화면이면 하드 이동으로 한 번 더 밀어준다.
      setTimeout(() => {
        if (window.location.pathname.startsWith('/login')) {
          window.location.href = target
        }
      }, 2500)
    } catch (err) {
      console.error('[login] error:', err)
      setError(tx.loginError)
      setLoading(false)
    }
  }

  // OAuth 시작을 우리가 통제한다. 예전엔 signInWithOAuth가 알아서 이동하게
  // 두고 반환값을 통째로 무시했는데, 그러면 시작이 실패해도 화면에 아무 일도
  // 일어나지 않는다. 실제로 "눌렀는데 아무 반응이 없다"는 제보가 그거였다.
  //
  // 그리고 PKCE의 code_verifier가 저장소에 안착하기 전에 페이지를 떠나면,
  // 돌아왔을 때 코드를 교환할 열쇠가 없어서 로그인이 실패한다. 구글·애플,
  // 앱·웹 가릴 것 없이 "한 번 실패하고 두세 번째에 되는" 증상이 이걸로
  // 설명된다. 그래서 값이 실제로 보일 때까지 잠깐 기다렸다가 이동한다.
  async function startOAuth(provider: 'google' | 'apple') {
    setError('')
    setLoading(true)
    const supabase = createClient()

    // 네이티브 앱에서는 https 콜백 대신 커스텀 스킴(kpick://auth-callback)으로
    // 받는다 — iOS 쪽에서 이 이동을 ASWebAuthenticationSession으로 가로채
    // Safari로 튕기지 않고 시스템 인증 세션 안에서 처리한 뒤, 완료되면 이
    // 콜백을 https://kpick.app/auth/callback으로 변환해 웹뷰에 다시 로드해준다
    // (ios/App/App/{Google,Apple}AuthInterceptorPlugin.swift).
    const redirectTo = isNativeApp()
      ? 'kpick://auth-callback'
      : `${window.location.origin}/auth/callback`

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    })

    if (oauthError || !data?.url) {
      setLoading(false)
      setError(oauthError?.message ?? '로그인을 시작하지 못했어요. 다시 시도해주세요.')
      return
    }

    // 최대 1초. 못 봐도 그냥 진행한다 — 저장 위치가 버전에 따라 다를 수 있어서
    // 여기서 막아버리면 멀쩡한 로그인까지 못 하게 된다.
    for (let i = 0; i < 20; i++) {
      const inCookie = document.cookie.includes('code-verifier')
      let inLocal = false
      try {
        inLocal = Object.keys(localStorage).some(k => k.includes('code-verifier'))
      } catch { /* 접근이 막힌 브라우저도 있다 */ }
      if (inCookie || inLocal) break
      await new Promise(r => setTimeout(r, 50))
    }

    window.location.href = data.url
  }

  const handleGoogle = () => startOAuth('google')
  const handleApple = () => startOAuth('apple')

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden', position: 'relative' }}>

      {/* Background atmosphere */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)',
          width: 1000, height: 800,
          background: 'radial-gradient(ellipse at center top, rgba(255,111,60,0.16) 0%, rgba(216,74,30,0.06) 35%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-15%', width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(255,111,60,0.08) 0%, transparent 55%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '-15%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(216,74,30,0.06) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,111,60,0.08), transparent 70%)',
          top: '12%', left: '8%', animation: 'floatA 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(216,74,30,0.08), transparent 70%)',
          top: '50%', right: '10%', animation: 'floatB 13s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,111,60,0.06), transparent 70%)',
          top: '30%', right: '6%', animation: 'floatC 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(216,74,30,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(216,74,30,0.02) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
      </div>

      <div style={{
        width: '100%', maxWidth: 400, position: 'relative', zIndex: 1,
      }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: 20 }}>
            <div style={{
              position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)',
              width: 140, height: 70,
              background: 'radial-gradient(ellipse at top, rgba(255,111,60,0.35) 0%, transparent 70%)',
              filter: 'blur(10px)', zIndex: 0,
            }} />
            <div style={{
              width: 88, height: 88, borderRadius: 30,
              background: 'linear-gradient(145deg, #FFEDE0, #FFD9BC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(255,111,60,0.25), 0 8px 32px rgba(216,74,30,0.2), 0 0 60px rgba(255,111,60,0.12)',
              position: 'relative', zIndex: 1,
            }}>
              <svg width="63" height="63" viewBox="0 0 100 100" style={{ position: 'relative' }}>
                <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#FF6F3C" />
                <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="#FF6F3C" />
                <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(216,74,30,0.8)" />
              </svg>
            </div>
          </div>
          <h1 style={{
            fontSize: 42, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, marginBottom: 12,
            color: '#241C15',
          }}>Krookie</h1>

          {justDeleted && (
            <div style={{
              margin: '0 0 16px', padding: '12px 16px', borderRadius: 14,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
              fontSize: 14, fontWeight: 700, color: '#15803D', lineHeight: 1.6,
            }}>
              계정이 삭제되었습니다.<br />
              <span style={{ fontWeight: 500, fontSize: 13 }}>그동안 이용해 주셔서 감사합니다.</span>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'rgba(36,28,21,0.55)', fontWeight: 500, letterSpacing: 0.3 }}>
            {tx.tagline}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.78)', borderRadius: 28, padding: '32px 28px',
          border: '1px solid rgba(36,28,21,0.08)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 0 0 1px rgba(255,111,60,0.08), 0 40px 80px rgba(36,28,21,0.12)',
        }}>

          {!isKakao && (
            <button onClick={handleApple} disabled={loading} className="apple-btn" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 20px', borderRadius: 16, marginBottom: 10,
              background: '#000000', color: '#FFFFFF', fontSize: 15, fontWeight: 600,
              border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
                <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.014.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.696.91-1.395 0-2.35-1.25-3.44-2.79-1.36-1.94-2.42-4.94-2.42-7.78 0-4.58 2.98-7.01 5.92-7.01 1.365 0 2.51.9 3.37.9.81 0 2.11-.96 3.7-.96.61 0 2.81.06 4.28 2.09-.11.07-2.55 1.49-2.55 4.53 0 3.63 3.19 4.9 3.41 5.0z"/>
              </svg>
              {tx.loginApple}
            </button>
          )}
          {!isKakao && (
            <button onClick={handleGoogle} disabled={loading} className="google-btn" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 20px', borderRadius: 16, marginBottom: 20,
              background: 'rgba(36,28,21,0.03)', color: '#241C15', fontSize: 15, fontWeight: 600,
              border: '1px solid rgba(36,28,21,0.1)', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
            }}>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z" />
              </svg>
              {tx.loginGoogle}
            </button>
          )}
          {isKakao && (
            <p style={{ fontSize: 12, color: 'rgba(36,28,21,0.4)', textAlign: 'center', marginBottom: 20, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {tx.kakaoBlock}
            </p>
          )}

          {error && !isKakao && (
            <p style={{
              color: '#DC2626', fontSize: 13, textAlign: 'center',
              margin: '0 0 16px', lineHeight: 1.6,
            }}>{error}</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(36,28,21,0.1)' }} />
            <span style={{ fontSize: 11, color: 'rgba(36,28,21,0.45)', fontWeight: 600, letterSpacing: 0.5 }}>{tx.loginEmail}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(36,28,21,0.1)' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={tx.emailPlaceholder} required className="kpick-input"
              style={{
                width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.12)',
                borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#241C15',
                outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
              }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={tx.passwordPlaceholder} required className="kpick-input"
              style={{
                width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.12)',
                borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#241C15',
                outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
              }} />
            <button type="submit" disabled={loading} className="submit-btn"
              style={{
                width: '100%', padding: '15px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #D84A1E 0%, #FF6F3C 100%)',
                color: 'white', fontSize: 16, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 4px 20px rgba(216,74,30,0.3)',
                marginTop: 4, opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
              }}>
              {loading ? tx.loggingIn : tx.loginBtn}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 14 }}>
            <Link href="/forgot-password" style={{ fontSize: 13, color: 'rgba(36,28,21,0.5)', fontWeight: 600, textDecoration: 'none' }}>
              {tx.forgotPassword}
            </Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(36,28,21,0.45)', marginTop: 14 }}>
            로그인 시 <a href="/terms" target="_blank" style={{ color: 'rgba(36,28,21,0.6)', textDecoration: 'underline' }}>이용약관 및 커뮤니티 가이드라인</a>에 동의하는 것으로 간주됩니다.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(36,28,21,0.5)', marginTop: 24, fontWeight: 500 }}>
          {tx.noAccount}{' '}
          <Link href="/signup" style={{ color: '#D84A1E', fontWeight: 700, textDecoration: 'none' }}>{tx.signupLink}</Link>
        </p>
      </div>

      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translate(0px, 0px); }
          33% { transform: translate(28px, -18px); }
          66% { transform: translate(-18px, 22px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0px, 0px); }
          33% { transform: translate(-22px, -28px); }
          66% { transform: translate(18px, 16px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0px, 0px); }
          50% { transform: translate(-28px, 22px); }
        }
        .kpick-input::placeholder { color: rgba(36,28,21,0.32); }
        .kpick-input:focus {
          border-color: rgba(255,111,60,0.45) !important;
          background: rgba(255,111,60,0.04) !important;
          box-shadow: 0 0 0 3px rgba(255,111,60,0.1);
        }
        .google-btn:hover { background: rgba(36,28,21,0.06) !important; border-color: rgba(36,28,21,0.16) !important; }
        .google-btn:active { transform: scale(0.98); }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(216,74,30,0.35) !important;
        }
        .submit-btn:not(:disabled):active { transform: scale(0.98); }
      `}</style>
    </div>
  )
}

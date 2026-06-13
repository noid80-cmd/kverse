'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

export default function LoginPage() {
  const { lang } = useLang()
  const tx = useT(lang).auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isKakao, setIsKakao] = useState(false)

  useEffect(() => {
    setIsKakao(/KAKAOTALK/i.test(navigator.userAgent))
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) { setError(tx.loginError); setLoading(false); return }
      const { href, access_token, refresh_token } = await res.json()
      const supabase = createClient()
      await supabase.auth.setSession({ access_token, refresh_token })
      window.location.href = href
    } catch {
      setError(tx.loginError)
      setLoading(false)
    }
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } },
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden', position: 'relative' }}>

      {/* Background atmosphere */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)',
          width: 1000, height: 800,
          background: 'radial-gradient(ellipse at center top, rgba(6,182,212,0.13) 0%, rgba(8,145,178,0.05) 35%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-15%', width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 55%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '-15%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(8,145,178,0.05) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.07), transparent 70%)',
          top: '12%', left: '8%', animation: 'floatA 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(8,145,178,0.07), transparent 70%)',
          top: '50%', right: '10%', animation: 'floatB 13s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.05), transparent 70%)',
          top: '30%', right: '6%', animation: 'floatC 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.015) 1px, transparent 1px)',
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
              background: 'radial-gradient(ellipse at top, rgba(6,182,212,0.3) 0%, transparent 70%)',
              filter: 'blur(10px)', zIndex: 0,
            }} />
            <div style={{
              width: 88, height: 88, borderRadius: 30,
              background: 'linear-gradient(145deg, #0891b2 0%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.12)',
              position: 'relative', zIndex: 1,
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 30, background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)' }} />
              <span style={{ color: 'white', fontSize: 36, fontWeight: 800, letterSpacing: -1, position: 'relative' }}>K</span>
            </div>
          </div>
          <h1 style={{
            fontSize: 42, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, marginBottom: 12,
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Kpick</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)', fontWeight: 500, letterSpacing: 0.3 }}>
            {tx.tagline}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 28, padding: '32px 28px',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 0 0 1px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.55)',
        }}>

          {!isKakao && (
            <button onClick={handleGoogle} className="google-btn" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 20px', borderRadius: 16, marginBottom: 20,
              background: 'rgba(255,255,255,0.05)', color: '#eeeeff', fontSize: 15, fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer', transition: 'all 0.2s',
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
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 20, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {tx.kakaoBlock}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: 0.5 }}>{tx.loginEmail}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={tx.emailPlaceholder} required className="kpick-input"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff',
                outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
              }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={tx.passwordPlaceholder} required className="kpick-input"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff',
                outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
              }} />
            {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading} className="submit-btn"
              style={{
                width: '100%', padding: '15px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                color: 'white', fontSize: 16, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
                marginTop: 4, opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
              }}>
              {loading ? tx.loggingIn : tx.loginBtn}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.25)', marginTop: 24, fontWeight: 500 }}>
          {tx.noAccount}{' '}
          <Link href="/signup" style={{ color: '#06b6d4', fontWeight: 700, textDecoration: 'none' }}>{tx.signupLink}</Link>
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
        .kpick-input::placeholder { color: rgba(255,255,255,0.2); }
        .kpick-input:focus {
          border-color: rgba(6,182,212,0.4) !important;
          background: rgba(6,182,212,0.05) !important;
          box-shadow: 0 0 0 3px rgba(6,182,212,0.08);
        }
        .google-btn:hover { background: rgba(255,255,255,0.09) !important; border-color: rgba(255,255,255,0.16) !important; }
        .google-btn:active { transform: scale(0.98); }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(6,182,212,0.4) !important;
        }
        .submit-btn:not(:disabled):active { transform: scale(0.98); }
      `}</style>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const inputStyle = {
  width: '100%', background: '#ffffff', border: '1px solid #e0e0f0',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#1e1b4b',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('이메일 또는 비밀번호가 올바르지 않아요.'); setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    const role = profile?.role ?? 'talent'
    window.location.href = role === 'admin' ? '/admin/users' : role === 'agency' ? '/agency/discover' : '/dashboard'
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#f0f0f8' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }} />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center" style={{ marginBottom: '8vh' }}>
        <div className="flex flex-col items-center mb-8">
          <div style={{
            width: 72, height: 72, borderRadius: 22, marginBottom: 16,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
          }}>
            <span style={{ color: 'white', fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>K</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e1b4b', marginBottom: 4, letterSpacing: -0.5 }}>KVERSE</h1>
          <p style={{ fontSize: 13, color: '#8b8baa', fontWeight: 500 }}>기획사가 직접 보는 오디션 플랫폼</p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl transition active:scale-95"
            style={{ background: '#fff', color: '#1e1b4b', fontSize: 16, fontWeight: 700, border: '1px solid #d8d8ec', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            Google로 로그인
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#d8d8ec' }} />
            <span style={{ fontSize: 12, color: '#8b8baa', fontWeight: 600 }}>이메일로 로그인</span>
            <div className="flex-1 h-px" style={{ background: '#d8d8ec' }} />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="이메일" required style={inputStyle} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호" required style={inputStyle} />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl text-white disabled:opacity-50 transition active:scale-95 mt-1"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm font-medium mt-1" style={{ color: '#8b8baa' }}>
            계정이 없으신가요?{' '}
            <Link href="/signup" style={{ color: '#6366f1', fontWeight: 700 }}>가입하기</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

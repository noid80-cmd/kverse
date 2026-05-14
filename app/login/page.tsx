'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'

export default function LoginPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupUrl, setSignupUrl] = useState('/signup')

  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get('back') || ''
    setSignupUrl(back ? `/signup?back=${back}` : '/signup')
  }, [])

  function getBackUrl() {
    const params = new URLSearchParams(window.location.search)
    return params.get('back') || '/'
  }

  async function handleGoogle() {
    const back = getBackUrl()
    sessionStorage.setItem('auth_back', back)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(t('auth.loginError'))
    } else if (data.user) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('account_type')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      window.location.href = acc?.account_type === 'scout' ? '/scout' : getBackUrl()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
        <div className="text-center mb-10">
          <Link href="/"><KverseLogo size="xl" /></Link>
          <p className="text-white/50 mt-3 text-sm">{t('auth.login')}</p>
        </div>

        {/* Google 로그인 */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-medium py-3 rounded-xl transition hover:bg-gray-100 mb-4"
        >
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
          {t('auth.googleBtn')}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/20 text-xs">{t('auth.orEmail')}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-white/60 text-sm mb-1.5 block text-start">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              dir="ltr"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block text-start">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              dir="ltr"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full disabled:opacity-50 text-white font-medium py-3 rounded-xl transition mt-2"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}
          >
            {loading ? t('common.processing') : t('auth.login')}
          </button>
        </form>

        <p className="text-center mt-4">
          <Link href="/forgot-password" className="text-white/30 hover:text-white/60 text-sm transition">
            {t('auth.forgotPassword')}
          </Link>
        </p>

        <p className="text-center text-white/40 text-sm mt-4">
          {t('auth.noAccount')}{' '}
          <a href={signupUrl} className="text-pink-400 hover:underline">
            {t('auth.signup')}
          </a>
        </p>
      </div>
    </div>
  )
}

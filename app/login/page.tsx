'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { setActiveAccountId } from '@/lib/activeAccount'
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

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(t('auth.loginError'))
    } else if (data.user) {
      // 첫 번째 계정을 활성 계정으로 자동 설정
      const { data: acc } = await supabase
        .from('accounts').select('id').eq('user_id', data.user.id).limit(1).maybeSingle()
      if (acc) setActiveAccountId(acc.id)
      window.location.href = getBackUrl()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <button onClick={() => history.length > 1 ? history.back() : window.location.href = '/'} className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <div className="text-center mb-10">
          <Link href="/"><KverseLogo size="xl" /></Link>
          <p className="text-white/50 mt-3 text-sm">{t('auth.login')}</p>
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

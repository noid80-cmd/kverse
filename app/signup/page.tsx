'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setActiveAccountId } from '@/lib/activeAccount'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'

const COUNTRIES = [
  { code: 'KR', name: '🇰🇷 South Korea' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'CN', name: '🇨🇳 China' },
  { code: 'TH', name: '🇹🇭 Thailand' },
  { code: 'PH', name: '🇵🇭 Philippines' },
  { code: 'ID', name: '🇮🇩 Indonesia' },
  { code: 'MY', name: '🇲🇾 Malaysia' },
  { code: 'VN', name: '🇻🇳 Vietnam' },
  { code: 'TW', name: '🇹🇼 Taiwan' },
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'MX', name: '🇲🇽 Mexico' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'SA', name: '🇸🇦 Saudi Arabia' },
  { code: 'TR', name: '🇹🇷 Turkey' },
  { code: 'AR', name: '🇦🇷 Argentina' },
  { code: 'CL', name: '🇨🇱 Chile' },
  { code: 'CO', name: '🇨🇴 Colombia' },
  { code: 'PE', name: '🇵🇪 Peru' },
  { code: 'EG', name: '🇪🇬 Egypt' },
  { code: 'NG', name: '🇳🇬 Nigeria' },
  { code: 'OTHER', name: '🌍 Other' },
]

export default function SignupPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function getBackUrl() {
    const params = new URLSearchParams(window.location.search)
    return params.get('back') || '/feed'
  }

  async function handleSignup(e: React.SyntheticEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { country } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // 시민 계정 자동 생성
      const { data: newAcc, error: accError } = await supabase
        .from('accounts')
        .insert({
          user_id: data.session.user.id,
          group_id: null,
          username: username.trim(),
          display_name: username.trim(),
        })
        .select('id')
        .single()

      if (accError) {
        if (accError.code === '23505') {
          setError('이미 사용 중인 닉네임이에요.')
        } else {
          setError('계정 생성 중 오류가 발생했어요.')
        }
        setLoading(false)
        return
      }

      if (newAcc) setActiveAccountId(newAcc.id)
      window.location.href = getBackUrl()
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-6">📧</div>
          <h2 className="text-2xl font-bold text-white mb-3">{t('auth.checkEmail')}</h2>
          <p className="text-white/50">
            {t('auth.emailSent', { email }).split('\n')[0]}<br />
            {t('auth.emailSent', { email }).split('\n')[1]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link href="/login" className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
        <div className="text-center mb-10">
          <Link href="/login"><KverseLogo size="xl" /></Link>
          <p className="text-white/50 mt-3 text-sm">{t('auth.newAccount')}</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
              placeholder={t('auth.passwordMinPlaceholder')}
              required
              minLength={6}
              dir="ltr"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block text-start">닉네임 (Fan Nick)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="영문·숫자·_ 3~20자"
              required
              minLength={3}
              maxLength={20}
              dir="ltr"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block text-start">{t('auth.country')}</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition appearance-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" disabled style={{ background: '#111' }}>— select —</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code} style={{ background: '#111' }}>{c.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full disabled:opacity-50 text-white font-medium py-3 rounded-xl transition mt-2"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}
          >
            {loading ? t('common.processing') : t('auth.signup')}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-pink-400 hover:underline">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}

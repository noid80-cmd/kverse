'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import KverseLogo from '@/app/components/KverseLogo'

export default function ForgotPasswordPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-4" dir="ltr">
          <Link href="/login" className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-10">
          <Link href="/"><KverseLogo size="xl" /></Link>
          <p className="text-white/50 mt-3 text-sm">{t('auth.forgotPassword')}</p>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">📬</div>
            <p className="text-white font-semibold mb-2">{t('auth.resetSent')}</p>
            <p className="text-white/40 text-sm">{t('auth.resetSentDesc').replace('{email}', email)}</p>
            <Link href="/login" className="block mt-8 text-pink-400 text-sm hover:underline">
              ← {t('auth.login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full disabled:opacity-50 text-white font-medium py-3 rounded-xl transition mt-2"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}
            >
              {loading ? t('common.processing') : t('auth.sendResetLink')}
            </button>

            <p className="text-center text-white/40 text-sm mt-2">
              <Link href="/login" className="text-pink-400 hover:underline">
                ← {t('auth.login')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

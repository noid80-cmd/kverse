'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

function CompleteInner() {
  const t = useT()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function getBackUrl() {
    return searchParams.get('back') || '/feed'
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (username.length === 0) { setUsernameStatus('idle'); return }
    if (username.length < 3) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('accounts').select('id').eq('username', username).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [username])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (usernameStatus !== 'available' || loading) return
    setLoading(true)
    setError('')

    const user = await getAuthUser()
    if (!user) { window.location.href = '/login'; return }

    const { error: accError } = await supabase.from('accounts').insert({
      user_id: user.id,
      group_id: null,
      username: username.trim(),
      display_name: username.trim(),
    })

    if (accError) {
      setError(accError.code === '23505' ? t('prof.usernameTaken') : t('auth.loginError'))
      setLoading(false)
      return
    }

    window.location.href = getBackUrl()
  }

  const borderColor =
    usernameStatus === 'available' ? 'border-green-500' :
    usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500/70' :
    'border-white/10'

  const hint =
    usernameStatus === 'available' ? { text: t('prof.usernameHint') + ' ✓', color: 'text-green-400' } :
    usernameStatus === 'taken' ? { text: t('prof.usernameTaken'), color: 'text-red-400' } :
    usernameStatus === 'checking' ? { text: '...', color: 'text-white/30' } :
    usernameStatus === 'invalid' ? { text: t('prof.usernameHint'), color: 'text-white/30' } :
    { text: t('prof.usernameHint'), color: 'text-white/25' }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/"><KverseLogo size="xl" /></Link>
          <h2 className="text-white font-bold text-xl mt-6 mb-2">{t('auth.completeTitle')}</h2>
          <p className="text-white/40 text-sm">{t('auth.completeDesc')}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder={t('prof.usernameHint')}
              required
              minLength={3}
              maxLength={20}
              autoFocus
              dir="ltr"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition text-center text-lg font-bold ${borderColor}`}
            />
            <p className={`text-xs mt-1.5 text-center transition ${hint.color}`}>{hint.text}</p>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={usernameStatus !== 'available' || loading}
            className="w-full disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition mt-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}
          >
            {loading ? t('common.processing') : t('auth.startBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SignupCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CompleteInner />
    </Suspense>
  )
}

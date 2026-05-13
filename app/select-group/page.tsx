'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { GROUP_THEMES, worldName, groupDisplayName } from '@/lib/groupThemes'
import { setActiveAccountId } from '@/lib/activeAccount'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'

type Group = { id: string; name: string; name_en: string }

export default function SelectGroupPage() {
  const t = useT()
  const { locale } = useLanguage()
  const [groups, setGroups] = useState<Group[]>([])
  const [selected, setSelected] = useState<Group | null>(null)
  const [username, setUsername] = useState('')
  const [step, setStep] = useState<'group' | 'username' | 'viewer'>('group')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backUrl, setBackUrl] = useState('/feed')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const back = params.get('back')
    if (back) setBackUrl(back)
    const groupParam = params.get('group')
    supabase.from('groups').select('*').then(({ data }) => {
      if (data) {
        setGroups(data)
        if (groupParam) {
          const match = data.find((g: Group) => g.name === groupParam)
          if (match) {
            setSelected(match)
            setStep('username')
          }
        }
      }
    })
  }, [])

  async function handleCreateAccount() {
    if (!selected || !username.trim()) return
    setError('')
    setLoading(true)

    const user = await getAuthUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: newAcc, error } = await supabase.from('accounts').insert({
      user_id: user.id,
      group_id: selected.id,
      username: username.trim(),
      display_name: username.trim(),
      gender: 'female',
    }).select('id').single()

    if (error) {
      setError(error.code === '23505' ? '이미 사용 중인 팬닉이에요.' : '오류가 발생했어요.')
    } else {
      if (newAcc) setActiveAccountId(newAcc.id)
      window.location.href = backUrl
    }
    setLoading(false)
  }

  async function handleCreateViewerAccount() {
    if (!username.trim()) return
    setError('')
    setLoading(true)

    const user = await getAuthUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: newAcc, error } = await supabase.from('accounts').insert({
      user_id: user.id,
      group_id: null,
      username: username.trim(),
      display_name: username.trim(),
    }).select('id').single()

    if (error) {
      setError(error.code === '23505' ? '이미 사용 중인 팬닉이에요.' : '오류가 발생했어요.')
    } else {
      if (newAcc) setActiveAccountId(newAcc.id)
      window.location.href = '/browse'
    }
    setLoading(false)
  }

  const theme = selected ? GROUP_THEMES[selected.name] : null

  if (step === 'viewer') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 p-8 rounded-3xl border border-white/10 bg-white/5">
            <div className="text-5xl mb-3">👀</div>
            <h1 className="text-2xl font-black text-white">{t('sg.fanOnly')}</h1>
            <p className="text-white/40 text-sm mt-2 leading-relaxed">
              {t('sg.fanDesc').split('\n')[0]}<br />{t('sg.fanDesc').split('\n')[1]}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">{t('sg.fanNick')} (Fan Nick)</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder={t('sg.fanNickDesc')}
                maxLength={20}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={handleCreateViewerAccount}
              disabled={loading || username.length < 3}
              className="w-full text-white font-medium py-3 rounded-xl transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #EC4899, #7C3AED)' }}
            >
              {loading ? t('sg.creating') : t('sg.enterFeed')}
            </button>

            <button onClick={() => setStep('group')} className="text-white/40 text-sm text-center hover:text-white/60 transition">
              {t('sg.backToSelect')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'username' && selected && theme) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-white/40 text-xs tracking-widest uppercase">{selected.name_en}</p>
            <h1 className="text-2xl font-black text-white mt-1">{theme.world}</h1>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">{t('sg.fanNick')} (Fan Nick)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder={t('sg.fanNickDesc')}
                maxLength={20}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition ${theme.borderColor} focus:border-opacity-100`}
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={handleCreateAccount}
              disabled={loading || username.length < 3}
              className="w-full text-white font-medium py-3 rounded-xl transition disabled:opacity-50"
              style={{ background: theme.gradient }}
            >
              {loading ? t('sg.creating') : `${worldName(theme, locale)} ${t('sg.enter')}`}
            </button>

            <button onClick={() => setStep('group')} className="text-white/40 text-sm text-center hover:text-white/60">
              {t('sg.backToGroup')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/"><KverseLogo size="xl" /></Link>
          <h1 className="text-3xl font-black text-white mt-4">{t('sg.title')}</h1>
          <p className="text-white/40 mt-2 text-sm">{t('sg.desc')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map((group) => {
            const grpT = GROUP_THEMES[group.name]
            const isSelected = selected?.id === group.id
            if (!grpT) return null
            return (
              <button
                key={group.id}
                onClick={() => setSelected(group)}
                className={`relative overflow-hidden rounded-2xl p-6 text-center transition-all duration-200 ${
                  isSelected ? 'scale-105 ring-4 ring-white/40' : 'opacity-75 hover:opacity-100 hover:scale-102'
                }`}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: grpT.gradient }}
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative z-10">
                  <div className="text-4xl mb-2">{grpT.emoji}</div>
                  <div className="font-semibold text-white text-base">{groupDisplayName(group.name, locale)}</div>
                  <div
                    className="text-xs mt-1 font-medium"
                    style={{ color: grpT.primary === '#FFFFFF' ? '#C9A96E' : grpT.primary }}
                  >
                    {grpT.world}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-medium text-black">
                    ✓
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {selected && theme && (
          <div className="mt-10 text-center">
            <p className="text-white/40 text-sm mb-4">
              <span style={{ color: theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary }} className="font-bold">
                {theme.world}
              </span>
              {' '}{t('sg.startJourney')}
            </p>
            <button
              onClick={() => setStep('username')}
              className="px-12 py-4 text-white font-bold rounded-full transition text-lg shadow-lg"
              style={{ background: theme.gradient }}
            >
              {t('sg.selectUniverse')}
            </button>
          </div>
        )}

        {/* 뷰어 진입 */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm mb-3">{t('sg.notSure')}</p>
          <button
            onClick={() => setStep('viewer')}
            className="px-8 py-3.5 rounded-full border border-white/30 text-white/80 hover:text-white hover:border-white/60 hover:bg-white/5 text-sm font-semibold transition"
          >
            {t('sg.justBrowse')}
          </button>
        </div>
      </div>
    </div>
  )
}

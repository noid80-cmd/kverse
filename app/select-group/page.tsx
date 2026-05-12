'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { GROUP_THEMES, worldName, groupDisplayName } from '@/lib/groupThemes'
import { COUNTRIES, getFlagImageUrl } from '@/lib/countries'
import Avatar from '@/app/components/Avatar'
import { useRouter } from 'next/navigation'
import { useT, useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import KverseLogo from '@/app/components/KverseLogo'

type Group = { id: string; name: string; name_en: string }

export default function SelectGroupPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const [groups, setGroups] = useState<Group[]>([])
  const [selected, setSelected] = useState<Group | null>(null)
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [nationality, setNationality] = useState('KR')
  const [countrySearch, setCountrySearch] = useState('')
  const [step, setStep] = useState<'group' | 'username' | 'viewer'>('group')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('groups').select('*').then(({ data }) => {
      if (data) setGroups(data)
    })
  }, [])

  async function handleCreateAccount() {
    if (!selected || !username.trim()) return
    setError('')
    setLoading(true)

    const user = await getAuthUser()
    if (!user) { router.push('/login'); return }

    const { data: existing } = await supabase
      .from('accounts').select('id').eq('user_id', user.id)

    if (existing && existing.length >= 3) {
      setError('무료 계정은 최대 3개까지 만들 수 있어요.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      group_id: selected.id,
      username: username.trim(),
      display_name: username.trim(),
      gender,
      nationality,
    })

    if (error) {
      setError(error.code === '23505' ? '이미 사용 중인 팬닉이에요.' : '오류가 발생했어요.')
    } else {
      router.push('/feed')
    }
    setLoading(false)
  }

  async function handleCreateViewerAccount() {
    if (!username.trim()) return
    setError('')
    setLoading(true)

    const user = await getAuthUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      group_id: null,
      username: username.trim(),
      display_name: username.trim(),
      nationality,
    })

    if (error) {
      setError(error.code === '23505' ? '이미 사용 중인 팬닉이에요.' : '오류가 발생했어요.')
    } else {
      router.push('/browse')
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

            {/* 국가 선택 */}
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">🌍 {t('sg.nationality')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder={locale === 'ko' ? COUNTRIES.find(c => c.code === nationality)?.nameKo ?? '' : COUNTRIES.find(c => c.code === nationality)?.name ?? ''}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-pink-500/50 transition text-sm"
                />
                {countrySearch.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                    {COUNTRIES.filter(c =>
                      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                      c.nameKo.includes(countrySearch)
                    ).map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setNationality(c.code); setCountrySearch('') }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-left text-sm"
                      >
                        <img src={getFlagImageUrl(c.code, 20)} alt={c.code} className="w-6 h-4 rounded-sm object-cover flex-shrink-0" />
                        <span className="text-white">{locale === 'ko' ? c.nameKo : c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {nationality && !countrySearch && (
                <p className="text-white/40 text-xs mt-1.5 px-1">
                  <img src={getFlagImageUrl(nationality, 20)} alt={nationality} className="inline w-5 h-3 rounded-sm object-cover mr-1" />{locale === 'ko' ? COUNTRIES.find(c => c.code === nationality)?.nameKo : COUNTRIES.find(c => c.code === nationality)?.name}
                </p>
              )}
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
    const accentColor = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-white/40 text-xs tracking-widest uppercase">{selected.name_en}</p>
            <h1 className="text-2xl font-black text-white mt-1">{theme.world}</h1>
          </div>

          {/* 아바타 미리보기 + 성별 선택 */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="rounded-3xl p-4 mb-4 border"
              style={{ background: `${accentColor}10`, borderColor: `${accentColor}30` }}
            >
              <Avatar
                gender={gender}
                groupColor={theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary}
                size={120}
              />
            </div>
            <p className="text-white/30 text-xs mb-3">{t('sg.selectAvatar')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setGender('female')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition border"
                style={gender === 'female'
                  ? { background: theme.gradient, borderColor: 'transparent', color: 'white' }
                  : { borderColor: `${accentColor}30`, color: `${accentColor}60` }
                }
              >
                {t('sg.female')}
              </button>
              <button
                onClick={() => setGender('male')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition border"
                style={gender === 'male'
                  ? { background: theme.gradient, borderColor: 'transparent', color: 'white' }
                  : { borderColor: `${accentColor}30`, color: `${accentColor}60` }
                }
              >
                {t('sg.male')}
              </button>
            </div>
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

            {/* 국가 선택 */}
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">🌍 {t('sg.nationality')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder={locale === 'ko' ? COUNTRIES.find(c => c.code === nationality)?.nameKo ?? '' : COUNTRIES.find(c => c.code === nationality)?.name ?? ''}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-pink-500/50 transition text-sm"
                />
                {countrySearch.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                    {COUNTRIES.filter(c =>
                      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                      c.nameKo.includes(countrySearch)
                    ).map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setNationality(c.code); setCountrySearch('') }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-left text-sm"
                      >
                        <img src={getFlagImageUrl(c.code, 20)} alt={c.code} className="w-6 h-4 rounded-sm object-cover flex-shrink-0" />
                        <span className="text-white">{locale === 'ko' ? c.nameKo : c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {nationality && !countrySearch && (
                <p className="text-white/40 text-xs mt-1.5 px-1">
                  <img src={getFlagImageUrl(nationality, 20)} alt={nationality} className="inline w-5 h-3 rounded-sm object-cover mr-1" />{locale === 'ko' ? COUNTRIES.find(c => c.code === nationality)?.nameKo : COUNTRIES.find(c => c.code === nationality)?.name}
                </p>
              )}
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
          <div className="flex justify-end mb-2" dir="ltr"><LanguageSwitcher /></div>
          <KverseLogo size="xl" />
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
        <div className="mt-12 pt-8 border-t border-white/8 text-center">
          <p className="text-white/25 text-sm mb-3">{t('sg.notSure')}</p>
          <button
            onClick={() => setStep('viewer')}
            className="px-8 py-3 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-sm font-medium transition"
          >
            {t('sg.justBrowse')}
          </button>
        </div>
      </div>
    </div>
  )
}

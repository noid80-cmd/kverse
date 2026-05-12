'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, GroupTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'

type Account = {
  id: string
  username: string
  groups: { name: string }
}

type ConvAccount = {
  id: string
  username: string
  groups: { name: string }
}

type Conversation = {
  id: string
  updated_at: string
  account1: ConvAccount
  account2: ConvAccount
}

function DMListInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT()
  const { locale } = useLanguage()
  const [account, setAccount] = useState<Account | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<GroupTheme | null>(null)
  const [search, setSearch] = useState(searchParams.get('to') || '')
  const [searchResults, setSearchResults] = useState<Account[]>([])

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const activeId = getActiveAccountId()
      let q = supabase.from('accounts').select('*, groups(name)').eq('user_id', user.id)
      if (activeId) q = q.eq('id', activeId)
      const { data: acc } = await q.limit(1).single()

      if (!acc) { router.push('/select-account'); return }
      setAccount(acc)
      setTheme(getTheme(acc.groups.name))

      const { data: convs } = await supabase
        .from('conversations')
        .select('*, account1:account1_id(id, username, groups(name)), account2:account2_id(id, username, groups(name))')
        .or(`account1_id.eq.${acc.id},account2_id.eq.${acc.id}`)
        .order('updated_at', { ascending: false })

      setConversations((convs as Conversation[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSearch(q: string) {
    setSearch(q)
    if (q.trim().length < 2) { setSearchResults([]); return }

    const { data } = await supabase
      .from('accounts')
      .select('id, username, groups(name)')
      .ilike('username', `%${q}%`)
      .neq('id', account?.id ?? '')
      .limit(5)

    setSearchResults((data as unknown as Account[]) || [])
  }

  async function startConversation(otherId: string) {
    if (!account) return
    setSearch('')
    setSearchResults([])

    const id1 = account.id < otherId ? account.id : otherId
    const id2 = account.id < otherId ? otherId : account.id

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('account1_id', id1)
      .eq('account2_id', id2)
      .single()

    if (existing) { router.push(`/dm/${existing.id}`); return }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ account1_id: id1, account2_id: id2 })
      .select('id')
      .single()

    if (newConv) router.push(`/dm/${newConv.id}`)
  }

  function getOther(conv: Conversation) {
    return conv.account1.id === account?.id ? conv.account2 : conv.account1
  }

  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">Loading Universe...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">{t('nav.home')}</Link>
          <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">{t('nav.back')}</Link>
        </div>
        <span className="font-black text-white">{t('dm.title')}</span>
        <div />
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* 유저 검색 */}
        <div className="relative mb-6">
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t('dm.search')}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition text-sm"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-10">
              {searchResults.map(u => {
                const srTheme = getTheme((u.groups as any)?.name || '')
                return (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                      style={{ background: srTheme.gradient }}
                    >
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">@{u.username}</p>
                      <p className="text-white/30 text-xs">{groupDisplayName((u.groups as any)?.name || '', locale)}</p>
                    </div>
                    <span className="ml-auto text-white/20 text-xs">DM →</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 대화 목록 */}
        {conversations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm">{t('dm.noConversations')}<br />{t('dm.search')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map(conv => {
              const other = getOther(conv)
              const convTheme = getTheme((other.groups as any)?.name || '')
              return (
                <Link
                  key={conv.id}
                  href={`/dm/${conv.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border transition hover:bg-white/5"
                  style={{ borderColor: `${accentColor}15` }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
                    style={{ background: convTheme.gradient }}
                  >
                    {other.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">@{other.username}</p>
                    <p className="text-white/30 text-xs">{groupDisplayName((other.groups as any)?.name || '', locale)} · {convTheme.emoji} {worldName(convTheme, locale)}</p>
                  </div>
                  <span className="text-white/20 text-xs">→</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DMListPage() {
  return (
    <Suspense>
      <DMListInner />
    </Suspense>
  )
}

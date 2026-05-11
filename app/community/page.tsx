'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getTheme, GroupTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import KverseLogo from '@/app/components/KverseLogo'
import { getFlagImageUrl } from '@/lib/countries'

type Account = {
  id: string
  username: string
  group_id: string
  nationality?: string
  groups: { name: string }
}

type Post = {
  id: string
  content: string
  created_at: string
  accounts: { username: string; groups: { name: string } }
}

export default function CommunityPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const [account, setAccount] = useState<Account | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [theme, setTheme] = useState<GroupTheme | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const activeId = getActiveAccountId()
      let accountQuery = supabase.from('accounts').select('*, groups(name)').eq('user_id', user.id)
      if (activeId) accountQuery = accountQuery.eq('id', activeId)
      const { data: acc } = await accountQuery.limit(1).single()

      if (!acc) { router.push('/select-account'); return }
      setAccount(acc)
      setTheme(getTheme(acc.groups.name))

      await fetchPosts(acc.group_id)
      setLoading(false)
    }
    load()
  }, [])

  async function fetchPosts(groupId: string) {
    const { data } = await supabase
      .from('posts')
      .select('*, accounts(username, groups(name))')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts(data || [])
  }

  async function handlePost() {
    if (!account || !content.trim()) return
    setPosting(true)

    const { data, error } = await supabase.from('posts').insert({
      account_id: account.id,
      group_id: account.group_id,
      content: content.trim(),
    }).select('*, accounts(username, groups(name))').single()

    if (!error && data) {
      setPosts(prev => [data, ...prev])
      setContent('')
    }
    setPosting(false)
  }

  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return t('common.justNow')
    if (m < 60) return t('common.minsAgo', { n: m })
    const h = Math.floor(m / 60)
    if (h < 24) return t('common.hoursAgo', { n: h })
    return t('common.daysAgo', { n: Math.floor(h / 24) })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">Loading Universe...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* 네비게이션 */}
      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">{t('nav.home')}</Link>
          <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">{t('nav.back')}</Link>
        </div>
        <KverseLogo />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/profile" className="text-white/40 hover:text-white transition text-sm">{t('nav.profile')}</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: theme?.gradient }}
          >
            {theme?.emoji}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{account?.groups.name ? groupDisplayName(account.groups.name, locale) : ''} {t('nav.community')}</h1>
            <p className="text-xs" style={{ color: `${accentColor}80` }}>{theme ? worldName(theme, locale) : ''} {t('comm.fanSpace')}</p>
          </div>
        </div>

        {/* 글 작성 */}
        <div
          className="rounded-2xl p-4 mb-8 border"
          style={{ borderColor: `${accentColor}30`, background: `${accentColor}08` }}
        >
          <div className="flex gap-3">
            <div className="relative flex-shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: theme?.gradient }}
              >
                {account?.username.charAt(0).toUpperCase()}
              </div>
              <img
                src={getFlagImageUrl(account?.nationality || 'KR', 20)}
                alt={account?.nationality || 'KR'}
                className="absolute -bottom-1 -right-1 w-5 h-3 rounded-sm object-cover shadow"
              />
            </div>
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`${theme ? worldName(theme, locale) : ''}${t('comm.placeholder')}`}
                maxLength={500}
                rows={3}
                className="w-full bg-transparent text-white placeholder-white/20 resize-none focus:outline-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <span className="text-white/20 text-xs">{content.length}/500</span>
                <button
                  onClick={handlePost}
                  disabled={posting || content.trim().length === 0}
                  className="px-5 py-1.5 rounded-full text-white text-sm font-medium transition disabled:opacity-40"
                  style={{ background: theme?.gradient }}
                >
                  {posting ? t('comm.posting') : t('comm.post')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 게시글 목록 */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">{theme?.emoji}</div>
            <p className="text-white/30 text-sm">{t('comm.noPosts')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map(post => (
              <div
                key={post.id}
                className="rounded-xl p-4 border"
                style={{ borderColor: `${accentColor}15`, background: `${accentColor}06` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: theme?.gradient }}
                  >
                    {post.accounts.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-semibold">@{post.accounts.username}</span>
                  <span className="text-white/20 text-xs ml-auto">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

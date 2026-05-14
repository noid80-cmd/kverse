'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { useRouter, useSearchParams } from 'next/navigation'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'
import { getFlagImageUrl } from '@/lib/countries'
import Link from 'next/link'

type Account = {
  id: string
  username: string
  nationality?: string
}

type Post = {
  id: string
  content: string
  created_at: string
  like_count: number
  accounts: { username: string }
}

function CommunityContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT()
  const { locale } = useLanguage()
  const groupName = searchParams.get('group') || ''
  const theme = getTheme(groupName)
  const accentColor = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary

  const [account, setAccount] = useState<Account | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!groupName) { router.push('/'); return }
    async function load() {
      const user = await getAuthUser()
      if (!user) {
        router.push(`/login?back=${encodeURIComponent(`/community?group=${groupName}`)}`)
        return
      }

      const [accRes, groupRes] = await Promise.all([
        supabase.from('accounts').select('id, username, nationality').eq('user_id', user.id).limit(1).maybeSingle(),
        supabase.from('groups').select('id').eq('name', groupName).single(),
      ])

      if (!accRes.data) { router.push('/signup'); return }
      if (!groupRes.data) { router.push('/'); return }

      setAccount(accRes.data)
      setGroupId(groupRes.data.id)

      const [postsRes, likesRes] = await Promise.all([
        supabase.from('posts').select('*, accounts(username)').eq('group_id', groupRes.data.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('post_likes').select('post_id').eq('account_id', accRes.data.id),
      ])
      setPosts(postsRes.data || [])
      setLikedPostIds(new Set((likesRes.data || []).map((r: { post_id: string }) => r.post_id)))
      setLoading(false)
    }
    load()
  }, [groupName])

  async function handlePost() {
    if (!account || !groupId || !content.trim()) return
    setPosting(true)
    const { data, error } = await supabase
      .from('posts')
      .insert({ account_id: account.id, group_id: groupId, content: content.trim() })
      .select('*, accounts(username)')
      .single()
    if (!error && data) {
      setPosts(prev => [{ ...data, like_count: 0 }, ...prev])
      setContent('')
    }
    setPosting(false)
  }

  async function handleDelete(postId: string) {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function toggleLike(post: Post) {
    if (!account) return
    const liked = likedPostIds.has(post.id)
    setLikedPostIds(prev => {
      const next = new Set(prev)
      liked ? next.delete(post.id) : next.add(post.id)
      return next
    })
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, like_count: p.like_count + (liked ? -1 : 1) } : p))
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('account_id', account.id)
      await supabase.from('posts').update({ like_count: post.like_count - 1 }).eq('id', post.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, account_id: account.id })
      await supabase.from('posts').update({ like_count: post.like_count + 1 }).eq('id', post.id)
    }
  }

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
        <div className="text-pink-400 text-xl font-medium animate-pulse">{t('common.loadingUniverse')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 grid grid-cols-3 items-center">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white transition text-sm text-left">← 뒤로</button>
        <div className="flex justify-center"><KverseLogo /></div>
        <div className="flex justify-end">
          <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">내 SNS</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: theme.gradient }}>
            {theme.emoji}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{groupDisplayName(groupName, locale)} {t('nav.community')}</h1>
            <p className="text-xs" style={{ color: `${accentColor}80` }}>{worldName(theme, locale)} · {t('comm.fanSpace')}</p>
          </div>
        </div>

        {/* 글 작성 */}
        <div className="rounded-2xl p-4 mb-8 border" style={{ borderColor: `${accentColor}50`, background: `${accentColor}18` }}>
          <div className="flex gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: theme.gradient }}>
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
                placeholder={`${worldName(theme, locale)}${t('comm.placeholder')}`}
                maxLength={500}
                rows={3}
                className="w-full bg-transparent text-white placeholder-white/40 resize-none focus:outline-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <span className="text-white/50 text-xs">{content.length}/500</span>
                <button
                  onClick={handlePost}
                  disabled={posting || content.trim().length === 0}
                  className="px-5 py-1.5 rounded-full text-white text-sm font-medium transition disabled:opacity-40"
                  style={{ background: theme.gradient }}
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
            <div className="text-5xl mb-3">{theme.emoji}</div>
            <p className="text-white/60 text-sm">{t('comm.noPosts')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map(post => (
              <div key={post.id} className="rounded-xl p-4 border" style={{ borderColor: `${accentColor}28`, background: `${accentColor}14` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: theme.gradient }}>
                    {post.accounts.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-semibold">@{post.accounts.username}</span>
                  <span className="text-white/50 text-xs ml-auto">{timeAgo(post.created_at)}</span>
                  {post.accounts.username === account?.username && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-white/20 hover:text-red-400 hover:bg-red-400/10 transition text-xs"
                    >
                      🗑
                    </button>
                  )}
                </div>
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => toggleLike(post)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition"
                    style={likedPostIds.has(post.id)
                      ? { background: theme.gradient, color: 'white' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.2)' }
                    }
                  >
                    ♥ {post.like_count}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CommunityContent />
    </Suspense>
  )
}

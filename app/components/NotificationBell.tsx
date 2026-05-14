'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useT } from '@/lib/i18n'

type Notification = {
  id: string
  type: 'like' | 'comment' | 'scout_view' | 'follow'
  from_username: string
  video_id?: string | null
  video_title?: string | null
  video_group?: string
  is_read: boolean
  created_at: string
}

type Props = {
  accountId: string
  groupGradient?: string
}

export default function NotificationBell({ accountId, groupGradient }: Props) {
  const t = useT()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [followedBack, setFollowedBack] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    fetchNotifs()

    const channel = supabase
      .channel(`notifs-${accountId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `account_id=eq.${accountId}`,
      }, payload => {
        setNotifs(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [accountId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifs() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifs(data || [])
  }

  async function handleOpen() {
    setOpen(v => !v)
    if (!open && unread > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('account_id', accountId)
        .eq('is_read', false)
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  async function handleFollowBack(fromUsername: string) {
    const { data: acc } = await supabase
      .from('accounts').select('id').eq('username', fromUsername).maybeSingle()
    if (!acc) return
    await supabase.from('follows').insert({ follower_id: accountId, following_id: acc.id })
    await supabase.from('notifications').insert({
      account_id: acc.id,
      type: 'follow',
      from_username: (await supabase.from('accounts').select('username').eq('id', accountId).maybeSingle()).data?.username || '',
    })
    setFollowedBack(prev => new Set([...prev, fromUsername]))
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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition border border-white/20 hover:bg-white/10"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <span className="text-base">🔔</span>
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center text-white px-1"
            style={{ background: groupGradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden border border-white/10 z-50"
          style={{ background: '#111', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">{t('notif.title')}</span>
            {notifs.length > 0 && (
              <button
                onClick={async () => {
                  await supabase.from('notifications').delete().eq('account_id', accountId)
                  setNotifs([])
                }}
                className="text-white/30 text-xs hover:text-white/50 transition"
              >
                {t('notif.clearAll')}
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {notifs.length === 0 ? (
              <div className="text-white/20 text-sm text-center py-10">{t('notif.empty')}</div>
            ) : notifs.map(n => {
              const isFollow = n.type === 'follow'
              const alreadyFollowed = followedBack.has(n.from_username)
              const href = isFollow
                ? `/profile/${n.from_username}`
                : (n.video_group ? `/universe/${encodeURIComponent(n.video_group)}?video=${n.video_id}` : `/feed`)

              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0"
                  style={{ background: n.is_read ? 'transparent' : 'rgba(233,30,140,0.05)' }}
                >
                  <Link href={href} onClick={() => setOpen(false)} className="flex items-start gap-3 flex-1 min-w-0 hover:opacity-80 transition">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold text-white"
                      style={n.type === 'scout_view'
                        ? { background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }
                        : { background: groupGradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }}>
                      {n.type === 'scout_view' ? '🎯' : n.from_username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs leading-relaxed">
                        {n.type === 'scout_view' ? (
                          <><span className="font-bold text-yellow-400">{n.from_username}</span>{t('notif.scoutMsg')}</>
                        ) : isFollow ? (
                          <><span className="font-bold">@{n.from_username}</span>{t('notif.followed')}</>
                        ) : (
                          <><span className="font-bold">@{n.from_username}</span>{n.type === 'like' ? t('notif.liked') : t('notif.commented')}</>
                        )}
                      </p>
                      {n.video_title && <p className="text-white/30 text-xs truncate mt-0.5">{n.video_title}</p>}
                      <p className="text-white/20 text-xs mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isFollow && (
                      <button
                        onClick={() => !alreadyFollowed && handleFollowBack(n.from_username)}
                        className="text-xs px-2.5 py-1 rounded-full font-medium transition"
                        style={alreadyFollowed
                          ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
                          : { background: groupGradient || 'linear-gradient(135deg,#E91E8C,#7B2FBE)', color: 'white' }
                        }
                      >
                        {alreadyFollowed ? '팔로잉 ✓' : '맞팔하기'}
                      </button>
                    )}
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full"
                        style={{ background: '#E91E8C' }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

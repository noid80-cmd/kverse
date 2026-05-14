'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { groupDisplayName } from '@/lib/groupThemes'
import Link from 'next/link'

const ADMIN_EMAIL = 'noid80@hanmail.net'

type Account = {
  id: string
  username: string
  is_founder: boolean
  account_type: string
  agency_name: string | null
  is_scout_verified: boolean
  created_at: string
  groups: { name: string } | null
  users?: { email: string } | null
}

type Tab = 'scout' | 'users'

export default function AdminPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('scout')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user || user.email !== ADMIN_EMAIL) { router.push('/'); return }

      const { data } = await supabase
        .from('accounts')
        .select('id, username, is_founder, account_type, agency_name, is_scout_verified, created_at, groups(name)')
        .order('created_at', { ascending: false })

      setAccounts((data || []).map(a => ({
        ...a,
        groups: Array.isArray(a.groups) ? a.groups[0] : a.groups,
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function approveScout(account: Account) {
    const { error } = await supabase.from('accounts').update({ is_scout_verified: true }).eq('id', account.id)
    if (error) { showToast('오류: ' + error.message, 'error'); return }
    setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, is_scout_verified: true } : a))
    showToast(`✅ ${account.agency_name || account.username} 승인 완료`, 'success')
  }

  async function rejectScout(account: Account) {
    if (!confirm(`@${account.username} Scout 계정을 삭제할까요?`)) return
    const { error } = await supabase.from('accounts').delete().eq('id', account.id)
    if (error) { showToast('오류: ' + error.message, 'error'); return }
    setAccounts(prev => prev.filter(a => a.id !== account.id))
    showToast(`🗑 @${account.username} 삭제`, 'success')
  }

  async function deleteAccount(account: Account) {
    if (!confirm(`@${account.username} 계정과 영상을 모두 삭제할까요?`)) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/admin/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account.id, accessToken: session.access_token }),
    })

    let body: { ok?: boolean; error?: string } = {}
    try { body = await res.json() } catch { /* ignore */ }
    if (!res.ok || !body.ok) {
      showToast('오류: ' + (body.error || res.status), 'error')
      return
    }

    setAccounts(prev => prev.filter(a => a.id !== account.id))
    showToast(`🗑 @${account.username} 삭제됨`, 'success')
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const scouts = accounts.filter(a => a.account_type === 'scout')
  const pendingScouts = scouts.filter(a => !a.is_scout_verified)
  const approvedScouts = scouts.filter(a => a.is_scout_verified)
  const regularUsers = accounts.filter(a => a.account_type !== 'scout')
  const filteredUsers = regularUsers.filter(a =>
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    (a.groups?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'scout', label: '🎯 Scout 승인', badge: pendingScouts.length },
    { key: 'users', label: '👥 전체 유저', badge: regularUsers.length },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30 animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium border ${toast.type === 'error' ? 'border-red-500/30 text-red-300' : 'border-white/20 text-white'}`}
          style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(12px)' }}>
          {toast.msg}
        </div>
      )}

      <nav className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white/40 hover:text-white transition text-sm">← Kverse</Link>
        <span className="font-black text-white">관리자</span>
        <span className="text-xs px-2 py-1 rounded-full font-bold"
          style={{ background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)', color: '#fff' }}>
          ADMIN
        </span>
      </nav>

      {/* 탭 */}
      <div className="border-b border-white/10 px-6 flex gap-1 bg-black/60">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-3.5 text-sm font-medium transition border-b-2 ${tab === t.key ? 'border-pink-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}
          >
            {t.label}
            {!!t.badge && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-black"
                style={{ background: t.badge > 0 ? 'linear-gradient(135deg,#E91E8C,#7B2FBE)' : 'rgba(255,255,255,0.1)', color: 'white' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Scout 승인 탭 */}
        {tab === 'scout' && (
          <div>
            {pendingScouts.length > 0 && (
              <div className="mb-8">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">승인 대기 {pendingScouts.length}건</p>
                <div className="flex flex-col gap-3">
                  {pendingScouts.map(account => (
                    <div key={account.id} className="rounded-2xl border p-4"
                      style={{ background: 'rgba(236,72,153,0.05)', borderColor: 'rgba(236,72,153,0.2)' }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-bold">@{account.username}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }}>
                              Scout
                            </span>
                          </div>
                          <p className="text-pink-300 text-sm font-semibold">{account.agency_name || '기관명 없음'}</p>
                          <p className="text-white/30 text-xs mt-0.5">{new Date(account.created_at).toLocaleDateString('ko-KR')} 가입</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveScout(account)}
                          className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition"
                          style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                          ✅ 승인
                        </button>
                        <button onClick={() => rejectScout(account)}
                          className="px-4 py-2 rounded-xl text-sm font-medium transition"
                          style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approvedScouts.length > 0 && (
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">승인된 Scout {approvedScouts.length}명</p>
                <div className="flex flex-col gap-2">
                  {approvedScouts.map(account => (
                    <div key={account.id} className="rounded-2xl border px-4 py-3 flex items-center gap-3"
                      style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.15)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                        🎯
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">@{account.username}</p>
                        <p className="text-white/40 text-xs">{account.agency_name || '—'}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                        ✓ 승인
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scouts.length === 0 && (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-white/20 text-sm">아직 Scout 가입 신청이 없어요</p>
              </div>
            )}
          </div>
        )}

        {/* 전체 유저 탭 */}
        {tab === 'users' && (
          <div>
            <p className="text-white/30 text-sm mb-4">일반 유저 {regularUsers.length}명</p>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="닉네임 검색..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 mb-4"
            />
            <div className="flex flex-col gap-2">
              {filteredUsers.map(account => (
                <div key={account.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-white/10 text-white/50">
                    {account.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-semibold">@{account.username}</span>
                    <p className="text-white/30 text-xs">{groupDisplayName(account.groups?.name || '', 'ko')} · {new Date(account.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  {account.is_founder && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                      ✦
                    </span>
                  )}
                  <button
                    onClick={() => deleteAccount(account)}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition hover:bg-red-500/20 text-white/20 hover:text-red-400 text-xs"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { groupDisplayName } from '@/lib/groupThemes'

const ADMIN_EMAIL = 'noid80@hanmail.net'

type Account = {
  id: string
  username: string
  is_founder: boolean
  created_at: string
  groups: { name: string }
}

export default function AdminPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/')
        return
      }
      const { data } = await supabase
        .from('accounts')
        .select('id, username, is_founder, created_at, groups(name)')
        .order('created_at', { ascending: false })
      setAccounts((data || []).map(a => ({ ...a, groups: Array.isArray(a.groups) ? a.groups[0] : a.groups })))
      setLoading(false)
    }
    load()
  }, [])

  async function toggleFounder(account: Account) {
    const next = !account.is_founder
    const { error } = await supabase
      .from('accounts')
      .update({ is_founder: next })
      .eq('id', account.id)
    if (error) {
      showToast('오류: ' + error.message)
      return
    }
    setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, is_founder: next } : a))
    showToast(next ? `✦ @${account.username} FOUNDER 부여` : `@${account.username} 뱃지 제거`)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = accounts.filter(a =>
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    a.groups?.name.toLowerCase().includes(search.toLowerCase())
  )
  const founderCount = accounts.filter(a => a.is_founder).length

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
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white text-sm font-medium border border-white/20"
          style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(12px)' }}>
          {toast}
        </div>
      )}

      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="text-white/40 text-sm">Kverse</span>
        <span className="font-black text-white">관리자</span>
        <span className="text-xs px-2 py-1 rounded-full font-bold"
          style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
          ✦ {founderCount} FOUNDER
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="text-white/30 text-sm mb-4">전체 계정 {accounts.length}개</p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="닉네임 또는 그룹으로 검색..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map(account => (
            <div
              key={account.id}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-white/8 transition"
              style={{ background: account.is_founder ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', borderColor: account.is_founder ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-black"
                style={{ background: account.is_founder ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'rgba(255,255,255,0.1)', color: account.is_founder ? '#000' : 'rgba(255,255,255,0.5)' }}>
                {account.is_founder ? '✦' : account.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">@{account.username}</span>
                  {account.is_founder && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000' }}>
                      ✦ FOUNDER
                    </span>
                  )}
                </div>
                <p className="text-white/30 text-xs mt-0.5">
                  {groupDisplayName(account.groups?.name || '', 'ko')} · {new Date(account.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <button
                onClick={() => toggleFounder(account)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition"
                style={account.is_founder
                  ? { background: 'rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.2)' }
                  : { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
                }
              >
                {account.is_founder ? '뱃지 제거' : '✦ FOUNDER 부여'}
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-white/20 text-sm text-center py-12">검색 결과 없음</p>
          )}
        </div>
      </div>
    </div>
  )
}

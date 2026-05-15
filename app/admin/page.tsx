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

type Report = {
  id: string
  video_id: string
  reporter_account_id: string
  reason: string
  created_at: string
  resolved: boolean
  videos: { title: string; accounts: { username: string } | null } | null
  reporter: { username: string } | null
}

type Tab = 'scout' | 'users' | 'reports'

export default function AdminPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [reports, setReports] = useState<Report[]>([])
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

      const { data: reportData } = await supabase
        .from('video_reports')
        .select('*, videos(title, accounts(username)), reporter:reporter_account_id(username)')
        .order('created_at', { ascending: false })

      setReports((reportData || []).map((r: any) => ({
        ...r,
        reporter: Array.isArray(r.reporter) ? r.reporter[0] : r.reporter,
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
    await deleteAccount(account)
  }

  async function deleteAccount(account: Account) {
    if (!confirm(`@${account.username} 계정과 영상을 모두 삭제할까요?`)) return

    const { data: { session } } = await supabase.auth.refreshSession()
    if (!session) { showToast('로그인 세션이 만료됐어요. 다시 로그인해주세요.', 'error'); return }

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

  async function resolveReport(reportId: string) {
    await supabase.from('video_reports').update({ resolved: true }).eq('id', reportId)
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, resolved: true } : r))
    showToast('✅ 신고 처리 완료', 'success')
  }

  async function deleteReportedVideo(report: Report) {
    if (!confirm(`"${report.videos?.title || '영상'}"을(를) 삭제할까요?`)) return
    const { data: { session } } = await supabase.auth.refreshSession()
    if (!session) { showToast('로그인 세션이 만료됐어요. 다시 로그인해주세요.', 'error'); return }
    await supabase.from('videos').delete().eq('id', report.video_id)
    await supabase.from('video_reports').update({ resolved: true }).eq('id', report.id)
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, resolved: true } : r))
    showToast('🗑 영상 삭제 및 신고 처리 완료', 'success')
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const scouts = accounts.filter(a => a.account_type === 'scout')
  const pendingScouts = scouts.filter(a => !a.is_scout_verified)
  const approvedScouts = scouts.filter(a => a.is_scout_verified)
  const regularUsers = accounts.filter(a => a.account_type !== 'scout')
  const suspiciousUsers = regularUsers.filter(a => /^scout_/i.test(a.username))
  const filteredUsers = regularUsers.filter(a =>
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    (a.groups?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const unresolvedReports = reports.filter(r => !r.resolved)

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'scout', label: '🎯 Scout 승인', badge: pendingScouts.length },
    { key: 'users', label: '👥 전체 유저', badge: regularUsers.length },
    { key: 'reports', label: '🚨 신고', badge: unresolvedReports.length },
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

            {scouts.length === 0 && (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-white/20 text-sm">아직 Scout 가입 신청이 없어요</p>
              </div>
            )}
          </div>
        )}

        {/* 신고 탭 */}
        {tab === 'reports' && (
          <div>
            {reports.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🚨</p>
                <p className="text-white/20 text-sm">아직 신고가 없어요</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {unresolvedReports.length > 0 && (
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">미처리 신고 {unresolvedReports.length}건</p>
                )}
                {reports.map(report => (
                  <div key={report.id}
                    className="rounded-2xl border p-4"
                    style={{
                      background: report.resolved ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.05)',
                      borderColor: report.resolved ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.2)',
                    }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">"{report.videos?.title || '삭제된 영상'}"</p>
                        <p className="text-white/40 text-xs mt-0.5">
                          @{report.videos?.accounts?.username || '?'} 업로드 · @{report.reporter?.username || '?'} 신고
                        </p>
                        <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                          {report.reason}
                        </p>
                      </div>
                      {report.resolved ? (
                        <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                          ✓ 처리됨
                        </span>
                      ) : (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => resolveReport(report.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                            처리 완료
                          </button>
                          <button onClick={() => deleteReportedVideo(report)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            영상 삭제
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-white/20 text-xs">{new Date(report.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 전체 유저 탭 */}
        {tab === 'users' && (
          <div>
            {suspiciousUsers.length > 0 && (
              <div className="mb-4 rounded-2xl border border-orange-500/30 p-4" style={{ background: 'rgba(249,115,22,0.07)' }}>
                <p className="text-orange-400 text-xs font-bold mb-2">⚠️ scout_ 사칭 의심 계정 {suspiciousUsers.length}개</p>
                <div className="flex flex-col gap-1.5">
                  {suspiciousUsers.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3">
                      <span className="text-orange-300 text-sm font-mono">@{a.username}</span>
                      <button
                        onClick={() => deleteAccount(a)}
                        className="px-3 py-1 rounded-xl text-xs font-medium transition"
                        style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

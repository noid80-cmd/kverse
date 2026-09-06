'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AdminNav from '@/components/layout/AdminNav'
import { Flag, Mic2, Clock } from 'lucide-react'

type Stats = {
  totalUsers: number
  talentCount: number
  agencyCount: number
  totalVideos: number
  pendingVerifications: number
  totalAuditions: number
  pendingReports: number
  requestedAuditions: number
  pendingResults: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

      const [
        { count: totalUsers },
        { count: talentCount },
        { count: agencyCount },
        { count: totalVideos },
        { count: totalAuditions },
        { count: pendingReports },
        { count: requestedAuditions },
        { data: agencies },
        pendRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'talent'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agency'),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('auditions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('auditions').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
        supabase.from('agencies').select('is_verified, business_registration_url'),
        fetch('/api/admin/pending-results'),
      ])

      const pendingResults = pendRes.ok ? ((await pendRes.json()) as unknown[]).length : 0

      const pendingVerifications = (agencies ?? []).filter(
        a => (a as { is_verified: boolean; business_registration_url: string | null }).business_registration_url && !(a as { is_verified: boolean }).is_verified
      ).length

      setStats({
        totalUsers: totalUsers ?? 0,
        talentCount: talentCount ?? 0,
        agencyCount: agencyCount ?? 0,
        totalVideos: totalVideos ?? 0,
        pendingVerifications,
        totalAuditions: totalAuditions ?? 0,
        pendingReports: pendingReports ?? 0,
        requestedAuditions: requestedAuditions ?? 0,
        pendingResults,
      })
      setLoading(false)
    }
    load()
  }, [])

  const statCards = stats ? [
    { label: '전체 회원', value: stats.totalUsers, sub: `지망생 ${stats.talentCount} · 기획사 ${stats.agencyCount}`, color: '#D84A1E', bg: '#eef2ff', href: '/admin/users' },
    { label: '인증 대기', value: stats.pendingVerifications, sub: '사업자등록증 제출됨', color: stats.pendingVerifications > 0 ? '#d97706' : '#22c55e', bg: stats.pendingVerifications > 0 ? '#fef9c3' : '#f0fdf4', href: '/admin/agencies' },
    { label: '활성 영상', value: stats.totalVideos, sub: '공개 중인 영상', color: '#FF6F3C', bg: '#f5f3ff', href: '/admin/videos' },
    { label: '활성 오디션', value: stats.totalAuditions, sub: '진행 중인 공고', color: '#0ea5e9', bg: '#f0f9ff', href: '/admin/auditions' },
  ] : []

  return (
    <div className="min-h-screen pb-10" style={{ background: '#f0f0f8' }}>
      <AdminNav />

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b', marginBottom: 24 }}>대시보드</h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>불러오는 중...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {statCards.map(s => (
                <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: 20, padding: '20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: s.color }} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#1e1b4b', lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 신고와 공고 신청은 화면을 열어봐야만 알 수 있었다. 링크는 nav에
                있었지만 "볼 게 있다"고 말해주는 곳이 없으면 기억에 의존하게
                된다. 신고는 방치하면 안전 문제이자 심사 문제다. */}
            {stats && stats.pendingReports > 0 && (
              <Link href="/admin/reports" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                  border: '1px solid #f87171', borderRadius: 20, padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
                }}>
                  <Flag size={24} strokeWidth={2} color="#dc2626" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 15 }}>처리 안 된 신고 {stats.pendingReports}건</div>
                    <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>미루면 안전 문제이자 앱 심사 문제가 됩니다</div>
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            )}

            {stats && stats.pendingResults > 0 && (
              <Link href="/admin/auditions" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                  border: '1px solid #f87171', borderRadius: 20, padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
                }}>
                  <Clock size={24} strokeWidth={2} color="#dc2626" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 15 }}>결과 대기 {stats.pendingResults}건</div>
                    <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>마감이 지났는데 기획사가 결과를 안 냈습니다. 지망생이 기다리는 중입니다</div>
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            )}

            {stats && stats.requestedAuditions > 0 && (
              <Link href="/admin/auditions" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ffedd5, #fed7aa)',
                  border: '1px solid #fb923c', borderRadius: 20, padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
                }}>
                  <Mic2 size={24} strokeWidth={2} color="#c2410c" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 15 }}>오디션 신청 {stats.requestedAuditions}건</div>
                    <div style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>기획사에 연락해 일정을 조율한 뒤 게시하세요</div>
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            )}

            {stats && stats.pendingVerifications > 0 && (
              <Link href="/admin/agencies" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
                  border: '1px solid #fcd34d', borderRadius: 20, padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{ fontSize: 28 }}>🔔</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 15 }}>인증 심사 대기 {stats.pendingVerifications}건</div>
                    <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>사업자등록증이 제출된 기획사를 확인해주세요</div>
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}

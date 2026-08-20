'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'

type Report = {
  id: string
  target_type: 'video' | 'profile'
  target_id: string
  reported_user_id: string
  reason: string
  status: 'pending' | 'actioned' | 'dismissed'
  created_at: string
  reporter: { name: string } | null
  reported_user: { name: string; is_active: boolean } | null
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const supabase = createClient()

  async function load() {
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

    let q = supabase.from('reports').select(`
      id, target_type, target_id, reported_user_id, reason, status, created_at,
      reporter:profiles!reporter_id(name),
      reported_user:profiles!reported_user_id(name, is_active)
    `).order('created_at', { ascending: false })
    if (filter === 'pending') q = q.eq('status', 'pending')
    const { data } = await q
    setReports((data as unknown as Report[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  // 신고된 콘텐츠 즉시 숨김 + 신고 대상 유저 계정 정지(로그인 차단) — 24시간 내 조치 요건 대응
  async function removeContentAndEject(r: Report) {
    setBusy(r.id)
    if (r.target_type === 'video') {
      await supabase.from('videos').update({ status: 'hidden' }).eq('id', r.target_id)
    }
    await supabase.from('profiles').update({ is_active: false }).eq('id', r.reported_user_id)
    await supabase.from('reports').update({ status: 'actioned', reviewed_at: new Date().toISOString() }).eq('id', r.id)
    setBusy(null)
    load()
  }

  async function dismiss(id: string) {
    setBusy(id)
    await supabase.from('reports').update({ status: 'dismissed', reviewed_at: new Date().toISOString() }).eq('id', id)
    setBusy(null)
    load()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f0f0f8' }}>
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>
            신고 관리 <span style={{ fontSize: 14, color: '#8A7F6E', fontWeight: 500 }}>({reports.length}건)</span>
          </h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['pending', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
                  border: filter === f ? 'none' : '1px solid #e0e0f0',
                  background: filter === f ? '#D84A1E' : '#fff',
                  color: filter === f ? '#fff' : '#8A7F6E',
                }}>
                {f === 'pending' ? '대기중' : '전체'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>불러오는 중...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>처리할 신고가 없어요.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', border: '1px solid #e8e8f2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: 'rgba(216,74,30,0.1)', color: '#D84A1E' }}>
                    {r.target_type === 'video' ? '영상' : '프로필'}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7,
                    background: r.status === 'pending' ? 'rgba(234,179,8,0.15)' : r.status === 'actioned' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color: r.status === 'pending' ? '#a16207' : r.status === 'actioned' ? '#dc2626' : '#16a34a',
                  }}>
                    {r.status === 'pending' ? '대기중' : r.status === 'actioned' ? '조치완료' : '기각'}
                  </span>
                  <span style={{ fontSize: 12, color: '#8A7F6E', marginLeft: 'auto' }}>
                    {new Date(r.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: '#1e1b4b', fontWeight: 700, marginBottom: 2 }}>{r.reason}</div>
                <div style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 12 }}>
                  신고자: {r.reporter?.name ?? '알 수 없음'} · 대상: {r.reported_user?.name ?? '알 수 없음'}
                  {r.reported_user?.is_active === false && <span style={{ color: '#dc2626', fontWeight: 700 }}> (정지됨)</span>}
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => removeContentAndEject(r)} disabled={busy === r.id}
                      style={{ fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', opacity: busy === r.id ? 0.6 : 1 }}>
                      콘텐츠 삭제 + 계정 정지
                    </button>
                    <button onClick={() => dismiss(r.id)} disabled={busy === r.id}
                      style={{ fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10, border: '1px solid #e0e0f0', background: '#fff', color: '#8A7F6E', cursor: 'pointer', opacity: busy === r.id ? 0.6 : 1 }}>
                      기각
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

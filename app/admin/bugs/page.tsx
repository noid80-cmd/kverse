'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'

type Bug = {
  id: string
  user_id: string | null
  role: string | null
  message: string
  page: string | null
  user_agent: string | null
  resolved_at: string | null
  created_at: string
}

const roleLabel: Record<string, string> = {
  talent: '지망생', agency: '기획사', admin: '관리자',
}

export default function AdminBugsPage() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [busy, setBusy] = useState<string | null>(null)
  const supabase = createClient()

  async function load() {
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

    let q = supabase.from('bug_reports')
      .select('id, user_id, role, message, page, user_agent, resolved_at, created_at')
      .order('created_at', { ascending: false })
    if (filter === 'open') q = q.is('resolved_at', null)
    const { data } = await q
    const rows = (data as Bug[]) ?? []
    setBugs(rows)

    // bug_reports.user_id 는 auth.users 를 참조한다 — profiles 로 조인이 안 되므로 따로 읽는다.
    const ids = [...new Set(rows.map(b => b.user_id).filter(Boolean))] as string[]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', ids)
      setNames(Object.fromEntries((profs ?? []).map(p => [p.id, p.name as string])))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  // RLS가 막으면 Supabase는 에러 없이 0행을 처리하고 끝난다.
  // .select()로 실제 반영된 행을 확인하지 않으면 화면만 바뀌고 서버는 그대로다.
  async function toggleResolved(b: Bug) {
    setBusy(b.id)
    const { data, error } = await supabase.from('bug_reports')
      .update({ resolved_at: b.resolved_at ? null : new Date().toISOString() })
      .eq('id', b.id).select('id')
    setBusy(null)
    if (error) { alert('변경 실패: ' + error.message); return }
    if (!data?.length) { alert('변경된 내용이 없습니다 (권한 확인 필요)'); return }
    load()
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: '#f0f0f8' }}>
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>
            버그 신고 <span style={{ fontSize: 14, color: '#8A7F6E', fontWeight: 500 }}>({bugs.length}건)</span>
          </h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['open', '미처리'], ['all', '전체']] as const).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
                  border: filter === f ? 'none' : '1px solid #e0e0f0',
                  background: filter === f ? '#D84A1E' : '#fff',
                  color: filter === f ? '#fff' : '#8A7F6E',
                }}>{label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A7F6E', fontSize: 14 }}>불러오는 중...</div>
        ) : bugs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A7F6E', fontSize: 14 }}>
            {filter === 'open' ? '미처리 신고가 없습니다.' : '신고가 없습니다.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bugs.map(b => (
              <div key={b.id} style={{
                background: '#fff', borderRadius: 16, padding: '14px 16px',
                border: '1px solid #e8e8f2', opacity: b.resolved_at ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b' }}>
                    {b.user_id ? (names[b.user_id] ?? '(이름 없음)') : '(탈퇴한 회원)'}
                  </span>
                  {b.role && (
                    <span style={{ fontSize: 11, background: '#f0f0f8', color: '#D84A1E', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                      {roleLabel[b.role] ?? b.role}
                    </span>
                  )}
                  {b.resolved_at && (
                    <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>처리됨</span>
                  )}
                  <span style={{ fontSize: 11, color: '#8A7F6E', marginLeft: 'auto' }}>
                    {new Date(b.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ fontSize: 14, color: '#241C15', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {b.message}
                </div>

                <div style={{ fontSize: 11, color: '#8A7F6E', marginTop: 8, lineHeight: 1.6, wordBreak: 'break-all' }}>
                  {b.page && <div>화면: {b.page}</div>}
                  {b.user_agent && <div>기기: {b.user_agent}</div>}
                </div>

                <button onClick={() => toggleResolved(b)} disabled={busy === b.id}
                  style={{
                    marginTop: 10, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 9,
                    border: '1px solid #e0e0f0', background: b.resolved_at ? '#fff' : '#f8f7ff',
                    color: b.resolved_at ? '#8A7F6E' : '#D84A1E', cursor: 'pointer',
                  }}>
                  {busy === b.id ? '...' : b.resolved_at ? '미처리로 되돌리기' : '처리 완료'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

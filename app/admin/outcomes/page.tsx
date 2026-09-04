'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'
import { Trophy, Clock, X } from 'lucide-react'

// 1차 합격자 추적.
//
// 2차부터는 오프라인 일정이라 앱 안에서 관측할 수 없다. 기획사에 물어도 답할
// 이유가 없다. 그래서 Krookie 담당자가 전화·카톡으로 받은 결과를 여기 한 줄로
// 찍는다. 인원이 적은 동안은 사람이 하는 게 가장 확실하고 빠르다.
//
// 이 화면이 없으면 담당자는 스프레드시트를 쓰게 되고, 그러면 여기까지 설계한
// 게 마지막 한 걸음에서 앱 밖으로 샌다.
//
// 대략 주 25건(기획사 5곳 × 회차당 5명)을 넘으면 사람이 안 된다. 그때
// 기획사 셀프 입력으로 넘기면 된다.

type Row = {
  id: string
  decided_at: string | null
  created_at: string
  outcome: string | null
  outcome_note: string | null
  talent: { id: string; name: string } | null
  audition: { id: string; title: string; agency: { id: string; name: string } | null } | null
}

const OUTCOMES = [
  { key: 'in_progress', label: '진행 중', color: '#ca8a04', bg: 'rgba(251,191,36,0.14)' },
  { key: 'passed', label: '최종 합격', color: '#16a34a', bg: 'rgba(34,197,94,0.14)' },
  { key: 'rejected', label: '불합격', color: '#8A7F6E', bg: 'rgba(36,28,21,0.06)' },
] as const

export default function AdminOutcomesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [busy, setBusy] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const supabase = createClient()

  async function load() {
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

    const { data } = await supabase.from('audition_applications').select(`
      id, decided_at, created_at, outcome, outcome_note,
      talent:profiles!talent_id(id, name),
      audition:auditions!audition_id(id, title, agency:agencies(id, name))
    `).eq('status', 'invited').order('created_at', { ascending: false })

    setRows((data as unknown as Row[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function setOutcome(r: Row, outcome: 'in_progress' | 'passed' | 'rejected') {
    setBusy(r.id)
    await supabase.from('audition_applications')
      .update({ outcome, outcome_at: new Date().toISOString() })
      .eq('id', r.id)

    // 최종 합격이 눌리는 순간이 곧 랜딩에 올라갈 실적이다. 여기서 바로 남기지
    // 않으면 또 어딘가에 따로 적어야 하고, 그러면 결국 안 적는다.
    if (outcome === 'passed' && r.talent && r.audition?.agency) {
      const { data: dup } = await supabase.from('success_stories').select('id')
        .eq('talent_id', r.talent.id).eq('agency_id', r.audition.agency.id)
        .limit(1).maybeSingle()
      if (!dup) {
        await supabase.from('success_stories').insert({
          talent_id: r.talent.id,
          talent_name: r.talent.name,
          agency_id: r.audition.agency.id,
          agency_name: r.audition.agency.name,
          audition_id: r.audition.id,
          kind: 'final_pass',
        })
      }
    }

    setRows(prev => prev.map(x => (x.id === r.id ? { ...x, outcome } : x)))
    setBusy(null)
  }

  async function saveNote(r: Row) {
    setBusy(r.id)
    await supabase.from('audition_applications')
      .update({ outcome_note: noteText.trim() || null }).eq('id', r.id)
    setRows(prev => prev.map(x => (x.id === r.id ? { ...x, outcome_note: noteText.trim() || null } : x)))
    setNoteFor(null)
    setNoteText('')
    setBusy(null)
  }

  const shown = filter === 'open'
    ? rows.filter(r => !r.outcome || r.outcome === 'in_progress')
    : rows
  const passedCount = rows.filter(r => r.outcome === 'passed').length
  const openCount = rows.filter(r => !r.outcome || r.outcome === 'in_progress').length

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <AdminNav />
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>1차 합격자 추적</h1>
        <p style={{ fontSize: 13, color: '#8A7F6E', lineHeight: 1.6, marginBottom: 18 }}>
          기획사와 직접 확인한 결과를 여기 기록합니다. <strong>최종 합격</strong>을 누르면 실적으로 바로 쌓입니다.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #e8e8f2', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#8A7F6E', marginBottom: 2 }}>확인 필요</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ca8a04' }}>{openCount}</div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #e8e8f2', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#8A7F6E', marginBottom: 2 }}>최종 합격</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>{passedCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 18, border: '1px solid #e8e8f2' }}>
          {([['open', `확인 필요 ${openCount}`], ['all', `전체 ${rows.length}`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{
                flex: 1, padding: '9px', borderRadius: 11, border: 'none', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 700,
                background: filter === k ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : 'transparent',
                color: filter === k ? '#fff' : '#8A7F6E',
              }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>불러오는 중...</div>
        ) : shown.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>
              {filter === 'open' ? '확인할 게 없어요' : '아직 1차 합격자가 없어요'}
            </div>
            <div style={{ fontSize: 13, color: '#8A7F6E' }}>
              기획사가 지원자를 1차 합격시키면 여기에 올라옵니다
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shown.map(r => {
              const cur = OUTCOMES.find(o => o.key === r.outcome)
              return (
                <div key={r.id} style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', border: '1px solid #e8e8f2' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 17, fontWeight: 900, color: '#1e1b4b' }}>{r.talent?.name ?? '(탈퇴)'}</span>
                    <span style={{ fontSize: 13, color: '#8A7F6E' }}>{r.audition?.agency?.name ?? '기획사 미상'}</span>
                    {cur && (
                      <span style={{ marginLeft: 'auto', background: cur.bg, color: cur.color, fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 8 }}>
                        {cur.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#8A7F6E', marginBottom: 12 }}>
                    {r.audition?.title ?? '오디션 미상'}
                    {r.decided_at ? ` · 1차 합격 ${new Date(r.decided_at).toLocaleDateString('ko-KR')}` : ''}
                  </div>

                  {r.outcome_note && (
                    <div style={{ fontSize: 13, color: '#4b5563', background: '#f8f7ff', borderRadius: 12, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {r.outcome_note}
                    </div>
                  )}

                  {noteFor === r.id ? (
                    <div style={{ marginBottom: 12 }}>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                        placeholder="통화 내용, 일정 등"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e8e8f2', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none' }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => { setNoteFor(null); setNoteText('') }}
                          style={{ flex: 1, padding: '9px', borderRadius: 11, border: 'none', background: '#f0f0f8', color: '#8A7F6E', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
                        <button onClick={() => saveNote(r)} disabled={busy === r.id}
                          style={{ flex: 1, padding: '9px', borderRadius: 11, border: 'none', background: '#1e1b4b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>메모 저장</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setNoteFor(r.id); setNoteText(r.outcome_note ?? '') }}
                      style={{ background: 'none', border: 'none', color: '#8A7F6E', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 12, textDecoration: 'underline' }}>
                      {r.outcome_note ? '메모 수정' : '메모 남기기'}
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 7 }}>
                    {OUTCOMES.map(o => {
                      const active = r.outcome === o.key
                      const Icon = o.key === 'passed' ? Trophy : o.key === 'in_progress' ? Clock : X
                      return (
                        <button key={o.key} onClick={() => setOutcome(r, o.key)} disabled={busy === r.id}
                          style={{
                            flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer',
                            border: active ? `1px solid ${o.color}` : '1px solid #e8e8f2',
                            background: active ? o.bg : '#fff',
                            color: active ? o.color : '#8A7F6E',
                            fontSize: 13, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          }}>
                          <Icon size={14} strokeWidth={2} />
                          {o.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

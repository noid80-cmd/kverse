'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'
import { Trash2, Plus, Calendar, Users } from 'lucide-react'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Audition = {
  id: string; title: string; description: string | null; category: string
  deadline: string | null; status: string; created_at: string; applicant_count: number
  agency: { name: string } | null
}

type Agency = { id: string; name: string }

const inputStyle = {
  background: '#f8f8fc', border: '1px solid #e0e0f0',
  borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#1e1b4b', width: '100%',
}

export default function AdminAuditionsPage() {
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', categories: ['vocal'] as string[], deadline: '', agencyId: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

    const [{ data: ags }, { data: auds }] = await Promise.all([
      supabase.from('agencies').select('id, name').order('name'),
      supabase.from('auditions').select('id, title, description, category, deadline, status, created_at, agency:agencies(name)').order('created_at', { ascending: false }),
    ])

    setAgencies(ags ?? [])

    const withCount = await Promise.all((auds ?? []).map(async (a: unknown) => {
      const aud = a as Omit<Audition, 'applicant_count'>
      const { count } = await supabase.from('audition_applications').select('*', { count: 'exact', head: true }).eq('audition_id', aud.id)
      return { ...aud, applicant_count: count ?? 0 }
    }))
    setAuditions(withCount)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const isExpired = (d: string | null) => !!d && d < today

  async function createAudition() {
    if (!form.title.trim() || !form.agencyId || form.categories.length === 0 || !form.deadline) return
    setSaving(true)
    await supabase.from('auditions').insert({
      agency_id: form.agencyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.categories.join(','),
      deadline: form.deadline,
      status: 'active',
    })
    setForm({ title: '', description: '', categories: ['vocal'], deadline: '', agencyId: '' })
    setShowCreate(false)
    setSaving(false)
    load()
  }

  async function deleteAudition(id: string) {
    if (!confirm('공고를 완전히 삭제할까요?')) return
    await supabase.from('auditions').delete().eq('id', id)
    setAuditions(prev => prev.filter(a => a.id !== id))
  }

  const active = auditions.filter(a => !isExpired(a.deadline))
  const expired = auditions.filter(a => isExpired(a.deadline))

  return (
    <div className="min-h-screen pb-10" style={{ background: '#f0f0f8' }}>
      <AdminNav />

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>오디션 관리 <span style={{ fontSize: 14, color: '#8b8baa', fontWeight: 500 }}>({auditions.length}개)</span></h1>
          <button onClick={() => setShowCreate(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
            borderRadius: 14, padding: '10px 16px', fontSize: 14, fontWeight: 700,
          }}>
            <Plus size={16} strokeWidth={2.5} /> 공고 올리기
          </button>
        </div>

        {showCreate && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, border: '1px solid #e0e0f0' }}>
            <h2 style={{ fontWeight: 800, color: '#1e1b4b', marginBottom: 16, fontSize: 16 }}>새 오디션 공고</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select value={form.agencyId} onChange={e => setForm(f => ({ ...f, agencyId: e.target.value }))}
                style={{ ...inputStyle, border: `1px solid ${form.agencyId ? '#e0e0f0' : '#fca5a5'}` }}>
                <option value="">기획사 선택 *</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="공고 제목 *" style={inputStyle} />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="모집 요건, 지원 방법 등 상세 내용" rows={3}
                style={{ ...inputStyle, resize: 'none' }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['vocal', 'dance', 'acting', 'rap', 'other'] as const).map(cat => {
                  const selected = form.categories.includes(cat)
                  return (
                    <button key={cat} type="button" onClick={() => setForm(f => ({
                      ...f,
                      categories: selected ? f.categories.filter(c => c !== cat) : [...f.categories, cat],
                    }))} style={{
                      padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', border: selected ? 'none' : '1.5px solid #e0e0f0',
                      background: selected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f8f8fc',
                      color: selected ? 'white' : '#94a3b8',
                    }}>
                      {categoryLabel[cat]}
                    </button>
                  )
                })}
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#ef4444', marginBottom: 4, display: 'block', fontWeight: 700 }}>마감일 *</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  style={{ ...inputStyle, border: `1px solid ${form.deadline ? '#e0e0f0' : '#fca5a5'}` }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowCreate(false)} style={{
                  flex: 1, background: '#f0f0f8', border: 'none', borderRadius: 12, padding: 12,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#8b8baa',
                }}>취소</button>
                <button onClick={createAudition} disabled={saving || !form.title.trim() || !form.deadline || !form.agencyId} style={{
                  flex: 2, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                  border: 'none', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', opacity: saving || !form.title.trim() || !form.deadline || !form.agencyId ? 0.5 : 1,
                }}>{saving ? '저장 중...' : '공고 올리기'}</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : (
          <>
            {active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: expired.length > 0 ? 28 : 0 }}>
                {active.map(a => (
                  <div key={a.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid #e8e8f2', position: 'relative' }}>
                    <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 15 }}>{a.agency?.name ?? '?'}</div>
                    <div style={{ fontWeight: 600, color: '#6366f1', fontSize: 13, marginBottom: 6 }}>{a.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {a.category.split(',').map(c => (
                        <span key={c} style={{ fontSize: 11, background: '#eef2ff', color: '#6366f1', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>{categoryLabel[c] ?? c}</span>
                      ))}
                      <span style={{ fontSize: 12, color: '#8b8baa', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={12} /> {a.applicant_count}명</span>
                      {a.deadline && <span style={{ fontSize: 12, color: '#8b8baa', display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={12} /> ~{a.deadline}</span>}
                    </div>
                    <button onClick={() => deleteAudition(a.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {expired.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>마감된 공고</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {expired.map(a => (
                    <div key={a.id} style={{ background: '#f8f8fc', borderRadius: 16, padding: '14px 16px', border: '1px solid #e8e8f2', opacity: 0.7, position: 'relative' }}>
                      <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 15 }}>{a.agency?.name ?? '?'}</div>
                      <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>{a.title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>마감 {a.deadline}</span>
                        <span style={{ fontSize: 12, color: '#8b8baa', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={12} /> {a.applicant_count}명</span>
                      </div>
                      <button onClick={() => deleteAudition(a.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {auditions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>등록된 공고가 없습니다</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

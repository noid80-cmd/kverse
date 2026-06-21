'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'
import { Trash2, Plus, Calendar, Users, X, Pencil } from 'lucide-react'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Audition = {
  id: string; title: string; description: string | null; category: string
  mode: 'online' | 'offline' | 'both' | null
  deadline: string | null; status: string; created_at: string; applicant_count: number
  agency_id: string | null
  agency: { name: string } | null
}

type Agency = { id: string; name: string }

const inputStyle = {
  background: '#f8f8fc', border: '1px solid #e0e0f0',
  borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#1e1b4b', width: '100%',
}

type FormState = {
  title: string; description: string; categories: string[]
  mode: 'online' | 'offline' | 'both'; deadline: string; agencyId: string
}

function AuditionForm({
  form, setForm, agencies, onCancel, onSave, saving, saveLabel,
}: {
  form: FormState
  setForm: (fn: (f: FormState) => FormState) => void
  agencies: Agency[]
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveLabel: string
}) {
  const disabled = saving || !form.title.trim() || !form.deadline || !form.agencyId
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <select value={form.agencyId} onChange={e => setForm(f => ({ ...f, agencyId: e.target.value }))}
        style={{ ...inputStyle, border: `1px solid ${form.agencyId ? '#e0e0f0' : '#fca5a5'}` }}>
        <option value="">공고 주체 선택 *</option>
        <option value="ADMIN">📌 관리자 공고</option>
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
              background: selected ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#f8f8fc',
              color: selected ? 'white' : '#94a3b8',
            }}>
              {categoryLabel[cat]}
            </button>
          )
        })}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>진행방식</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([['online', '🖥️ 온라인'], ['offline', '📍 오프라인'], ['both', '🔀 온+오프라인']] as const).map(([val, label]) => {
            const selected = form.mode === val
            return (
              <button key={val} type="button" onClick={() => setForm(f => ({ ...f, mode: val }))} style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, border: selected ? 'none' : '1.5px solid #e0e0f0',
                background: selected ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#f8f8fc',
                color: selected ? 'white' : '#94a3b8', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#ef4444', marginBottom: 4, display: 'block', fontWeight: 700 }}>마감일 *</label>
        <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          style={{ ...inputStyle, border: `1px solid ${form.deadline ? '#e0e0f0' : '#fca5a5'}` }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onCancel} style={{
          flex: 1, background: '#f0f0f8', border: 'none', borderRadius: 12, padding: 12,
          fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#8b8baa',
        }}>취소</button>
        <button onClick={onSave} disabled={disabled} style={{
          flex: 2, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white',
          border: 'none', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700,
          cursor: 'pointer', opacity: disabled ? 0.5 : 1,
        }}>{saving ? '저장 중...' : saveLabel}</button>
      </div>
    </div>
  )
}

const emptyForm = (): FormState => ({
  title: '', description: '', categories: ['vocal'], mode: 'offline', deadline: '', agencyId: ''
})

export default function AdminAuditionsPage() {
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Audition | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [editSaving, setEditSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

    const [agsRes, audsRes] = await Promise.all([
      supabase.from('agencies').select('id, name').order('name'),
      fetch('/api/admin/auditions'),
    ])

    setAgencies(agsRes.data ?? [])

    if (!audsRes.ok) { alert('오류: ' + await audsRes.text()); setLoading(false); return }
    const auds: Omit<Audition, 'applicant_count'>[] = await audsRes.json()

    const withCount = await Promise.all(auds.map(async (aud) => {
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
    const res = await fetch('/api/admin/auditions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agency_id: form.agencyId === 'ADMIN' ? null : form.agencyId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.categories.join(','),
        mode: form.mode,
        deadline: form.deadline,
      }),
    })
    setSaving(false)
    if (!res.ok) { const e = await res.json(); alert('저장 실패: ' + e.error); return }
    setForm(emptyForm())
    setShowCreate(false)
    load()
  }

  async function saveEdit() {
    if (!detail || !editForm.title.trim() || !editForm.agencyId || !editForm.deadline) return
    setEditSaving(true)
    const res = await fetch('/api/admin/auditions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: detail.id,
        agency_id: editForm.agencyId === 'ADMIN' ? null : editForm.agencyId,
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        category: editForm.categories.join(','),
        mode: editForm.mode,
        deadline: editForm.deadline,
      }),
    })
    setEditSaving(false)
    if (!res.ok) { const e = await res.json(); alert('수정 실패: ' + e.error); return }
    setDetail(null)
    setEditing(false)
    load()
  }

  function openEdit(a: Audition) {
    setEditForm({
      title: a.title,
      description: a.description ?? '',
      categories: a.category.split(','),
      mode: a.mode ?? 'offline',
      deadline: a.deadline ?? '',
      agencyId: a.agency_id ?? 'ADMIN',
    })
    setEditing(true)
  }

  async function deleteAudition(id: string) {
    if (!confirm('공고를 완전히 삭제할까요?')) return
    await fetch('/api/admin/auditions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setAuditions(prev => prev.filter(a => a.id !== id))
    if (detail?.id === id) setDetail(null)
  }

  const active = auditions.filter(a => !isExpired(a.deadline))
  const expired = auditions.filter(a => isExpired(a.deadline))

  return (
    <>
    <div className="min-h-screen pb-10" style={{ background: '#f0f0f8' }}>
      <AdminNav />

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>오디션 관리 <span style={{ fontSize: 14, color: '#8b8baa', fontWeight: 500 }}>({auditions.length}개)</span></h1>
          <button onClick={() => setShowCreate(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white',
            borderRadius: 14, padding: '10px 16px', fontSize: 14, fontWeight: 700,
          }}>
            <Plus size={16} strokeWidth={2.5} /> 공고 올리기
          </button>
        </div>

        {showCreate && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, border: '1px solid #e0e0f0' }}>
            <h2 style={{ fontWeight: 800, color: '#1e1b4b', marginBottom: 16, fontSize: 16 }}>새 오디션 공고</h2>
            <AuditionForm
              form={form} setForm={setForm} agencies={agencies}
              onCancel={() => setShowCreate(false)} onSave={createAudition}
              saving={saving} saveLabel="공고 올리기"
            />
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : (
          <>
            {active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: expired.length > 0 ? 28 : 0 }}>
                {active.map(a => (
                  <div key={a.id} onClick={() => { setDetail(a); setEditing(false) }} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid #e8e8f2', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 15 }}>{a.agency?.name ?? '관리자 공지'}</div>
                    <div style={{ fontWeight: 600, color: '#0891b2', fontSize: 13, marginBottom: 6 }}>{a.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {a.category.split(',').map(c => (
                        <span key={c} style={{ fontSize: 11, background: '#eef2ff', color: '#0891b2', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>{categoryLabel[c] ?? c}</span>
                      ))}
                      {a.mode && (
                        <span style={{ fontSize: 11, background: '#f0f0f8', color: '#8b8baa', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
                          {a.mode === 'online' ? '🖥️ 온라인' : a.mode === 'offline' ? '📍 오프라인' : '🔀 온+오프'}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: '#8b8baa', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={12} /> {a.applicant_count}명</span>
                      {a.deadline && <span style={{ fontSize: 12, color: '#8b8baa', display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={12} /> ~{a.deadline}</span>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteAudition(a.id) }} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
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
                    <div key={a.id} onClick={() => { setDetail(a); setEditing(false) }} style={{ background: '#f8f8fc', borderRadius: 16, padding: '14px 16px', border: '1px solid #e8e8f2', opacity: 0.7, position: 'relative', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 15 }}>{a.agency?.name ?? '관리자 공지'}</div>
                      <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>{a.title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>마감 {a.deadline}</span>
                        <span style={{ fontSize: 12, color: '#8b8baa', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={12} /> {a.applicant_count}명</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteAudition(a.id) }} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
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

    {detail && (
      <div onClick={() => { setDetail(null); setEditing(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'auto', position: 'relative' }}>
          <button onClick={() => { setDetail(null); setEditing(false) }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={20} strokeWidth={2} />
          </button>

          {editing ? (
            <>
              <h2 style={{ fontWeight: 800, color: '#1e1b4b', marginBottom: 16, fontSize: 16, paddingRight: 32 }}>공고 수정</h2>
              <AuditionForm
                form={editForm} setForm={setEditForm} agencies={agencies}
                onCancel={() => setEditing(false)} onSave={saveEdit}
                saving={editSaving} saveLabel="수정 완료"
              />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, paddingRight: 32 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#8b8baa' }}>{detail.agency?.name ?? '관리자 공지'}</div>
                  <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 18, marginTop: 2 }}>{detail.title}</div>
                </div>
                <button onClick={() => openEdit(detail)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: '#f0f0f8', border: 'none',
                  borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 700, color: '#0891b2', cursor: 'pointer',
                }}>
                  <Pencil size={13} strokeWidth={2.5} /> 수정
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, marginTop: 12 }}>
                {detail.category.split(',').map(c => (
                  <span key={c} style={{ fontSize: 12, background: '#eef2ff', color: '#0891b2', padding: '3px 9px', borderRadius: 8, fontWeight: 700 }}>{categoryLabel[c] ?? c}</span>
                ))}
                {detail.mode && (
                  <span style={{ fontSize: 12, background: '#f0f0f8', color: '#8b8baa', padding: '3px 9px', borderRadius: 8, fontWeight: 700 }}>
                    {detail.mode === 'online' ? '🖥️ 온라인' : detail.mode === 'offline' ? '📍 오프라인' : '🔀 온+오프'}
                  </span>
                )}
                {detail.deadline && (
                  <span style={{ fontSize: 12, color: isExpired(detail.deadline) ? '#ef4444' : '#8b8baa', fontWeight: isExpired(detail.deadline) ? 700 : 400 }}>
                    {isExpired(detail.deadline) ? '마감 ' : '~'}{detail.deadline}
                  </span>
                )}
              </div>
              {detail.description ? (
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#f8f8fc', borderRadius: 12, padding: '14px 16px' }}>
                  {detail.description}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 20 }}>상세 내용 없음</div>
              )}
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#8b8baa', fontSize: 13 }}>
                <Users size={14} /> {detail.applicant_count}명 지원
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  )
}

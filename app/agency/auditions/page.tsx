'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import Link from 'next/link'
import { Plus, Megaphone, Users, Calendar } from 'lucide-react'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Audition = {
  id: string
  title: string
  description: string | null
  category: string
  deadline: string | null
  status: string
  created_at: string
  applicant_count: number
}

const inputStyle = {
  background: '#f8f8fc', border: '1px solid #e0e0f0',
  borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#1e1b4b', width: '100%',
}

export default function AgencyAuditionsPage() {
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [loading, setLoading] = useState(true)
  const [agencyId, setAgencyId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'vocal', deadline: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }

    const { data: am } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).single()
    if (!am?.agency_id) { setLoading(false); return }
    setAgencyId(am.agency_id)

    const { data } = await supabase.from('auditions')
      .select('id, title, description, category, deadline, status, created_at')
      .eq('agency_id', am.agency_id)
      .order('created_at', { ascending: false })

    const withCount = await Promise.all((data ?? []).map(async a => {
      const { count } = await supabase.from('audition_applications')
        .select('*', { count: 'exact', head: true }).eq('audition_id', a.id)
      return { ...a, applicant_count: count ?? 0 }
    }))

    setAuditions(withCount)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createAudition() {
    if (!form.title.trim() || !agencyId) return
    setSaving(true)
    const { error } = await supabase.from('auditions').insert({
      agency_id: agencyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      deadline: form.deadline || null,
      status: 'active',
    })
    if (!error) {
      setForm({ title: '', description: '', category: 'vocal', deadline: '' })
      setShowCreate(false)
      load()
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b' }}>오디션 공고</h1>
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
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="공고 제목 *" style={inputStyle} />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="모집 요건, 지원 방법 등 상세 내용" rows={3}
                style={{ ...inputStyle, resize: 'none' }} />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                <option value="vocal">보컬</option>
                <option value="dance">댄스</option>
                <option value="acting">연기</option>
                <option value="rap">랩</option>
                <option value="other">기타</option>
              </select>
              <div>
                <label style={{ fontSize: 12, color: '#8b8baa', marginBottom: 4, display: 'block' }}>마감일 (선택)</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowCreate(false)} style={{
                  flex: 1, background: '#f0f0f8', border: 'none', borderRadius: 12, padding: 12,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#8b8baa',
                }}>취소</button>
                <button onClick={createAudition} disabled={saving || !form.title.trim()} style={{
                  flex: 2, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                  border: 'none', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', opacity: saving || !form.title.trim() ? 0.5 : 1,
                }}>{saving ? '저장 중...' : '공고 올리기'}</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : auditions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#6366f1' }}>
              <Megaphone size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 공고가 없어요</div>
            <div style={{ fontSize: 13, color: '#8b8baa' }}>공고를 올려 지망생들의 지원을 받아보세요</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {auditions.map(a => (
              <Link key={a.id} href={`/agency/auditions/${a.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 11, background: '#eef2ff', color: '#6366f1', padding: '3px 8px', borderRadius: 8, fontWeight: 700, display: 'inline-block', marginBottom: 8 }}>
                    {categoryLabel[a.category] ?? a.category}
                  </span>
                  <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 16, marginBottom: 4 }}>{a.title}</div>
                  {a.description && (
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.description}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6366f1', fontSize: 13, fontWeight: 700 }}>
                      <Users size={14} strokeWidth={2} /> {a.applicant_count}명 지원
                    </div>
                    {a.deadline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8b8baa', fontSize: 12 }}>
                        <Calendar size={13} strokeWidth={2} /> ~{a.deadline}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <AgencyNav />
    </div>
  )
}

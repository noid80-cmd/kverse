'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import Link from 'next/link'
import { Plus, Megaphone, Users, Calendar, Trash2 } from 'lucide-react'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Audition = {
  id: string
  title: string
  description: string | null
  category: string
  mode: 'online' | 'offline' | 'both' | null
  deadline: string | null
  status: string
  created_at: string
  applicant_count: number
}

const inputStyle = {
  background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#eeeeff', width: '100%',
}

export default function AgencyAuditionsPage() {
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [loading, setLoading] = useState(true)
  const [agencyId, setAgencyId] = useState<string | null>(null)
  const [agencyName, setAgencyName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', categories: ['vocal'] as string[], mode: 'both' as 'online' | 'offline' | 'both', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }

    const { data: am } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).single()
    if (!am?.agency_id) { setLoading(false); return }
    setAgencyId(am.agency_id)

    const { data: ag } = await supabase.from('agencies').select('name').eq('id', am.agency_id).single()
    if (ag?.name) setAgencyName(ag.name)

    const { data } = await supabase.from('auditions')
      .select('id, title, description, category, mode, deadline, status, created_at')
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

  async function deleteAudition(id: string) {
    if (!confirm('공고를 삭제할까요?')) return
    setDeleting(id)
    await supabase.from('auditions').delete().eq('id', id)
    setAuditions(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const today = new Date().toISOString().slice(0, 10)
  function isExpired(deadline: string | null) {
    return !!deadline && deadline < today
  }

  async function createAudition() {
    if (!form.title.trim() || !agencyId || form.categories.length === 0 || !form.deadline) return
    setSaving(true)
    const { data: inserted, error } = await supabase.from('auditions').insert({
      agency_id: agencyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.categories.join(','),
      mode: form.mode,
      deadline: form.deadline || null,
      status: 'active',
    }).select('id').single()
    if (!error && inserted) {
      // auto-translate in background
      fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [form.title.trim(), form.description.trim() || ''] }),
      }).then(r => r.json()).then(async (results) => {
        const translations: Record<string, { title: string; description: string }> = {}
        Object.entries(results).forEach(([lang, texts]) => {
          translations[lang] = { title: (texts as string[])[0], description: (texts as string[])[1] }
        })
        await supabase.from('auditions').update({ translations }).eq('id', inserted.id)
      })

      setForm({ title: '', description: '', categories: ['vocal'], mode: 'both', deadline: '' })
      setShowCreate(false)
      load()
      fetch('/api/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcast: true,
          title: '새 오디션 공고',
          body: `${form.title.trim()} 오디션이 올라왔어요!`,
          url: '/dashboard/auditions',
        }),
      })
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff' }}>오디션 공고</h1>
          <button onClick={() => setShowCreate(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white',
            borderRadius: 14, padding: '10px 16px', fontSize: 14, fontWeight: 700,
          }}>
            <Plus size={16} strokeWidth={2.5} /> 공고 올리기
          </button>
        </div>

        {showCreate && (
          <div style={{ background: '#111118', borderRadius: 20, padding: 20, marginBottom: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ fontWeight: 800, color: '#eeeeff', marginBottom: 16, fontSize: 16 }}>새 오디션 공고</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
                <span style={{ fontSize: 11, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '2px 8px', borderRadius: 6, fontWeight: 700, flexShrink: 0 }}>기획사</span>
                <span style={{ fontWeight: 700, color: '#eeeeff' }}>{agencyName}</span>
              </div>
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
                      categories: selected
                        ? f.categories.filter(c => c !== cat)
                        : [...f.categories, cat],
                    }))} style={{
                      padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                      background: selected ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                      color: selected ? 'white' : '#555570',
                    }}>
                      {categoryLabel[cat]}
                    </button>
                  )
                })}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 8, fontWeight: 600 }}>진행방식</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['online', '🖥️ 온라인'], ['offline', '📍 오프라인'], ['both', '🔀 온+오프라인']] as const).map(([val, label]) => {
                    const selected = form.mode === val
                    return (
                      <button key={val} type="button" onClick={() => setForm(f => ({ ...f, mode: val }))} style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10, border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                        background: selected ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                        color: selected ? 'white' : '#555570', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#f87171', marginBottom: 4, display: 'block', fontWeight: 700 }}>마감일 *</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  style={{ ...inputStyle, colorScheme: 'dark', border: `1px solid ${form.deadline ? 'rgba(255,255,255,0.1)' : 'rgba(248,113,113,0.5)'}` }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowCreate(false)} style={{
                  flex: 1, background: '#1a1a25', border: 'none', borderRadius: 12, padding: 12,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#555570',
                }}>취소</button>
                <button onClick={createAudition} disabled={saving || !form.title.trim() || !form.deadline} style={{
                  flex: 2, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white',
                  border: 'none', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', opacity: saving || !form.title.trim() || !form.deadline ? 0.5 : 1,
                }}>{saving ? '저장 중...' : '공고 올리기'}</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#555570' }}>불러오는 중...</div>
        ) : auditions.length === 0 ? (
          <div style={{ background: '#111118', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#22d3ee' }}>
              <Megaphone size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 700, color: '#eeeeff', marginBottom: 4 }}>아직 공고가 없어요</div>
            <div style={{ fontSize: 13, color: '#555570' }}>공고를 올려 지망생들의 지원을 받아보세요</div>
          </div>
        ) : (() => {
          const active = auditions.filter(a => !isExpired(a.deadline))
          const expired = auditions.filter(a => isExpired(a.deadline))
          const AuditionCard = ({ a }: { a: Audition }) => (
            <div key={a.id} style={{ position: 'relative' }}>
              <Link href={`/agency/auditions/${a.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: isExpired(a.deadline) ? 'rgba(255,255,255,0.02)' : '#111118', borderRadius: 20, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)', opacity: isExpired(a.deadline) ? 0.7 : 1 }}>
                  <div style={{ fontWeight: 900, color: '#eeeeff', fontSize: 18, marginBottom: 4 }}>{agencyName}</div>
                  <div style={{ fontWeight: 600, color: '#22d3ee', fontSize: 14, marginBottom: 10 }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {a.category.split(',').map(c => (
                      <span key={c} style={{ fontSize: 11, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                        {categoryLabel[c] ?? c}
                      </span>
                    ))}
                    {a.mode && (
                      <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.07)', color: '#8888aa', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                        {a.mode === 'online' ? '🖥️ 온라인' : a.mode === 'offline' ? '📍 오프라인' : '🔀 온+오프'}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <div style={{ fontSize: 13, color: '#8888aa', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.description}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#22d3ee', fontSize: 13, fontWeight: 700 }}>
                      <Users size={14} strokeWidth={2} /> {a.applicant_count}명 지원
                    </div>
                    {a.deadline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: isExpired(a.deadline) ? '#f87171' : '#555570', fontSize: 12, fontWeight: isExpired(a.deadline) ? 700 : 400 }}>
                        <Calendar size={13} strokeWidth={2} /> {isExpired(a.deadline) ? '마감 ' : '~'}{a.deadline}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              <button onClick={() => deleteAudition(a.id)} disabled={deleting === a.id}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  background: '#1a1a25', border: 'none', borderRadius: 10,
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#555570', zIndex: 1,
                }}>
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          )
          return (
            <>
              {active.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: expired.length > 0 ? 28 : 0 }}>
                  {active.map(a => <AuditionCard key={a.id} a={a} />)}
                </div>
              )}
              {expired.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#555570', marginBottom: 12 }}>마감된 공고</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {expired.map(a => <AuditionCard key={a.id} a={a} />)}
                  </div>
                </>
              )}
            </>
          )
        })()}
      </div>
      <AgencyNav />
    </div>
  )
}

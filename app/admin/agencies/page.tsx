'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'

type Agency = {
  id: string
  name: string
  logo_url: string | null
  description: string | null
  website: string | null
  is_verified: boolean
  created_at: string
  business_registration_url: string | null
  business_registration_number: string | null
}

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewingImg, setViewingImg] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [inviteLink, setInviteLink] = useState<{ url: string; agencyName: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoTarget, setLogoTarget] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

      const { data } = await supabase.from('agencies').select('*').order('created_at', { ascending: false })
      setAgencies((data as Agency[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function pickLogo(agencyId: string) {
    setLogoTarget(agencyId)
    logoInputRef.current?.click()
  }

  // 로고는 공개 공고 페이지에 그대로 노출되므로 기획사가 보내준 파일을 여기서 바로 올린다
  async function onLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const agencyId = logoTarget
    e.target.value = ''
    if (!file || !agencyId) return
    setLogoUploading(agencyId)
    try {
      const res = await fetch('/api/upload-agency-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? '업로드 주소를 못 받았어요')
      const { url, publicUrl } = await res.json()
      const ok = await new Promise<boolean>(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.onload = () => resolve(xhr.status === 200)
        xhr.onerror = () => resolve(false)
        xhr.send(file)
      })
      if (!ok) throw new Error('파일 전송에 실패했어요')
      const { error } = await supabase.from('agencies').update({ logo_url: publicUrl }).eq('id', agencyId)
      if (error) throw new Error(error.message)
      setAgencies(prev => prev.map(a => (a.id === agencyId ? { ...a, logo_url: publicUrl } : a)))
    } catch (err) {
      alert('로고 업로드 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
    } finally {
      setLogoUploading(null)
      setLogoTarget(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('agencies').insert({
      name: name.trim(),
    }).select().single()
    if (data) {
      setAgencies(prev => [data as Agency, ...prev])
      // 초대 토큰 생성
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('')
      await supabase.from('agency_invites').insert({ agency_id: data.id, token })
      const url = `${window.location.origin}/invite?token=${token}`
      setInviteLink({ url, agencyName: data.name })
    }
    setName(''); setShowForm(false); setSaving(false)
  }

  async function shareInvite() {
    if (!inviteLink) return
    const text = `안녕하세요! Krookie에 ${inviteLink.agencyName} 기획사 계정을 만들어드렸어요.\n아래 링크로 가입해주세요 (7일 유효):\n${inviteLink.url}`
    if (navigator.share) {
      await navigator.share({ title: `Krookie — ${inviteLink.agencyName} 초대`, text, url: inviteLink.url })
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function toggleVerified(id: string, current: boolean) {
    await supabase.from('agencies').update({ is_verified: !current }).eq('id', id)
    setAgencies(prev => prev.map(a => a.id === id ? { ...a, is_verified: !current } : a))
  }

  async function deleteAgency(id: string, name: string) {
    if (!confirm(`"${name}"을(를) 삭제할까요?\n관련 계정 및 데이터도 함께 삭제됩니다.`)) return
    await supabase.from('agencies').delete().eq('id', id)
    setAgencies(prev => prev.filter(a => a.id !== id))
  }

  const pending = agencies.filter(a => a.business_registration_url && !a.is_verified)
  const displayed = tab === 'pending' ? pending : agencies

  const inputStyle = { width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.13)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#241C15' }

  return (
    <div className="min-h-screen pb-10" style={{ background: '#FFF8E7' }}>
      <AdminNav />

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#241C15' }}>기획사 관리 <span style={{ fontSize: 14, color: '#8A7F6E', fontWeight: 500 }}>({agencies.length}개)</span></h1>
          <button onClick={() => setShowForm(v => !v)}
            style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(255,111,60,0.3)' }}>
            + 추가
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab('pending')} style={{
            padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: tab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#FFFFFF',
            color: tab === 'pending' ? 'white' : '#8A7F6E',
            boxShadow: tab === 'pending' ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
          }}>
            인증 대기 {pending.length > 0 && <span style={{ background: 'rgba(36,28,21,0.33)', borderRadius: 6, padding: '1px 6px' }}>{pending.length}</span>}
          </button>
          <button onClick={() => setTab('all')} style={{
            padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: tab === 'all' ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : '#FFFFFF',
            color: tab === 'all' ? 'white' : '#8A7F6E',
          }}>
            전체
          </button>
        </div>

        {inviteLink && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,111,60,0.08), rgba(216,74,30,0.04))',
            border: '1px solid rgba(255,111,60,0.25)',
            borderRadius: 18, padding: '18px 20px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <span style={{ fontWeight: 700, color: '#FF6F3C', fontSize: 14 }}>{inviteLink.agencyName} 초대 링크가 생성됐어요</span>
              <button onClick={() => setInviteLink(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(36,28,21,0.39)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 14px',
              fontSize: 11, color: 'rgba(36,28,21,0.65)', wordBreak: 'break-all', marginBottom: 12, fontFamily: 'monospace',
            }}>
              {inviteLink.url}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink.url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12, border: '1px solid rgba(255,111,60,0.3)',
                  background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,111,60,0.08)',
                  color: copied ? '#34d399' : '#FF6F3C', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                {copied ? '✓ 복사됨' : '링크 복사'}
              </button>
              <button
                onClick={shareInvite}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #fee500, #ffd900)',
                  color: '#1a1a00', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}>
                카카오톡으로 보내기
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(36,28,21,0.26)', textAlign: 'center', marginTop: 10 }}>
              7일 후 만료 · 1회만 사용 가능
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleAdd} style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)', marginBottom: 20 }}>
            <p style={{ fontWeight: 700, color: '#241C15', marginBottom: 14, fontSize: 15 }}>새 기획사 등록</p>
            <div className="flex flex-col gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="기획사명 *" required style={inputStyle} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(36,28,21,0.1)', background: 'none', color: '#8A7F6E', fontWeight: 700 }}>취소</button>
                <button type="submit" disabled={saving}
                  style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', fontWeight: 700 }}>
                  {saving ? '저장 중...' : '등록'}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>불러오는 중...</div>
        ) : displayed.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(36,28,21,0.1)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#241C15' }}>인증 대기 중인 기획사가 없어요</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={onLogoSelected}
              style={{ display: 'none' }}
            />
            {displayed.map(a => (
              <div key={a.id} style={{
                background: '#FFFFFF', borderRadius: 18, padding: '18px 20px',
                border: `1px solid ${a.business_registration_url && !a.is_verified ? 'rgba(251,191,36,0.25)' : 'rgba(36,28,21,0.09)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: a.business_registration_url ? 14 : 0 }}>
                  <button
                    onClick={() => pickLogo(a.id)}
                    title="클릭해서 로고 등록/변경"
                    style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
                      background: 'rgba(255,111,60,0.12)', padding: 0, cursor: 'pointer',
                      border: a.logo_url ? '1px solid rgba(36,28,21,0.09)' : '1px dashed rgba(255,111,60,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {logoUploading === a.id
                      ? <span style={{ fontSize: 10, fontWeight: 700, color: '#D84A1E' }}>올리는 중</span>
                      : a.logo_url
                      ? <img src={a.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#FFFFFF' }} />
                      : <span style={{ fontSize: 10, fontWeight: 700, color: '#D84A1E', lineHeight: 1.2 }}>로고<br />추가</span>
                    }
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#241C15', fontSize: 15 }}>{a.name}</span>
                      {a.is_verified && <span style={{ fontSize: 11, background: 'rgba(34,197,94,0.12)', color: '#34d399', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>인증</span>}
                      {a.business_registration_url && !a.is_verified && (
                        <span style={{ fontSize: 11, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>심사대기</span>
                      )}
                    </div>
                    {a.description && <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{a.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => toggleVerified(a.id, a.is_verified)}
                      style={{
                        fontSize: 12, padding: '8px 14px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer',
                        background: a.is_verified ? '#FFFFFF' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                        color: a.is_verified ? '#8A7F6E' : 'white',
                        boxShadow: a.is_verified ? 'none' : '0 2px 8px rgba(34,197,94,0.3)',
                      }}>
                      {a.is_verified ? '인증해제' : '인증'}
                    </button>
                    <button onClick={() => deleteAgency(a.id, a.name)}
                      style={{
                        fontSize: 12, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)',
                        background: 'rgba(248,113,113,0.06)', color: '#DC2626', fontWeight: 700, cursor: 'pointer',
                      }}>
                      삭제
                    </button>
                  </div>
                </div>

                {a.business_registration_url && (
                  <div style={{ borderTop: '1px solid rgba(36,28,21,0.09)', paddingTop: 14 }}>
                    <div style={{ fontSize: 12, color: '#8A7F6E', fontWeight: 600, marginBottom: 8 }}>명함</div>
                    <img
                      src={a.business_registration_url}
                      alt="명함"
                      onClick={() => setViewingImg(a.business_registration_url)}
                      style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 10, border: '1px solid rgba(36,28,21,0.09)', background: '#FFFFFF', cursor: 'pointer' }}
                    />
                    <div style={{ fontSize: 11, color: '#8A7F6E', marginTop: 6, textAlign: 'center' }}>클릭하면 크게 볼 수 있어요</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingImg && (
        <div onClick={() => setViewingImg(null)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, cursor: 'pointer',
        }}>
          <img src={viewingImg} alt="명함" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}

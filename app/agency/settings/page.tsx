'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import { useRouter } from 'next/navigation'
import { CheckCircle, Upload, Building2 } from 'lucide-react'

type Agency = {
  id: string
  name: string
  description: string | null
  website: string | null
  is_verified: boolean
  business_registration_url: string | null
  business_registration_number: string | null
}

const inputStyle = {
  background: '#f8f8fc', border: '1px solid #e0e0f0',
  borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#1e1b4b', width: '100%',
}

export default function AgencySettingsPage() {
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', website: '', business_registration_number: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }

      const { data: am } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).single()
      if (!am?.agency_id) { setLoading(false); return }

      const { data: ag } = await supabase.from('agencies').select('*').eq('id', am.agency_id).single()
      if (ag) {
        setAgency(ag as Agency)
        setForm({
          name: ag.name ?? '',
          description: ag.description ?? '',
          website: ag.website ?? '',
          business_registration_number: (ag as Agency).business_registration_number ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!agency || !form.name.trim()) return
    setSaving(true)
    await supabase.from('agencies').update({
      name: form.name.trim(),
      description: form.description.trim() || null,
      website: form.website.trim() || null,
      business_registration_number: form.business_registration_number.trim() || null,
    }).eq('id', agency.id)
    setAgency(prev => prev ? { ...prev, ...form } : prev)
    setSaving(false)
    alert('저장되었습니다.')
  }

  async function handleImageUpload(file: File) {
    if (!agency) return
    setUploading(true)
    try {
      const res = await fetch('/api/r2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!res.ok) throw new Error('URL 생성 실패')
      const { url, publicUrl } = await res.json()

      const ok = await new Promise<boolean>(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.onload = () => resolve(xhr.status === 200)
        xhr.onerror = () => resolve(false)
        xhr.send(file)
      })
      if (!ok) throw new Error('업로드 실패')

      await supabase.from('agencies').update({ business_registration_url: publicUrl }).eq('id', agency.id)
      setAgency(prev => prev ? { ...prev, business_registration_url: publicUrl } : prev)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '업로드 실패')
    }
    setUploading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8baa' }}>불러오는 중...</div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8b8baa', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>기획사 설정</h1>
        </div>

        {/* 인증 상태 */}
        <div style={{
          background: agency?.is_verified ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef9c3, #fef3c7)',
          border: `1px solid ${agency?.is_verified ? '#86efac' : '#fcd34d'}`,
          borderRadius: 20, padding: '18px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 28 }}>{agency?.is_verified ? '✅' : '⏳'}</div>
          <div>
            <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 15 }}>
              {agency?.is_verified ? '인증된 기획사' : '인증 대기 중'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {agency?.is_verified
                ? '사업자등록이 확인된 기획사입니다.'
                : agency?.business_registration_url
                  ? '사업자등록증이 제출되었습니다. 관리자 검토 후 인증됩니다.'
                  : '사업자등록증을 제출하면 인증 심사를 받을 수 있습니다.'}
            </div>
          </div>
        </div>

        {/* 사업자등록증 업로드 */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, border: '1px solid #e0e0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Building2 size={18} color="#6366f1" strokeWidth={2} />
            <span style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 15 }}>사업자등록증</span>
          </div>

          {agency?.business_registration_url ? (
            <div style={{ marginBottom: 12 }}>
              <img
                src={agency.business_registration_url}
                alt="사업자등록증"
                style={{ width: '100%', borderRadius: 12, border: '1px solid #e0e0f0', maxHeight: 300, objectFit: 'contain', background: '#f8f8fc' }}
              />
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} strokeWidth={2} /> 제출 완료
              </div>
            </div>
          ) : null}

          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: uploading ? '#f0f0f8' : 'linear-gradient(135deg, #eef2ff, #ede9fe)',
            border: '1.5px dashed #a5b4fc', borderRadius: 14, padding: '16px',
            cursor: uploading ? 'default' : 'pointer', color: '#6366f1', fontWeight: 700, fontSize: 14,
          }}>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
              disabled={uploading} />
            <Upload size={18} strokeWidth={2} />
            {uploading ? '업로드 중...' : agency?.business_registration_url ? '사진 교체' : '사진 업로드'}
          </label>
          <div style={{ fontSize: 12, color: '#8b8baa', marginTop: 8, textAlign: 'center' }}>
            JPG, PNG 등 이미지 파일 · 사업자등록증 원본 또는 사본
          </div>
        </div>

        {/* 기본 정보 */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e0e0f0' }}>
          <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 15, marginBottom: 16 }}>기본 정보</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8b8baa', marginBottom: 4, display: 'block' }}>기획사명 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b8baa', marginBottom: 4, display: 'block' }}>사업자등록번호</label>
              <input value={form.business_registration_number}
                onChange={e => setForm(f => ({ ...f, business_registration_number: e.target.value }))}
                placeholder="000-00-00000" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b8baa', marginBottom: 4, display: 'block' }}>소개</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b8baa', marginBottom: 4, display: 'block' }}>웹사이트</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://" style={inputStyle} />
            </div>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: saving || !form.name.trim() ? 0.6 : 1, marginTop: 4,
            }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

      </div>
      <AgencyNav />
    </div>
  )
}

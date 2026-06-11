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
  background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#eeeeff', width: '100%',
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
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570' }}>불러오는 중...</div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8888aa', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#eeeeff' }}>기획사 설정</h1>
        </div>

        <div style={{
          background: agency?.is_verified ? 'rgba(34,197,94,0.08)' : 'rgba(251,191,36,0.08)',
          border: `1px solid ${agency?.is_verified ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.25)'}`,
          borderRadius: 20, padding: '18px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 28 }}>{agency?.is_verified ? '✅' : '⏳'}</div>
          <div>
            <div style={{ fontWeight: 800, color: '#eeeeff', fontSize: 15 }}>
              {agency?.is_verified ? '인증된 기획사' : '인증 대기 중'}
            </div>
            <div style={{ fontSize: 12, color: '#8888aa', marginTop: 2 }}>
              {agency?.is_verified
                ? '인증이 완료된 기획사입니다.'
                : agency?.business_registration_url
                  ? '명함이 제출되었습니다. 관리자 검토 후 인증됩니다.'
                  : '명함을 제출하면 인증 심사를 받을 수 있습니다.'}
            </div>
          </div>
        </div>

        <div style={{ background: '#111118', borderRadius: 20, padding: 20, marginBottom: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Building2 size={18} color="#818cf8" strokeWidth={2} />
            <span style={{ fontWeight: 800, color: '#eeeeff', fontSize: 15 }}>명함</span>
          </div>

          {agency?.business_registration_url ? (
            <div style={{ marginBottom: 12 }}>
              <img
                src={agency.business_registration_url}
                alt="명함"
                style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', maxHeight: 300, objectFit: 'contain', background: '#1a1a25' }}
              />
              <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} strokeWidth={2} /> 제출 완료
              </div>
            </div>
          ) : null}

          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: uploading ? '#1a1a25' : 'rgba(99,102,241,0.06)',
            border: '1.5px dashed rgba(99,102,241,0.4)', borderRadius: 14, padding: '16px',
            cursor: uploading ? 'default' : 'pointer', color: '#818cf8', fontWeight: 700, fontSize: 14,
          }}>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
              disabled={uploading} />
            <Upload size={18} strokeWidth={2} />
            {uploading ? '업로드 중...' : agency?.business_registration_url ? '명함 교체' : '명함 업로드'}
          </label>
          <div style={{ fontSize: 12, color: '#555570', marginTop: 8, textAlign: 'center' }}>
            회사명이 보이는 명함 앞면 사진 (JPG, PNG)
          </div>
        </div>

        <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontWeight: 800, color: '#eeeeff', fontSize: 15, marginBottom: 16 }}>기본 정보</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: '#555570', marginBottom: 4, display: 'block' }}>기획사명 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#555570', marginBottom: 4, display: 'block' }}>소개</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#555570', marginBottom: 4, display: 'block' }}>웹사이트</label>
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

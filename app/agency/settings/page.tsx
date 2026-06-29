'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import { useRouter } from 'next/navigation'
import { CheckCircle, Upload, Building2, Bell, BellOff, BellRing, X } from 'lucide-react'

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
  const [notifModal, setNotifModal] = useState(false)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission)
  }, [])

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
            <Building2 size={18} color="#22d3ee" strokeWidth={2} />
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
            background: uploading ? '#1a1a25' : 'rgba(6,182,212,0.06)',
            border: '1.5px dashed rgba(6,182,212,0.4)', borderRadius: 14, padding: '16px',
            cursor: uploading ? 'default' : 'pointer', color: '#22d3ee', fontWeight: 700, fontSize: 14,
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
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: saving || !form.name.trim() ? 0.6 : 1, marginTop: 4,
            }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* 알림 설정 */}
        <div style={{ marginTop: 16, background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontWeight: 800, color: '#eeeeff', fontSize: 15, marginBottom: 16 }}>알림 설정</div>
          <button onClick={() => setNotifModal(true)} style={{
            width: '100%', padding: '14px 18px', borderRadius: 14,
            background: notifPerm === 'granted' ? 'rgba(6,182,212,0.08)' : notifPerm === 'denied' ? 'rgba(248,113,113,0.08)' : '#1a1a25',
            border: `1px solid ${notifPerm === 'granted' ? 'rgba(6,182,212,0.25)' : notifPerm === 'denied' ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            {notifPerm === 'granted' ? <BellRing size={20} color="#22d3ee" strokeWidth={2} /> : notifPerm === 'denied' ? <BellOff size={20} color="#f87171" strokeWidth={2} /> : <Bell size={20} color="#555570" strokeWidth={2} />}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: notifPerm === 'granted' ? '#22d3ee' : notifPerm === 'denied' ? '#f87171' : '#8888aa' }}>
                {notifPerm === 'granted' ? '알림 켜짐' : notifPerm === 'denied' ? '알림 차단됨' : '알림 꺼짐'}
              </div>
              <div style={{ fontSize: 12, color: '#555570', marginTop: 1 }}>탭해서 설정 변경</div>
            </div>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        <div style={{ marginTop: 16, marginBottom: 100 }}>
          <button onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = '/login'
          }} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: '1px solid rgba(248,113,113,0.2)',
            background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            로그아웃
          </button>
        </div>
      </div>

      <AgencyNav />

      {notifModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setNotifModal(false)}>
          <div style={{ background: '#111118', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#eeeeff', margin: 0 }}>알림 설정</h3>
              <button onClick={() => setNotifModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555570', padding: 4 }}><X size={20} /></button>
            </div>
            {notifPerm === 'granted' && (
              <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                <BellRing size={32} color="#22d3ee" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#eeeeff', marginBottom: 6 }}>알림이 켜져 있어요</p>
                <p style={{ fontSize: 13, color: '#8888aa' }}>새 지원자, 채팅 알림을 받고 있습니다</p>
              </div>
            )}
            {notifPerm === 'denied' && (
              <>
                <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                  <BellOff size={32} color="#f87171" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#eeeeff', marginBottom: 6 }}>알림이 차단되어 있어요</p>
                </div>
                <div style={{ background: '#1a1a25', borderRadius: 14, padding: '16px', fontSize: 13, color: '#8888aa', lineHeight: 1.7 }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#eeeeff' }}>Chrome (Android)</p>
                  <p style={{ margin: 0 }}>주소창 자물쇠 아이콘 → 알림 → 허용</p>
                  <p style={{ margin: '12px 0 8px', fontWeight: 700, color: '#eeeeff' }}>Safari (iPhone)</p>
                  <p style={{ margin: 0 }}>설정 앱 → Safari → 알림 허용</p>
                </div>
              </>
            )}
            {notifPerm === 'default' && (
              <>
                <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 20, lineHeight: 1.6 }}>새 지원자가 오디션에 지원하거나 채팅이 오면 알림을 받을 수 있어요</p>
                <button onClick={async () => {
                  const perm = await Notification.requestPermission()
                  setNotifPerm(perm)
                  setNotifModal(false)
                }} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: 'none', borderRadius: 14, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  알림 허용하기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

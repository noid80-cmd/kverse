'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mic2, Building2, Mail, Upload, CheckCircle } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

const inputStyle = {
  width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff',
}

export default function SignupPage() {
  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang)
  const [step, setStep] = useState<'role' | 'method' | 'form'>('role')
  const [role, setRole] = useState<'talent' | 'agency'>('talent')
  const [name, setName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [bizRegFile, setBizRegFile] = useState<File | null>(null)
  const [bizRegUrl, setBizRegUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [isKakao, setIsKakao] = useState(false)

  useEffect(() => {
    setIsKakao(/KAKAOTALK/i.test(navigator.userAgent))
  }, [])

  async function handleSocialLogin(provider: 'kakao' | 'google') {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    })
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBizRegFile(file)
    setUploading(true)
    setError('')
    try {
      const res = await fetch('/api/upload-business-reg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!res.ok) throw new Error('업로드 URL 생성 실패')
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
      setBizRegUrl(publicUrl)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '업로드 실패')
      setBizRegFile(null)
    }
    setUploading(false)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (role === 'agency' && !bizRegUrl) { setError(tx.auth.bizRegRequired); return }
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          name, role,
          ...(role === 'agency' ? {
            agency_name: agencyName.trim(),
            business_reg_url: bizRegUrl,
          } : {}),
        },
      },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (role === 'agency') { setDone(true); return }
    router.push('/onboarding')
  }

  const agencyFormValid = role !== 'agency' || (agencyName.trim() && bizRegUrl)

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#09090f' }}>
      <div className="text-center">
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#22d3ee' }}>
          <Mail size={26} strokeWidth={1.8} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#eeeeff', marginBottom: 8 }}>{tx.auth.signupDone}</h2>
        <p style={{ color: '#8888aa', fontSize: 14, marginBottom: 24 }}>{tx.auth.goToDashboard}</p>
        <Link href="/login" style={{ color: '#22d3ee', fontWeight: 700 }}>{tx.auth.loginLink}</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#09090f' }}>
      <div className="w-full max-w-sm flex flex-col" style={{ marginBottom: '8vh' }}>

        <div className="flex flex-col items-center mb-8">
          <div style={{
            width: 64, height: 64, borderRadius: 20, marginBottom: 14,
            background: 'linear-gradient(145deg, #001a20, #0a3d4a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(6,182,212,0.3)',
          }}>
            <svg width="38" height="38" viewBox="0 0 100 100">
              <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#06b6d4" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff', marginBottom: 4 }}>{tx.auth.signupTitle}</h1>
          <p style={{ fontSize: 13, color: '#8888aa' }}>
            {step === 'role' ? tx.auth.signupStepRole : step === 'method' ? tx.auth.signupStepMethod : tx.auth.signupStepForm}
          </p>
        </div>

        {step === 'role' && (
          <div className="flex flex-col gap-3">
            {([
              { value: 'talent', label: tx.auth.roleTalent, desc: tx.auth.roleTalentDesc, icon: <Mic2 size={22} strokeWidth={1.8} /> },
              { value: 'agency', label: tx.auth.roleAgency, desc: tx.auth.roleAgencyDesc, icon: <Building2 size={22} strokeWidth={1.8} /> },
            ] as const).map(r => (
              <button key={r.value} onClick={() => setRole(r.value)}
                className="w-full text-left p-5 rounded-2xl transition"
                style={{
                  background: role === r.value ? 'rgba(6,182,212,0.12)' : '#111118',
                  border: `2px solid ${role === r.value ? '#0891b2' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: role === r.value ? 'rgba(6,182,212,0.15)' : '#1a1a25', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: role === r.value ? '#22d3ee' : '#555570' }}>{r.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#eeeeff', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: '#8888aa' }}>{r.desc}</div>
              </button>
            ))}
            <button onClick={() => role === 'agency' ? setStep('form') : setStep('method')}
              className="w-full py-4 rounded-2xl text-white mt-1"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}>
              {tx.common.next}
            </button>
          </div>
        )}

        {step === 'method' && (
          <div className="flex flex-col gap-3">
            {!isKakao && (
              <button onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl"
                style={{ background: '#111118', color: '#eeeeff', fontSize: 16, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                  <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
                </svg>
                {tx.auth.signupGoogle}
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 12, color: '#555570', fontWeight: 600 }}>{tx.auth.signupEmailBtn}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <button onClick={() => setStep('form')}
              className="w-full py-4 rounded-2xl"
              style={{ background: '#111118', color: '#22d3ee', fontSize: 15, fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Mail size={18} strokeWidth={2} /> {tx.auth.signupEmailBtn}
            </button>

            <button onClick={() => setStep('role')} style={{ background: 'none', border: 'none', color: '#555570', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
              {tx.common.back}
            </button>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={tx.auth.namePlaceholder} required style={inputStyle} />
            {role === 'agency' && (
              <>
                <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)}
                  placeholder={tx.auth.agencyNamePlaceholder} required style={inputStyle} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#8888aa', marginBottom: 4 }}>{tx.auth.bizRegUpload}</p>
                  <p style={{ fontSize: 11, color: '#555570', marginBottom: 8 }}>{tx.auth.bizRegUpload}</p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                  {bizRegUrl ? (
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden' }}>
                      <img src={bizRegUrl} alt="명함" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', background: '#1a1a25', display: 'block' }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ width: '100%', padding: '10px', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#22d3ee', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <CheckCircle size={14} strokeWidth={2} /> {tx.common.uploadDone}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      style={{ width: '100%', padding: '16px', borderRadius: 14, border: '1.5px dashed rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.06)', color: uploading ? '#555570' : '#22d3ee', fontSize: 14, fontWeight: 700, cursor: uploading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Upload size={16} strokeWidth={2} />
                      {uploading ? tx.auth.bizRegUploading : tx.auth.bizRegUpload}
                    </button>
                  )}
                </div>
              </>
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={tx.auth.emailPlaceholder} required style={inputStyle} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={tx.auth.passwordMinPlaceholder} minLength={6} required style={inputStyle} />
            {error && <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{error}</p>}
            <button type="submit" disabled={loading || !agencyFormValid}
              className="w-full py-4 rounded-2xl text-white disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', fontSize: 17, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}>
              {loading ? tx.auth.signingUp : tx.auth.signupBtn}
            </button>
            <button type="button" onClick={() => setStep(role === 'agency' ? 'role' : 'method')}
              style={{ background: 'none', border: 'none', color: '#555570', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
              {tx.common.back}
            </button>
          </form>
        )}

        <p className="text-center text-sm font-medium mt-6" style={{ color: '#8888aa' }}>
          {tx.auth.hasAccount}{' '}
          <Link href="/login" style={{ color: '#22d3ee', fontWeight: 700 }}>{tx.auth.loginLink}</Link>
        </p>
      </div>
    </div>
  )
}

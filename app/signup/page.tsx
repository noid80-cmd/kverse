'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isNativeApp } from '@/lib/capacitor'
import { Mic2, Building2, Mail, Upload, CheckCircle } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

const inputStyle = {
  width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.13)',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#241C15',
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
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    setIsKakao(/KAKAOTALK/i.test(navigator.userAgent))
  }, [])

  async function handleSocialLogin(provider: 'kakao' | 'google' | 'apple') {
    if (!agreed) { setError('이용약관에 동의해주세요.'); return }
    const supabase = createClient()
    // 네이티브 앱 + 구글/애플 로그인일 때만 커스텀 스킴 콜백을 쓴다 — iOS 쪽
    // GoogleAuthInterceptorPlugin/AppleAuthInterceptorPlugin이 이 이동을
    // ASWebAuthenticationSession으로 가로채 처리한 뒤
    // https://kpick.app/auth/callback?role=...&code=... 로 변환해 웹뷰에
    // 다시 로드해준다.
    const redirectTo = (provider === 'google' || provider === 'apple') && isNativeApp()
      ? `kpick://auth-callback?role=${role}`
      : `${window.location.origin}/auth/callback?role=${role}`
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
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
    if (!agreed) { setError('이용약관에 동의해주세요.'); return }
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

    fetch('/api/notify-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, agency_name: agencyName.trim() || undefined }),
    }).catch(() => {})

    if (role === 'agency') { setDone(true); return }
    router.push('/onboarding')
  }

  const agencyFormValid = role !== 'agency' || (agencyName.trim() && bizRegUrl)

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#FFF8E7' }}>
      <div className="text-center">
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,111,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#D84A1E' }}>
          <Mail size={26} strokeWidth={1.8} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#241C15', marginBottom: 8 }}>{tx.auth.signupDone}</h2>
        <p style={{ color: '#8A7F6E', fontSize: 14, marginBottom: 24 }}>{tx.auth.goToDashboard}</p>
        <Link href="/login" style={{ color: '#D84A1E', fontWeight: 700 }}>{tx.auth.loginLink}</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#FFF8E7' }}>
      <div className="w-full max-w-sm flex flex-col" style={{ marginBottom: '8vh' }}>

        <div className="flex flex-col items-center mb-8">
          <div style={{
            width: 64, height: 64, borderRadius: 20, marginBottom: 14,
            background: 'linear-gradient(145deg, #FFEDE0, #FFD9BC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(255,111,60,0.3)',
          }}>
            <svg width="46" height="46" viewBox="0 0 100 100">
              <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#FF6F3C" />
              <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="#FF6F3C" />
              <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(255,111,60,0.8)" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#241C15', marginBottom: 4 }}>{tx.auth.signupTitle}</h1>
          <p style={{ fontSize: 13, color: '#8A7F6E' }}>
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
                  background: role === r.value ? 'rgba(255,111,60,0.12)' : '#FFFFFF',
                  border: `2px solid ${role === r.value ? '#D84A1E' : 'rgba(36,28,21,0.1)'}`,
                }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: role === r.value ? 'rgba(255,111,60,0.15)' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: role === r.value ? '#D84A1E' : '#8A7F6E' }}>{r.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#241C15', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: '#8A7F6E' }}>{r.desc}</div>
              </button>
            ))}
            <button onClick={() => role === 'agency' ? setStep('form') : setStep('method')}
              className="w-full py-4 rounded-2xl text-white mt-1"
              style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,111,60,0.3)' }}>
              {tx.common.next}
            </button>
          </div>
        )}

        {step === 'method' && (
          <div className="flex flex-col gap-3">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#5A4F42', cursor: 'pointer', marginBottom: 2 }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                <Link href="/terms" target="_blank" style={{ color: '#D84A1E', fontWeight: 700, textDecoration: 'underline' }}>이용약관 및 커뮤니티 가이드라인</Link>에 동의합니다 (필수)
              </span>
            </label>
            {!isKakao && (
              <button onClick={() => handleSocialLogin('apple')}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl"
                style={{ background: '#000000', color: '#FFFFFF', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.014.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.696.91-1.395 0-2.35-1.25-3.44-2.79-1.36-1.94-2.42-4.94-2.42-7.78 0-4.58 2.98-7.01 5.92-7.01 1.365 0 2.51.9 3.37.9.81 0 2.11-.96 3.7-.96.61 0 2.81.06 4.28 2.09-.11.07-2.55 1.49-2.55 4.53 0 3.63 3.19 4.9 3.41 5.0z"/>
                </svg>
                {tx.auth.signupApple}
              </button>
            )}
            {!isKakao && (
              <button onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl"
                style={{ background: '#FFFFFF', color: '#241C15', fontSize: 16, fontWeight: 700, border: '1px solid rgba(36,28,21,0.13)', cursor: 'pointer' }}>
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
              <div className="flex-1 h-px" style={{ background: 'rgba(36,28,21,0.1)' }} />
              <span style={{ fontSize: 12, color: '#8A7F6E', fontWeight: 600 }}>{tx.auth.signupEmailBtn}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(36,28,21,0.1)' }} />
            </div>

            <button onClick={() => setStep('form')}
              className="w-full py-4 rounded-2xl"
              style={{ background: '#FFFFFF', color: '#D84A1E', fontSize: 15, fontWeight: 700, border: '1px solid rgba(36,28,21,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Mail size={18} strokeWidth={2} /> {tx.auth.signupEmailBtn}
            </button>

            <button onClick={() => setStep('role')} style={{ background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
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
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 4 }}>{tx.auth.bizRegUpload}</p>
                  <p style={{ fontSize: 11, color: '#8A7F6E', marginBottom: 8 }}>{tx.auth.bizRegUpload}</p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                  {bizRegUrl ? (
                    <div style={{ border: '1px solid rgba(36,28,21,0.13)', borderRadius: 14, overflow: 'hidden' }}>
                      <img src={bizRegUrl} alt="명함" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', background: '#FFFFFF', display: 'block' }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ width: '100%', padding: '10px', background: 'none', border: 'none', borderTop: '1px solid rgba(36,28,21,0.1)', color: '#D84A1E', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <CheckCircle size={14} strokeWidth={2} /> {tx.common.uploadDone}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      style={{ width: '100%', padding: '16px', borderRadius: 14, border: '1.5px dashed rgba(255,111,60,0.4)', background: 'rgba(255,111,60,0.06)', color: uploading ? '#8A7F6E' : '#D84A1E', fontSize: 14, fontWeight: 700, cursor: uploading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#5A4F42', cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                <Link href="/terms" target="_blank" style={{ color: '#D84A1E', fontWeight: 700, textDecoration: 'underline' }}>이용약관 및 커뮤니티 가이드라인</Link>에 동의합니다 (필수)
              </span>
            </label>
            {error && <p style={{ color: '#DC2626', fontSize: 14, textAlign: 'center' }}>{error}</p>}
            <button type="submit" disabled={loading || !agencyFormValid || !agreed}
              className="w-full py-4 rounded-2xl text-white disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', fontSize: 17, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,111,60,0.3)' }}>
              {loading ? tx.auth.signingUp : tx.auth.signupBtn}
            </button>
            <button type="button" onClick={() => setStep(role === 'agency' ? 'role' : 'method')}
              style={{ background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
              {tx.common.back}
            </button>
          </form>
        )}

        <p className="text-center text-sm font-medium mt-6" style={{ color: '#8A7F6E' }}>
          {tx.auth.hasAccount}{' '}
          <Link href="/login" style={{ color: '#D84A1E', fontWeight: 700 }}>{tx.auth.loginLink}</Link>
        </p>
      </div>
    </div>
  )
}

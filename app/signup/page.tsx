'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mic2, Building2, Mail } from 'lucide-react'

const inputStyle = {
  width: '100%', background: '#fff', border: '1px solid #e0e0f0',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#1e1b4b',
}

export default function SignupPage() {
  const [step, setStep] = useState<'role' | 'method' | 'form'>('role')
  const [role, setRole] = useState<'talent' | 'agency'>('talent')
  const [name, setName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role, ...(role === 'agency' ? { agency_name: agencyName.trim(), business_number: businessNumber.trim() } : {}) } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#f0f0f8' }}>
      <div className="text-center">
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#6366f1' }}>
          <Mail size={26} strokeWidth={1.8} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>가입 완료!</h2>
        <p style={{ color: '#8b8baa', fontSize: 14, marginBottom: 24 }}>이제 로그인하세요</p>
        <Link href="/login" style={{ color: '#6366f1', fontWeight: 700 }}>로그인하러 가기</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#f0f0f8' }}>
      <div className="w-full max-w-sm flex flex-col" style={{ marginBottom: '8vh' }}>

        <div className="flex flex-col items-center mb-8">
          <div style={{
            width: 64, height: 64, borderRadius: 20, marginBottom: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
          }}>
            <span style={{ color: 'white', fontSize: 24, fontWeight: 900 }}>K</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>KVERSE 가입</h1>
          <p style={{ fontSize: 13, color: '#8b8baa' }}>
            {step === 'role' ? '어떤 계정으로 가입할까요?' : step === 'method' ? '가입 방법을 선택해주세요' : '기본 정보를 입력해주세요'}
          </p>
        </div>

        {/* Step 1: Role 선택 */}
        {step === 'role' && (
          <div className="flex flex-col gap-3">
            {([
              { value: 'talent', label: '오디션 지망생', desc: '영상을 올리고 기획사에 노출돼요', icon: <Mic2 size={22} strokeWidth={1.8} /> },
              { value: 'agency', label: '기획사 담당자', desc: '지망생 영상을 탐색하고 연락해요', icon: <Building2 size={22} strokeWidth={1.8} /> },
            ] as const).map(r => (
              <button key={r.value} onClick={() => setRole(r.value)}
                className="w-full text-left p-5 rounded-2xl transition"
                style={{
                  background: role === r.value ? '#ede9fe' : '#fff',
                  border: `2px solid ${role === r.value ? '#6366f1' : '#e0e0f0'}`,
                }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: role === r.value ? '#ede9fe' : '#f8f8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: role === r.value ? '#6366f1' : '#94a3b8' }}>{r.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1e1b4b', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: '#8b8baa' }}>{r.desc}</div>
              </button>
            ))}
            <button onClick={() => role === 'agency' ? setStep('form') : setStep('method')}
              className="w-full py-4 rounded-2xl text-white mt-1"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              다음
            </button>
          </div>
        )}

        {/* Step 2: 가입 방법 선택 (지망생만) */}
        {step === 'method' && (
          <div className="flex flex-col gap-3">
            {!isKakao && (
              <button onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl"
                style={{ background: '#fff', color: '#1e1b4b', fontSize: 16, fontWeight: 700, border: '1px solid #d8d8ec', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                  <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
                </svg>
                Google로 가입
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: '#d8d8ec' }} />
              <span style={{ fontSize: 12, color: '#8b8baa', fontWeight: 600 }}>이메일로 가입</span>
              <div className="flex-1 h-px" style={{ background: '#d8d8ec' }} />
            </div>

            <button onClick={() => setStep('form')}
              className="w-full py-4 rounded-2xl"
              style={{ background: '#f0f0f8', color: '#6366f1', fontSize: 15, fontWeight: 700, border: '1px solid #e0e0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Mail size={18} strokeWidth={2} /> 이메일로 가입
            </button>

            <button onClick={() => setStep('role')} style={{ background: 'none', border: 'none', color: '#8b8baa', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
              뒤로
            </button>
          </div>
        )}

        {/* Step 3: 이메일 폼 */}
        {step === 'form' && (
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="담당자 이름" required style={inputStyle} />
            {role === 'agency' && (
              <>
                <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)}
                  placeholder="기획사명 *" required style={inputStyle} />
                <input type="text" value={businessNumber} onChange={e => setBusinessNumber(e.target.value)}
                  placeholder="사업자등록번호 (000-00-00000)" style={inputStyle} />
              </>
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="이메일" required style={inputStyle} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)" minLength={6} required style={inputStyle} />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading || (role === 'agency' && !agencyName.trim())}
              className="w-full py-4 rounded-2xl text-white disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 17, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              {loading ? '가입 중...' : '가입하기'}
            </button>
            <button type="button" onClick={() => setStep(role === 'agency' ? 'role' : 'method')}
              style={{ background: 'none', border: 'none', color: '#8b8baa', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
              뒤로
            </button>
          </form>
        )}

        <p className="text-center text-sm font-medium mt-6" style={{ color: '#8b8baa' }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" style={{ color: '#6366f1', fontWeight: 700 }}>로그인</Link>
        </p>
      </div>
    </div>
  )
}

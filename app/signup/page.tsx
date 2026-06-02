'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const inputStyle = {
  width: '100%', background: '#fff', border: '1px solid #e0e0f0',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#1e1b4b',
}

export default function SignupPage() {
  const [step, setStep] = useState<'role' | 'form'>('role')
  const [role, setRole] = useState<'talent' | 'agency'>('talent')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#f0f0f8' }}>
      <div className="text-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>이메일을 확인해주세요</h2>
        <p style={{ color: '#8b8baa', fontSize: 14, marginBottom: 24 }}>가입 확인 링크를 보냈어요</p>
        <Link href="/login" style={{ color: '#6366f1', fontWeight: 700 }}>로그인으로 돌아가기</Link>
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
            {step === 'role' ? '어떤 계정으로 가입할까요?' : '기본 정보를 입력해주세요'}
          </p>
        </div>

        {step === 'role' ? (
          <div className="flex flex-col gap-3">
            {([
              { value: 'talent', label: '오디션 지망생', desc: '영상을 올리고 기획사에 노출돼요', icon: '🎤' },
              { value: 'agency', label: '기획사 담당자', desc: '지망생 영상을 탐색하고 연락해요', icon: '🏢' },
            ] as const).map(r => (
              <button key={r.value} onClick={() => setRole(r.value)}
                className="w-full text-left p-5 rounded-2xl transition active:scale-98"
                style={{
                  background: role === r.value ? '#ede9fe' : '#fff',
                  border: `2px solid ${role === r.value ? '#6366f1' : '#e0e0f0'}`,
                }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{r.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1e1b4b', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: '#8b8baa' }}>{r.desc}</div>
              </button>
            ))}
            <button onClick={() => setStep('form')}
              className="w-full py-4 rounded-2xl text-white mt-1 transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              다음
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="이름" required style={inputStyle} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="이메일" required style={inputStyle} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)" minLength={6} required style={inputStyle} />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl text-white disabled:opacity-50 mt-1 transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              {loading ? '가입 중...' : '가입하기'}
            </button>
            <button type="button" onClick={() => setStep('role')}
              className="text-center text-sm font-medium" style={{ color: '#8b8baa' }}>
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

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function InviteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [agency, setAgency] = useState<{ id: string; name: string } | null>(null)
  const [pageError, setPageError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setPageError('초대 링크가 올바르지 않아요'); setLoading(false); return }
    fetch(`/api/agency-invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setPageError(data.error); return }
        setAgency(data.agency)
      })
      .catch(() => setPageError('네트워크 오류가 발생했어요'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setFormError('비밀번호가 일치하지 않아요'); return }
    if (password.length < 6) { setFormError('비밀번호는 6자 이상이어야 해요'); return }
    setSubmitting(true); setFormError('')

    const res = await fetch('/api/agency-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, password }),
    })
    const data = await res.json()

    if (!res.ok) { setFormError(data.error); setSubmitting(false); return }

    const supabase = createClient()
    await supabase.auth.signInWithPassword({ email, password })
    setDone(true)
    setTimeout(() => { window.location.href = '/agency/discover' }, 1800)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff',
    outline: 'none', boxSizing: 'border-box',
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>확인 중...</div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <div style={{ color: '#f87171', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{pageError}</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>관리자에게 새 초대 링크를 요청해주세요</div>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <div style={{ color: '#34d399', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>가입 완료!</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>잠시 후 이동합니다...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24, margin: '0 auto 16px',
            background: 'linear-gradient(145deg, #001a20, #0a3d4a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(6,182,212,0.2), 0 8px 32px rgba(6,182,212,0.25)',
          }}>
            <svg width="50" height="50" viewBox="0 0 100 100">
              <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#06b6d4" />
            </svg>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>Kpick이 초대합니다</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#eeeeff', marginBottom: 4 }}>{agency?.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>기획사 계정을 만들어주세요</div>
        </div>

        {/* 폼 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: '28px 24px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>기획사명</label>
              <div style={{ ...inputStyle, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed' }}>
                {agency?.name}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>이메일</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="로그인에 사용할 이메일" required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>비밀번호</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="6자 이상" required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>비밀번호 확인</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="비밀번호 재입력" required
                style={inputStyle}
              />
            </div>

            {formError && (
              <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>{formError}</div>
            )}

            <button type="submit" disabled={submitting} style={{
              marginTop: 4, width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
            }}>
              {submitting ? '가입 중...' : '가입 완료'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          이 초대 링크는 7일간 유효해요
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(6,182,212,0.4) !important; background: rgba(6,182,212,0.05) !important; }
      `}</style>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteContent />
    </Suspense>
  )
}

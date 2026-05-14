'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import KverseLogo from '@/app/components/KverseLogo'

export default function ScoutSignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !agencyName || !contactName) {
      setError('모든 필수 항목을 입력해주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.')
      return
    }

    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('가입 중 오류가 발생했어요.'); setLoading(false); return }

    const username = `scout_${Date.now()}`
    const { error: accError } = await supabase.from('accounts').insert({
      user_id: userId,
      username,
      display_name: contactName,
      account_type: 'scout',
      agency_name: agencyName,
      is_scout_verified: false,
      gender: 'other',
    })

    if (accError) { setError(accError.message); setLoading(false); return }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🎯</div>
        <h1 className="text-2xl font-black text-white mb-3">신청이 완료됐어요</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-2">
          <span className="text-white font-semibold">{agencyName}</span> 계정을 검토 중이에요.
        </p>
        <p className="text-white/30 text-sm mb-8">승인 완료 후 이메일로 안내드릴게요.</p>
        <div className="w-full max-w-xs p-4 rounded-2xl border border-white/10 bg-white/5 text-left mb-8">
          <p className="text-white/40 text-xs mb-2 font-medium">신청 정보</p>
          <p className="text-white text-sm font-semibold">{agencyName}</p>
          <p className="text-white/50 text-sm">{contactName}{position ? ` · ${position}` : ''}</p>
          <p className="text-white/30 text-xs mt-1">{email}</p>
        </div>
        <Link href="/" className="text-white/40 hover:text-white text-sm transition">홈으로 돌아가기</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <Link href="/"><KverseLogo /></Link>
        <Link href="/login" className="text-white/40 hover:text-white text-sm transition">로그인</Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 mb-4">
              <span className="text-yellow-400 text-xs font-bold">🎯 SCOUT</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">기획사 Scout 가입</h1>
            <p className="text-white/40 text-sm">전 세계 커버 아티스트를 발굴하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-white/50 text-xs font-medium mb-1.5 block">기획사명 <span className="text-pink-500">*</span></label>
              <input
                type="text"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                placeholder="예: HYBE, SM Entertainment"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition text-sm"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs font-medium mb-1.5 block">담당자 이름 <span className="text-pink-500">*</span></label>
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition text-sm"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs font-medium mb-1.5 block">직책 <span className="text-white/20">(선택)</span></label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="예: 캐스팅 디렉터"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition text-sm"
              />
            </div>

            <div className="border-t border-white/8 pt-4">
              <label className="text-white/50 text-xs font-medium mb-1.5 block">이메일 <span className="text-pink-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="company@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition text-sm"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs font-medium mb-1.5 block">비밀번호 <span className="text-pink-500">*</span></label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6자 이상"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition text-sm"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || !agencyName || !contactName || !email || !password}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-40 mt-2"
              style={{ background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)' }}
            >
              {loading ? '처리 중...' : '가입 신청하기'}
            </button>
          </form>

          <p className="text-center text-white/20 text-xs mt-6 leading-relaxed">
            가입 신청 후 관리자 검토를 거쳐 승인돼요.<br />
            승인까지 1~3 영업일 소요될 수 있어요.
          </p>

          <p className="text-center mt-6">
            <Link href="/signup" className="text-white/30 hover:text-white/60 text-xs transition">
              일반 커버러로 가입하기 →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

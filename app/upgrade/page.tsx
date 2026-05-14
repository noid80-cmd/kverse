'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n'

type PayStatus = 'idle' | 'processing' | 'success' | 'error'

export default function UpgradePage() {
  const router = useRouter()
  const t = useT()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [isPlus, setIsPlus] = useState(false)
  const [plusExpiresAt, setPlusExpiresAt] = useState<string | null>(null)
  const [payStatus, setPayStatus] = useState<PayStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [region, setRegion] = useState<'kr' | 'global'>('kr')

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('is_plus, plus_expires_at')
        .eq('user_id', user.id)
        .single()

      if (sub?.is_plus && sub.plus_expires_at) {
        const expires = new Date(sub.plus_expires_at)
        if (expires > new Date()) {
          setIsPlus(true)
          setPlusExpiresAt(expires.toLocaleDateString())
        }
      }
    }
    load()
  }, [])

  async function handlePayment() {
    if (!user) return
    setPayStatus('processing')
    setErrorMsg('')

    // 해외 결제 — Stripe Checkout으로 리다이렉트
    if (region === 'global') {
      const res = await fetch('/api/stripe/checkout-plus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setPayStatus('error')
      setErrorMsg(t('up.errPage'))
      return
    }

    // 국내 결제 — PortOne 팝업
    const PortOne = await import('@portone/browser-sdk/v2')
    const paymentId = `kvers-plus-${user.id}-${Date.now()}`

    const response = await PortOne.requestPayment({
      storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
      channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
      paymentId,
      orderName: 'Kverse Plus 1개월',
      totalAmount: 2900,
      currency: 'KRW',
      payMethod: 'CARD',
      customer: { customerId: user.id, email: user.email },
    } as any)

    if (!response || 'code' in response) {
      setPayStatus('error')
      setErrorMsg((response as any)?.message || t('up.errCancel'))
      return
    }

    const res = await fetch('/api/payment/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    })

    if (res.ok) {
      setPayStatus('success')
      setTimeout(() => router.push('/feed'), 2500)
    } else {
      const data = await res.json().catch(() => ({}))
      setPayStatus('error')
      setErrorMsg(data.error || '결제 확인에 실패했어요.')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 네비 */}
      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">{t('common.back')}</Link>
        <span className="font-black bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">Kverse Plus</span>
        <div />
      </nav>

      <div className="max-w-sm mx-auto px-6 py-10">

        {/* 이미 구독 중 */}
        {isPlus ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👑</div>
            <h1 className="text-2xl font-black text-white mb-2">{t('up.alreadyPlus')}</h1>
            <p className="text-white/40 text-sm mb-2">{t('up.expires')}<span className="text-yellow-400 font-medium">{plusExpiresAt}</span></p>
            <Link href="/feed" className="inline-block mt-6 px-8 py-3 rounded-full font-medium text-black"
              style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}>
              {t('up.goFeed')}
            </Link>
          </div>
        ) : payStatus === 'success' ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-2xl font-black text-white mb-2">{t('up.successTitle')}</h1>
            <p className="text-white/40 text-sm">{t('up.successDesc')}</p>
            <div className="mt-6 w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">👑</div>
              <h1 className="text-2xl font-black text-white">Kverse Plus</h1>
              <p className="text-white/40 text-sm mt-1">{t('up.desc')}</p>
            </div>

            {/* 혜택 목록 */}
            <div
              className="rounded-2xl p-5 mb-6 border"
              style={{ borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)' }}
            >
              <p className="text-yellow-400 font-medium text-xs tracking-widest mb-4">{t('up.benefits')}</p>
              <div className="flex flex-col gap-3">
                {[
                  { icon: '🌌', text: t('up.b1') },
                  { icon: '✨', text: t('up.b2') },
                  { icon: '🏆', text: t('up.b3') },
                  { icon: '💬', text: t('up.b4') },
                  { icon: '🎬', text: t('up.b5') },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <span className="text-white/80 text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 지역 토글 */}
            <div className="flex rounded-xl overflow-hidden border border-white/10 mb-6">
              <button
                onClick={() => setRegion('kr')}
                className="flex-1 py-2.5 text-sm font-medium transition"
                style={region === 'kr'
                  ? { background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: 'black' }
                  : { color: 'rgba(255,255,255,0.35)' }}
              >
                {t('up.domestic')}
              </button>
              <button
                onClick={() => setRegion('global')}
                className="flex-1 py-2.5 text-sm font-medium transition"
                style={region === 'global'
                  ? { background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: 'black' }
                  : { color: 'rgba(255,255,255,0.35)' }}
              >
                {t('up.international')}
              </button>
            </div>

            {/* 가격 */}
            <div
              className="rounded-2xl p-5 mb-6 text-center border"
              style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.06)' }}
            >
              <p className="text-white/30 text-xs mb-1">{t('up.priceLabel')}</p>
              <p className="text-yellow-400 font-bold text-3xl">
                {region === 'kr' ? t('up.priceKr') : t('up.priceGlobal')}
              </p>
              <p className="text-white/25 text-xs mt-1">{t('up.note')}</p>
            </div>

            {/* 에러 메시지 */}
            {payStatus === 'error' && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {errorMsg}
              </div>
            )}

            {/* 결제 버튼 */}
            <button
              onClick={handlePayment}
              disabled={payStatus === 'processing'}
              className="w-full py-4 rounded-2xl font-bold text-black text-base transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
            >
              {payStatus === 'processing' ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  {t('up.processing')}
                </>
              ) : region === 'kr' ? (
                t('up.btnKr')
              ) : (
                t('up.btnGlobal')
              )}
            </button>

            <p className="text-center text-white/20 text-xs mt-4 leading-relaxed">
              {region === 'kr' ? t('up.krMethods') : t('up.globalMethods')}
              <br />{t('up.cancelNote')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

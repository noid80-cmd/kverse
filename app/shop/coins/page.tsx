'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n'

const COIN_PACKAGES = [
  { id: 'coins_100',  coins: 100,  price: 1000,  priceUsd: 0.99, bonus: 0,   labelKey: 'coins.starterPack' },
  { id: 'coins_550',  coins: 550,  price: 5000,  priceUsd: 4.99, bonus: 50,  labelKey: 'coins.popularPack' },
  { id: 'coins_1200', coins: 1200, price: 10000, priceUsd: 9.99, bonus: 200, labelKey: 'coins.premiumPack' },
]

type Account = { id: string; username: string; coins: number }

export default function CoinsPage() {
  const router = useRouter()
  const t = useT()
  const [account, setAccount] = useState<Account | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [paying, setPaying] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [region, setRegion] = useState<'kr' | 'global'>('kr')

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase.from('accounts').select('id, username, coins').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (!data) { router.push('/login'); return }
      setAccount(data)
    }
    load()
  }, [])

  async function handleBuy(pkg: typeof COIN_PACKAGES[0]) {
    if (!user || !account) return
    setPaying(pkg.id)

    // 해외 결제 — Stripe Checkout 리다이렉트
    if (region === 'global') {
      const res = await fetch('/api/stripe/checkout-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id, packageId: pkg.id }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      showToast(t('coins.errPage'))
      setPaying(null)
      return
    }

    // 국내 결제 — PortOne 팝업
    const PortOne = await import('@portone/browser-sdk/v2')
    const paymentId = `kvers-coin-${account.id}-${Date.now()}`

    const response = await PortOne.requestPayment({
      storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
      channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
      paymentId,
      orderName: `Kverse 코인 ${pkg.coins + pkg.bonus}개`,
      totalAmount: pkg.price,
      currency: 'KRW',
      payMethod: 'CARD',
      customer: { customerId: account.id, email: user.email },
    } as any)

    if (!response || 'code' in response) {
      showToast(t('coins.errCancel'))
      setPaying(null)
      return
    }

    const res = await fetch('/api/payment/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, packageId: pkg.id }),
    })

    if (res.ok) {
      const totalCoins = pkg.coins + pkg.bonus
      setAccount(prev => prev ? { ...prev, coins: prev.coins + totalCoins } : prev)
      showToast(t('coins.success', { total: totalCoins }))
    } else {
      showToast(t('coins.errCharge'))
    }
    setPaying(null)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-white/10 backdrop-blur text-white text-sm font-bold border border-white/20">
          {toast}
        </div>
      )}

      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/shop" className="text-white/40 hover:text-white transition text-sm">← {t('nav.shop')}</Link>
        </div>
        <span className="font-bold text-white">{t('coins.title')}</span>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold"
          style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#FBBF24' }}
        >
          🪙 {account?.coins ?? 0}
        </div>
      </nav>

      <div className="max-w-sm mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🪙</div>
          <h1 className="text-2xl font-black text-white">{t('coins.title')}</h1>
          <p className="text-white/40 text-sm mt-1">{t('coins.desc')}</p>
        </div>

        {/* 지역 토글 */}
        <div className="flex rounded-xl overflow-hidden border border-white/10 mb-2">
          <button
            onClick={() => setRegion('kr')}
            className="flex-1 py-2.5 text-sm font-bold transition"
            style={region === 'kr'
              ? { background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: 'black' }
              : { color: 'rgba(255,255,255,0.35)' }}
          >
            {t('coins.domestic')}
          </button>
          <button
            onClick={() => setRegion('global')}
            className="flex-1 py-2.5 text-sm font-bold transition"
            style={region === 'global'
              ? { background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: 'black' }
              : { color: 'rgba(255,255,255,0.35)' }}
          >
            {t('coins.international')}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {COIN_PACKAGES.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => handleBuy(pkg)}
              disabled={paying === pkg.id}
              className="w-full rounded-2xl p-5 border text-left transition hover:scale-[1.02] disabled:opacity-60 relative overflow-hidden"
              style={pkg.bonus > 0 ? {
                borderColor: 'rgba(251,191,36,0.4)',
                background: 'rgba(251,191,36,0.06)',
              } : {
                borderColor: 'rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              {pkg.bonus > 0 && (
                <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-black"
                  style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: 'black' }}>
                  {t('coins.bonus', { n: pkg.bonus })}
                </span>
              )}
              <div className="flex items-center gap-4">
                <div className="text-3xl">🪙</div>
                <div className="flex-1">
                  <p className="text-white font-black text-lg">
                    {pkg.coins + pkg.bonus}코인
                    {pkg.bonus > 0 && <span className="text-yellow-400 text-sm ml-1">({pkg.coins}+{pkg.bonus})</span>}
                  </p>
                  <p className="text-white/40 text-sm">{t(pkg.labelKey)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black">
                    {region === 'kr' ? `₩${pkg.price.toLocaleString()}` : `$${pkg.priceUsd.toFixed(2)}`}
                  </p>
                  {pkg.bonus > 0 && region === 'kr' && (
                    <p className="text-yellow-400 text-xs">
                      {Math.round(pkg.price / (pkg.coins + pkg.bonus))}원/개
                    </p>
                  )}
                </div>
              </div>
              {paying === pkg.id && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-white/20 text-xs mt-8 leading-relaxed">
          {region === 'kr' ? t('coins.krMethods') : t('coins.globalMethods')}
          <br />{t('coins.noRefund')}
        </p>
      </div>
    </div>
  )
}


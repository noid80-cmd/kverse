'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, GroupTheme } from '@/lib/groupThemes'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n'

type Account = {
  id: string
  username: string
  coins: number
  groups: { name: string }
}

type ShopItem = {
  id: string
  name: string
  description: string
  price: number
  type: string
  emoji: string
}

export default function ShopPage() {
  const router = useRouter()
  const t = useT()
  const [account, setAccount] = useState<Account | null>(null)
  const [items, setItems] = useState<ShopItem[]>([])
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [theme, setTheme] = useState<GroupTheme | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const { data: acc } = await supabase.from('accounts').select('*, groups(name)').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (!acc) { router.push('/login'); return }
      setAccount(acc)
      setTheme(getTheme(acc.groups?.name || ''))

      const [{ data: shopItems }, { data: owned }] = await Promise.all([
        supabase.from('shop_items').select('*').order('price', { ascending: true }),
        supabase.from('user_items').select('item_id').eq('account_id', acc.id),
      ])

      setItems(shopItems || [])
      setOwnedIds(new Set((owned || []).map((r: { item_id: string }) => r.item_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleBuy(item: ShopItem) {
    if (!account || buying) return
    if ((account.coins ?? 0) < item.price) {
      showToast(t('shop.errCoins'))
      return
    }

    setBuying(item.id)

    const { error } = await supabase
      .from('user_items')
      .insert({ account_id: account.id, item_id: item.id })

    if (error) {
      showToast(t('shop.errFail'))
      setBuying(null)
      return
    }

    const newCoins = (account.coins ?? 0) - item.price
    await supabase.from('accounts').update({ coins: newCoins }).eq('id', account.id)

    setAccount(prev => prev ? { ...prev, coins: newCoins } : prev)
    setOwnedIds(prev => new Set([...prev, item.id]))
    showToast(`${item.emoji} ${item.name} 구매 완료!`)
    setBuying(null)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const accentColor = theme?.primary === '#FFFFFF' ? '#C9A96E' : theme?.primary

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">Loading Universe...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-white/10 backdrop-blur text-white text-sm font-medium border border-white/20 transition">
          {toast}
        </div>
      )}

      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">🏠 {t('nav.home')}</Link>
          <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">{t('nav.back')}</Link>
        </div>
        <span className="font-black text-white">{t('shop.title')}</span>
        <div className="flex items-center gap-2">
          <Link
            href="/shop/coins"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition hover:opacity-80"
            style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#FBBF24' }}
          >
            🪙 {account?.coins ?? 0} <span className="text-yellow-600 text-xs">{t('shop.chargeCoins')}</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">{t('shop.title')}</h1>
          <p className="text-white/30 text-sm">{t('shop.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {items.map(item => {
            const owned = ownedIds.has(item.id)
            const canAfford = (account?.coins ?? 0) >= item.price
            return (
              <div
                key={item.id}
                className="rounded-2xl p-5 border flex flex-col gap-3"
                style={{
                  borderColor: owned ? `${accentColor}60` : `${accentColor}20`,
                  background: owned ? `${accentColor}10` : `${accentColor}05`,
                }}
              >
                <div className="text-4xl">{item.emoji}</div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.name}</p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{item.description}</p>
                  <p className="text-white/20 text-xs mt-1 capitalize">{item.type}</p>
                </div>
                <div className="mt-auto">
                  {owned ? (
                    <div
                      className="w-full py-2 rounded-xl text-center text-xs font-medium"
                      style={{ background: `${accentColor}20`, color: accentColor }}
                    >
                      {t('shop.owned')}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={buying === item.id}
                      className="w-full py-2 rounded-xl text-white text-xs font-medium transition disabled:opacity-40"
                      style={canAfford
                        ? { background: theme?.gradient }
                        : { background: 'transparent', border: `1px solid ${accentColor}20`, color: `${accentColor}50` }
                      }
                    >
                      {buying === item.id ? t('shop.buying') : canAfford ? t('shop.buyBtn', { price: item.price }) : t('shop.noCoins', { price: item.price })}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {items.length === 0 && (
          <div className="text-center py-20 text-white/20 text-sm">{t('shop.loading')}</div>
        )}

        <div className="mt-10 p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-white/20 text-xs">추후 실제 결제 시스템이 연동될 예정이에요</p>
        </div>
      </div>
    </div>
  )
}


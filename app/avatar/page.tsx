'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import Avatar, { EquippedItems } from '@/app/components/Avatar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

type Account = {
  id: string
  username: string
  gender: string
  equipped: Record<string, string>
  rpm_avatar_url: string | null
  groups: { name: string } | null
}

type ShopItem = {
  id: string
  name: string
  description: string
  price: number
  emoji: string
  slot: string
  visual: Record<string, string>
  artist: string | null
}

export default function AvatarPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const SLOT_LABELS: Record<string, string> = {
    outfit: t('av.outfit'),
    hat: t('av.hat'),
    glowstick: t('av.stick'),
    accessory: t('av.accessory'),
    skin: t('av.skin'),
    photocard: t('av.photocard'),
  }
  const [account, setAccount] = useState<Account | null>(null)
  const [ownedItems, setOwnedItems] = useState<ShopItem[]>([])
  const [equippedIds, setEquippedIds] = useState<Record<string, string>>({})
  const [activeSlot, setActiveSlot] = useState<string>('outfit')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const activeId = getActiveAccountId()
      let q = supabase.from('accounts').select('*, groups(name)').eq('user_id', user.id)
      if (activeId) q = q.eq('id', activeId)
      const { data: acc } = await q.limit(1).single()
      if (!acc) { router.push('/select-account'); return }

      setAccount(acc)
      setEquippedIds(acc.equipped || {})

      const { data: owned } = await supabase
        .from('user_items')
        .select('item_id, shop_items(id, name, description, price, emoji, slot, visual, artist)')
        .eq('account_id', acc.id)

      const items = (owned || []).map((r: any) => r.shop_items).filter(Boolean)
      setOwnedItems(items)
      setLoading(false)
    }
    load()
  }, [])

  async function handleEquip(item: ShopItem) {
    if (!account) return
    const isEquipped = equippedIds[item.slot] === item.id

    const newEquipped = { ...equippedIds }
    if (isEquipped) {
      delete newEquipped[item.slot]
    } else {
      newEquipped[item.slot] = item.id
    }

    setEquippedIds(newEquipped)
    setSaving(true)

    await supabase
      .from('accounts')
      .update({ equipped: newEquipped })
      .eq('id', account.id)

    showToast(isEquipped ? '장착 해제됐어요' : `${item.emoji} ${item.name} 장착!`)
    setSaving(false)
  }

  function buildEquippedProps(): EquippedItems {
    const result: EquippedItems = {}
    for (const [slot, itemId] of Object.entries(equippedIds)) {
      const item = ownedItems.find(i => i.id === itemId)
      if (!item) continue
      const v = item.visual || {}
      if (slot === 'outfit') result.outfit = { outfitColor: v.outfitColor, type: v.type }
      if (slot === 'hat') result.hat = { hatColor: v.hatColor, style: v.style, hatEmoji: item.emoji }
      if (slot === 'accessory') result.accessory = { type: v.type, color: v.color, emoji: item.emoji }
      if (slot === 'glowstick') result.glowstick = { glowColor: v.glowColor, shape: v.shape, emoji: item.emoji }
      if (slot === 'skin') result.skin = { auraColor: v.auraColor, gradient: v.gradient }
    }
    return result
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const theme = account?.groups ? getTheme(account.groups.name) : getTheme('')
  const accentColor = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary
  const slotItems = ownedItems.filter(i => i.slot === activeSlot)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 animate-pulse font-medium">Loading Universe...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-white/10 backdrop-blur text-white text-sm font-medium border border-white/20">
          {toast}
        </div>
      )}

      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition text-sm">🏠 {t('nav.home')}</Link>
          <Link href="/profile" className="text-white/40 hover:text-white transition text-sm">← {t('nav.profile')}</Link>
        </div>
        <span className="font-black text-white">{t('nav.avatar')}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/shop" className="text-sm px-3 py-1.5 rounded-full border border-white/20 text-white/60 hover:text-white transition">
            🛍 {t('nav.shop')}
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* 아바타 카드 */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="rounded-3xl p-6 border mb-3 relative overflow-hidden"
            style={{ background: `${accentColor}10`, borderColor: `${accentColor}30` }}
          >
            {saving && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-3xl z-10">
                <div className="text-white/60 text-sm animate-pulse">{t('common.saving')}</div>
              </div>
            )}
            <Avatar
              gender={(account?.gender as 'male' | 'female') || 'female'}
              equipped={buildEquippedProps()}
              groupColor={accentColor}
              size={180}
              rpmAvatarUrl={account?.rpm_avatar_url}
              username={account?.username}
            />
          </div>

          <p className="text-white font-semibold mt-1">@{account?.username}</p>
          {account?.groups && (
            <p className="text-sm mt-0.5" style={{ color: `${accentColor}90` }}>
              {groupDisplayName(account.groups.name, locale)} · {worldName(theme, locale)}
            </p>
          )}

          {/* 장착된 아이템 요약 */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {Object.entries(equippedIds).map(([slot, itemId]) => {
              const item = ownedItems.find(i => i.id === itemId)
              if (!item) return null
              return (
                <span key={slot} className="text-xs px-2 py-1 rounded-full border flex items-center gap-1"
                  style={{ borderColor: `${accentColor}30`, color: `${accentColor}80` }}>
                  {item.emoji} {item.name}
                </span>
              )
            })}
          </div>
        </div>

        {/* 슬롯 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {Object.entries(SLOT_LABELS).map(([slot, label]) => (
            <button
              key={slot}
              onClick={() => setActiveSlot(slot)}
              className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition border"
              style={activeSlot === slot
                ? { background: theme.gradient, borderColor: 'transparent', color: 'white' }
                : { borderColor: `${accentColor}25`, color: `${accentColor}60` }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* 보유 아이템 목록 */}
        {slotItems.length === 0 ? (
          <div className="text-center py-12 border border-white/8 rounded-2xl">
            <p className="text-white/25 text-sm">{t('av.noItems', { slot: SLOT_LABELS[activeSlot] })}</p>
            <Link
              href="/shop"
              className="inline-block mt-3 px-5 py-2 rounded-full text-white text-sm font-medium"
              style={{ background: theme.gradient }}
            >
              {t('av.buyInShop')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {slotItems.map(item => {
              const isEquipped = equippedIds[item.slot] === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleEquip(item)}
                  className="rounded-2xl p-4 border text-left transition hover:scale-[1.02]"
                  style={{
                    borderColor: isEquipped ? `${accentColor}70` : `${accentColor}20`,
                    background: isEquipped ? `${accentColor}15` : `${accentColor}05`,
                  }}
                >
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <p className="text-white text-sm font-semibold leading-tight">{item.name}</p>
                  {item.artist && (
                    <p className="text-xs mt-0.5" style={{ color: `${accentColor}70` }}>{item.artist}</p>
                  )}
                  <div className="mt-3">
                    {isEquipped ? (
                      <span className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{ background: theme.gradient, color: 'white' }}>
                        {t('av.equipped')}
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full border font-medium"
                        style={{ borderColor: `${accentColor}40`, color: `${accentColor}80` }}>
                        {t('av.equip')}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

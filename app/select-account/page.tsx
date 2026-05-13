'use client'

import { useState, useEffect } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { setActiveAccountId } from '@/lib/activeAccount'
import Avatar, { EquippedItems } from '@/app/components/Avatar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'

type Account = {
  id: string
  username: string
  created_at: string
  gender: string
  equipped: Record<string, string>
  groups: { name: string; name_en: string }
}

export default function SelectAccountPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [equippedMap, setEquippedMap] = useState<Record<string, EquippedItems>>({})
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('accounts')
        .select('*, groups(name, name_en)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      const validData = (data || []).filter((a: Account) => a.groups != null)

      if (validData.length === 0) {
        router.push('/select-group')
        return
      }

      // 계정이 1개면 바로 선택 후 피드로
      if (validData.length === 1) {
        setActiveAccountId(validData[0].id)
        router.push('/feed')
        return
      }

      // 모든 계정의 장착 아이템 ID를 한번에 배치 로드
      const allItemIds = [...new Set(
        validData.flatMap((acc: Account) => Object.values(acc.equipped || {}).filter(Boolean) as string[])
      )]

      const itemMap: Record<string, any> = {}
      if (allItemIds.length > 0) {
        const { data: shopItems } = await supabase
          .from('shop_items')
          .select('id, slot, visual, emoji')
          .in('id', allItemIds)
        for (const item of shopItems || []) itemMap[item.id] = item
      }

      const built: Record<string, EquippedItems> = {}
      for (const acc of validData) {
        const result: EquippedItems = {}
        for (const [slot, itemId] of Object.entries(acc.equipped || {})) {
          const item = itemMap[itemId as string]
          if (!item) continue
          const v = item.visual || {}
          if (slot === 'outfit') result.outfit = { outfitColor: v.outfitColor, type: v.type }
          if (slot === 'hat') result.hat = { hatColor: v.hatColor, style: v.style, hatEmoji: item.emoji }
          if (slot === 'accessory') result.accessory = { type: v.type, color: v.color, emoji: item.emoji }
          if (slot === 'glowstick') result.glowstick = { glowColor: v.glowColor, shape: v.shape }
          if (slot === 'skin') result.skin = { auraColor: v.auraColor, gradient: v.gradient }
        }
        built[acc.id] = result
      }

      setAccounts(validData)
      setEquippedMap(built)
      setLoading(false)
    }
    load()
  }, [])

  function handleSelect(account: Account) {
    setActiveAccountId(account.id)
    router.push('/feed')
  }

  async function deleteAccount(account: Account) {
    setDeleting(true)
    await supabase.from('videos').delete().eq('account_id', account.id)
    await supabase.from('accounts').delete().eq('id', account.id)
    const remaining = accounts.filter(a => a.id !== account.id)
    setAccounts(remaining)
    setDeleteTarget(null)
    setDeleting(false)
    if (remaining.length === 0) {
      router.push('/select-group')
    } else if (remaining.length === 1) {
      setActiveAccountId(remaining[0].id)
      router.push('/feed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 text-xl font-medium animate-pulse">Loading Universe...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-10">
          <Link href="/"><KverseLogo size="xl" /></Link>
          <h1 className="text-2xl font-black text-white mt-4">{t('sa.title')}</h1>
          <p className="text-white/30 text-sm mt-2">{t('sa.desc')}</p>
        </div>

        {/* 계정 목록 */}
        <div className="flex flex-col gap-3">
          {accounts.map((account) => {
            const theme = getTheme(account.groups.name)
            const accentColor = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary
            return (
              <div key={account.id} className="relative">
                <button
                  onClick={() => handleSelect(account)}
                  className="w-full rounded-2xl p-5 flex items-center gap-4 border transition hover:scale-[1.02] text-left"
                  style={{ borderColor: `${accentColor}40`, background: `${accentColor}08` }}
                >
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden flex items-start justify-center"
                    style={{ background: `${accentColor}18` }}
                  >
                    <Avatar
                      gender={(account.gender as 'male' | 'female') || 'female'}
                      equipped={equippedMap[account.id] || {}}
                      groupColor={accentColor}
                      size={56}
                      username={account.username}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-base">@{account.username}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: accentColor }}>
                      {groupDisplayName(account.groups.name, locale)} · {worldName(theme, locale)}
                    </p>
                    <p className="text-white/20 text-xs mt-1">
                      {new Date(account.created_at).toLocaleDateString()} {t('common.joined')}
                    </p>
                  </div>
                  <div className="text-white/30 text-lg">→</div>
                </button>
                {/* 삭제 버튼 */}
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(account) }}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-white/20 hover:text-red-400 hover:bg-red-400/10 transition text-sm"
                >
                  🗑
                </button>
              </div>
            )
          })}
        </div>

        {/* 팬닉 추가 버튼 */}
        {accounts.length < 3 ? (
          <Link
            href="/select-group"
            className="mt-4 flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed font-medium text-sm transition hover:opacity-80"
            style={{ borderColor: 'rgba(236,72,153,0.35)', color: '#EC4899' }}
          >
            <span className="text-lg">+</span>
            {t('sa.addFanNick')}
            <span className="text-white/25 font-normal">({accounts.length}/3 무료)</span>
          </Link>
        ) : (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="mt-4 flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed font-medium text-sm transition hover:opacity-80"
            style={{ borderColor: 'rgba(250,204,21,0.35)', color: '#FBBF24' }}
          >
            <span className="text-lg">👑</span>
            {t('sa.addMore')}
            <span className="text-white/25 font-normal">(3/3 {t('sa.inUse')})</span>
          </button>
        )}

        {/* 로그아웃 */}
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          className="mt-6 w-full text-center text-white/20 hover:text-white/40 text-sm transition"
        >
          {t('sa.logout')}
        </button>
      </div>

      {/* 유료 업그레이드 모달 */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center px-4 pb-8"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 border border-yellow-500/30"
            style={{ background: 'linear-gradient(160deg, #1a1207 0%, #0d0d0d 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 왕관 + 타이틀 */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">👑</div>
              <h2 className="text-xl font-bold text-white">Kverse Plus</h2>
              <p className="text-white/40 text-sm mt-1">{t('sa.plusTitle')}</p>
            </div>

            {/* 혜택 목록 */}
            <div className="flex flex-col gap-2.5 mb-6">
              {[
                { icon: '🌌', text: t('sa.plusBenefit1') },
                { icon: '✨', text: t('sa.plusBenefit2') },
                { icon: '🏆', text: t('sa.plusBenefit3') },
                { icon: '💬', text: t('sa.plusBenefit4') },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-white/70 text-sm">{text}</span>
                </div>
              ))}
            </div>

            {/* 가격 */}
            <div
              className="rounded-2xl p-4 mb-5 text-center border border-yellow-500/20"
              style={{ background: 'rgba(251,191,36,0.07)' }}
            >
              <p className="text-yellow-400 font-bold text-2xl">{t('sa.plusPrice')} <span className="text-base font-normal text-white/40">{t('sa.plusPer')}</span></p>
              <p className="text-white/25 text-xs mt-1">{t('sa.plusNote')}</p>
            </div>

            {/* CTA */}
            <Link
              href="/upgrade"
              onClick={() => setShowUpgradeModal(false)}
              className="block w-full py-3.5 rounded-2xl font-bold text-black text-sm text-center transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
            >
              {t('sa.plusBtn')}
            </Link>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="mt-3 w-full text-center text-white/25 hover:text-white/50 text-sm transition"
            >
              {t('common.later')}
            </button>
          </div>
        </div>
      )}

      {/* 팬닉 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 flex items-end justify-center pb-8 px-4"
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-red-500/20 rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🗑</div>
              <h2 className="text-white font-bold text-lg mb-2">{t('sa.deleteAccountTitle')}</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                {t('sa.deleteAccountDesc').replace('{username}', deleteTarget.username)}
              </p>
            </div>
            <div className="border-t border-white/5 flex">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-4 text-white/50 hover:text-white text-sm font-medium border-r border-white/5 transition disabled:opacity-40"
              >
                {t('feed.cancelBtn')}
              </button>
              <button
                onClick={() => deleteAccount(deleteTarget)}
                disabled={deleting}
                className="flex-1 py-4 text-red-400 hover:text-red-300 text-sm font-bold transition disabled:opacity-40"
              >
                {deleting ? t('sa.deleting') : t('sa.deleteAccountBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

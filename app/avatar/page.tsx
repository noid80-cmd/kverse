'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { getTheme, groupDisplayName, worldName } from '@/lib/groupThemes'
import { getActiveAccountId } from '@/lib/activeAccount'
import Avatar, { EquippedItems } from '@/app/components/Avatar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'

type Account = {
  id: string
  username: string
  gender: string
  equipped: Record<string, string>
  rpm_avatar_url: string | null
  groups: { name: string } | null
}

export default function AvatarPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const [account, setAccount] = useState<Account | null>(null)
  const [equippedVisuals, setEquippedVisuals] = useState<EquippedItems>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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

      // 장착 아이템 시각화
      const ids = Object.values(acc.equipped || {}).filter(Boolean) as string[]
      if (ids.length > 0) {
        const { data: items } = await supabase.from('shop_items').select('id, slot, visual, emoji').in('id', ids)
        const result: EquippedItems = {}
        for (const item of items || []) {
          const v = item.visual || {}
          if (item.slot === 'outfit') result.outfit = { outfitColor: v.outfitColor, type: v.type }
          if (item.slot === 'hat') result.hat = { hatColor: v.hatColor, style: v.style, hatEmoji: item.emoji }
          if (item.slot === 'accessory') result.accessory = { type: v.type, color: v.color, emoji: item.emoji }
          if (item.slot === 'glowstick') result.glowstick = { glowColor: v.glowColor, shape: v.shape }
          if (item.slot === 'skin') result.skin = { auraColor: v.auraColor, gradient: v.gradient }
        }
        setEquippedVisuals(result)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handlePhotoUpload(file: File) {
    if (!account) return
    setUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
    const path = `${account.id}/profile_${Date.now()}.${safeExt}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      contentType: file.type || `image/${safeExt}`,
    })
    if (upErr) {
      showToast(`업로드 실패: ${upErr.message}`)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('accounts').update({ rpm_avatar_url: publicUrl }).eq('id', account.id)
    setAccount(prev => prev ? { ...prev, rpm_avatar_url: publicUrl } : prev)
    showToast('사진이 업데이트됐어요 ✓')
    setUploading(false)
  }

  async function handleRemovePhoto() {
    if (!account) return
    await supabase.from('accounts').update({ rpm_avatar_url: null }).eq('id', account.id)
    setAccount(prev => prev ? { ...prev, rpm_avatar_url: null } : prev)
    showToast('사진이 제거됐어요')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const theme = account?.groups ? getTheme(account.groups.name) : getTheme('')
  const accentColor = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-400 animate-pulse font-medium">Loading...</div>
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
        <Link href="/profile" className="text-white/40 hover:text-white transition text-sm">← {t('nav.profile')}</Link>
        <span className="font-black text-white">{t('nav.avatar')}</span>
        <div />
      </nav>

      <div className="max-w-sm mx-auto px-6 py-12 flex flex-col items-center gap-8">

        {/* 아바타 미리보기 */}
        <div
          className="rounded-3xl p-8 border flex flex-col items-center gap-4"
          style={{ background: `${accentColor}10`, borderColor: `${accentColor}30` }}
        >
          <Avatar
            gender={(account?.gender as 'male' | 'female') || 'female'}
            equipped={equippedVisuals}
            groupColor={accentColor}
            size={180}
            rpmAvatarUrl={account?.rpm_avatar_url}
            username={account?.username}
          />
          <div className="text-center">
            <p className="text-white font-semibold">@{account?.username}</p>
            {account?.groups && (
              <p className="text-sm mt-0.5" style={{ color: `${accentColor}90` }}>
                {groupDisplayName(account.groups.name, locale)} · {worldName(theme, locale)}
              </p>
            )}
          </div>
        </div>

        {/* 사진 업로드 */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-4 rounded-2xl font-medium text-white transition disabled:opacity-50"
            style={{ background: theme.gradient }}
          >
            {uploading ? '업로드 중...' : '📷 카메라로 촬영'}
          </button>

          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-4 rounded-2xl font-medium text-white border border-white/20 transition disabled:opacity-50"
          >
            🖼 갤러리에서 선택
          </button>

          {account?.rpm_avatar_url && (
            <button
              onClick={handleRemovePhoto}
              className="w-full py-3 rounded-2xl font-medium text-sm border border-white/10 text-white/40 hover:text-white/70 transition"
            >
              사진 제거 (기본 아바타로)
            </button>
          )}

          <p className="text-white/25 text-xs text-center leading-relaxed">
            사진을 업로드하면 프로필과 커버 영상 목록에<br />내 사진이 표시됩니다
          </p>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }}
        />
      </div>
    </div>
  )
}

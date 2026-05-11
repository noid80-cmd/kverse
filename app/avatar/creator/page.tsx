'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getActiveAccountId } from '@/lib/activeAccount'
import { useRouter } from 'next/navigation'

const RPM_SUBDOMAIN = process.env.NEXT_PUBLIC_RPM_SUBDOMAIN || 'demo'
const RPM_ORIGIN = `https://${RPM_SUBDOMAIN}.readyplayer.me`

export default function AvatarCreatorPage() {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [saving, setSaving] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    async function getAccount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const activeId = getActiveAccountId()
      let q = supabase.from('accounts').select('id').eq('user_id', user.id)
      if (activeId) q = q.eq('id', activeId)
      const { data } = await q.limit(1).single()
      if (data) setAccountId(data.id)
    }
    getAccount()
  }, [])

  const handleMessage = useCallback(async (event: MessageEvent) => {
    // RPM sends from their origin
    if (!event.origin.includes('readyplayer.me')) return

    let url: string | null = null

    // Newer format
    if (event.data?.type === 'v1.avatar.exported') {
      url = event.data?.data?.url
    }
    // Older frame API format
    if (typeof event.data === 'string') {
      try {
        const parsed = JSON.parse(event.data)
        if (parsed?.source === 'readyplayerme' && parsed?.eventName === 'v1.avatar.exported') {
          url = parsed?.data?.url
        }
      } catch { /* not JSON */ }
    }

    if (!url || !accountId) return

    setSaving(true)
    await supabase
      .from('accounts')
      .update({ rpm_avatar_url: url })
      .eq('id', accountId)

    setSaving(false)
    router.push('/avatar')
  }, [accountId, router])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  const iframeSrc = `${RPM_ORIGIN}/en/avatar?frameApi&clearCache&quickStart=false&bodyType=fullbody`

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur border-b border-white/10 z-10">
        <button
          onClick={() => router.push('/avatar')}
          className="text-white/50 hover:text-white text-sm transition"
        >
          ← 취소
        </button>
        <span className="font-black text-sm bg-gradient-to-r from-[#E91E8C] to-[#7B2FBE] bg-clip-text text-transparent">
          3D 아바타 만들기
        </span>
        <div className="w-12" />
      </div>

      {saving && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
          <div className="text-white font-bold animate-pulse">저장 중...</div>
        </div>
      )}

      <div className="text-center py-2 text-white/30 text-xs">
        아바타를 완성한 뒤 <strong className="text-white/50">저장</strong> 버튼을 눌러주세요
      </div>

      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="flex-1 w-full border-none"
        allow="camera *; microphone *; clipboard-write"
        title="Ready Player Me Avatar Creator"
      />
    </div>
  )
}

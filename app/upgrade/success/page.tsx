'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n'

export default function UpgradeSuccessPage() {
  const router = useRouter()
  const t = useT()
  useEffect(() => {
    const timer = setTimeout(() => router.push('/feed'), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-2xl font-black text-white mb-2">{t('up.successTitle')}</h1>
        <p className="text-white/40 text-sm mb-6">{t('up.successDesc')}</p>
        <Link href="/feed" className="text-yellow-400 text-sm underline">{t('up.goFeed')}</Link>
      </div>
    </div>
  )
}

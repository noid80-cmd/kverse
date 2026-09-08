'use client'

import { useEffect } from 'react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

export default function AuthConfirm() {
  const { lang } = useLang()
  const tx = useT(lang).auth
  useEffect(() => {
    window.location.href = '/login'
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(36,28,21,0.65)', fontSize: 15 }}>{tx.processing}</div>
    </div>
  )
}

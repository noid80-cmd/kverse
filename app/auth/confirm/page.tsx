'use client'

import { useEffect } from 'react'

export default function AuthConfirm() {
  useEffect(() => {
    window.location.href = '/login'
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(36,28,21,0.65)', fontSize: 15 }}>로그인 처리 중...</div>
    </div>
  )
}

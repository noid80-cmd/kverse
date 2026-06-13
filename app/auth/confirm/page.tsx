'use client'

import { useEffect } from 'react'

export default function AuthConfirm() {
  useEffect(() => {
    window.location.href = '/login'
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>로그인 처리 중...</div>
    </div>
  )
}

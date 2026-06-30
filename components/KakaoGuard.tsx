'use client'

import { useEffect, useState } from 'react'

export default function KakaoGuard() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!/KAKAOTALK/i.test(navigator.userAgent)) return

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isIOS) {
      window.location.href = 'x-safari-' + window.location.href
      // 500ms 후에도 안 넘어가면 안내 화면 표시
      setTimeout(() => setShow(true), 500)
    } else {
      setShow(true)
    }
  }, [])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#07070d',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>🌐</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#eeeeff', marginBottom: 12 }}>
        외부 브라우저에서 열어주세요
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 32 }}>
        카카오톡 내 브라우저에서는<br />
        일부 기능이 제한돼요.
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px 24px',
        border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 320,
      }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, fontWeight: 600 }}>
          여는 방법
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 2, textAlign: 'left' }}>
          <span style={{ color: '#06b6d4', fontWeight: 700 }}>1.</span> 화면 오른쪽 하단 <strong style={{ color: '#eeeeff' }}>···</strong> 버튼<br />
          <span style={{ color: '#06b6d4', fontWeight: 700 }}>2.</span> <strong style={{ color: '#eeeeff' }}>기본 브라우저로 열기</strong> 선택
        </div>
      </div>
    </div>
  )
}

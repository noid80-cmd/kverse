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
      background: '#FFF8E7',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>🌐</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#241C15', marginBottom: 12 }}>
        외부 브라우저에서 열어주세요
      </div>
      <div style={{ fontSize: 14, color: 'rgba(36,28,21,0.59)', lineHeight: 1.8, marginBottom: 32 }}>
        카카오톡 내 브라우저에서는<br />
        일부 기능이 제한돼요.
      </div>
      <div style={{
        background: 'rgba(36,28,21,0.07)', borderRadius: 16, padding: '20px 24px',
        border: '1px solid rgba(36,28,21,0.1)', width: '100%', maxWidth: 320,
      }}>
        <div style={{ fontSize: 13, color: 'rgba(36,28,21,0.65)', marginBottom: 16, fontWeight: 600 }}>
          여는 방법
        </div>
        <div style={{ fontSize: 14, color: 'rgba(36,28,21,0.91)', lineHeight: 2, textAlign: 'left' }}>
          <span style={{ color: '#FF6F3C', fontWeight: 700 }}>1.</span> 화면 오른쪽 하단 <strong style={{ color: '#241C15' }}>···</strong> 버튼<br />
          <span style={{ color: '#FF6F3C', fontWeight: 700 }}>2.</span> <strong style={{ color: '#241C15' }}>기본 브라우저로 열기</strong> 선택
        </div>
      </div>
    </div>
  )
}

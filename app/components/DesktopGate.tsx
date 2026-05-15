'use client'

import { useEffect, useState } from 'react'

const SITE_URL = 'https://kverse-nine.vercel.app'

export default function DesktopGate({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setIsDesktop(!mobile)
    setReady(true)
  }, [])

  if (!ready) return <>{children}</>

  if (isDesktop) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=000000&color=ffffff&data=${encodeURIComponent(SITE_URL)}`
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-8">
          <span style={{
            background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '4px',
          }}>KVERSE</span>
        </div>

        <div className="rounded-3xl p-1 mb-6" style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}>
          <div className="bg-black rounded-3xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR code" width={220} height={220} className="rounded-xl" />
          </div>
        </div>

        <h1 className="text-xl font-black text-white mb-2">스마트폰으로 스캔하세요</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-6">
          Kverse는 모바일 전용 서비스예요.<br />
          카메라로 QR코드를 찍어 접속해주세요.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
          <p className="text-white/30 text-xs mb-1">또는 주소 직접 입력</p>
          <p className="text-pink-400 font-mono text-sm">kverse-nine.vercel.app</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

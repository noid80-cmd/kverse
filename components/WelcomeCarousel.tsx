'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

// 네이티브 앱을 처음 여는 유저에게 가입 화면 전에 한 번만 보여주는
// 스와이프형 소개 슬라이드. LandingClient.tsx에서 최초 실행 시에만 렌더.
export default function WelcomeCarousel() {
  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang)
  // 오디션이 이 앱의 본론이다. 커버는 오디션이 없는 주에 쌓아두는 것이지
  // 첫 화면에서 앞세울 이야기가 아니다.
  const slides = [
    { icon: '📢', title: tx.welcome.slide1Title, desc: tx.welcome.slide1Desc },
    { icon: '🎬', title: tx.welcome.slide2Title, desc: tx.welcome.slide2Desc },
    { icon: '🔔', title: tx.welcome.slide3Title, desc: tx.welcome.slide3Desc },
  ]
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLast = index === slides.length - 1

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goTo(i: number) {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', flexDirection: 'column', paddingTop: 'var(--safe-top-0)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', flexShrink: 0 }}>
        <button onClick={() => router.push('/signup')}
          style={{ background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 8 }}>
          {tx.welcome.skip}
        </button>
      </div>

      <div ref={scrollRef} onScroll={handleScroll}
        style={{ flex: 1, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {slides.map((s, i) => (
          <div key={i} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 32 }}>{s.icon}</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#241C15', marginBottom: 16, whiteSpace: 'pre-line', lineHeight: 1.3, wordBreak: 'keep-all' }}>
              {s.title}
            </h1>
            <p style={{ fontSize: 15, color: '#8A7F6E', lineHeight: 1.7, whiteSpace: 'pre-line', wordBreak: 'keep-all' }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '0 32px 40px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <div key={i} style={{ width: i === index ? 20 : 6, height: 6, borderRadius: 3, background: i === index ? '#D84A1E' : 'rgba(36,28,21,0.2)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <button
          onClick={() => (isLast ? router.push('/signup') : goTo(index + 1))}
          style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,111,60,0.35)' }}>
          {isLast ? tx.welcome.start : tx.common.next}
        </button>
      </div>
    </div>
  )
}

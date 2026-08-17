'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const slides = [
  {
    icon: '🎤',
    title: 'K-pop 커버로 시작하는\n데뷔의 문',
    desc: '커버 영상을 올리면\n전세계 기획사가 직접 찾아와요',
  },
  {
    icon: '✨',
    title: '실력만 보여주세요',
    desc: '보정 없는 리얼한 영상이\n오히려 눈에 띄는 강점이 돼요',
  },
  {
    icon: '💬',
    title: '오디션부터 데뷔까지',
    desc: '관심 있는 기획사와 바로 채팅,\n온라인 오디션까지 한 번에',
  },
]

// 네이티브 앱을 처음 여는 유저에게 가입 화면 전에 한 번만 보여주는
// 스와이프형 소개 슬라이드. LandingClient.tsx에서 최초 실행 시에만 렌더.
export default function WelcomeCarousel() {
  const router = useRouter()
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
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', flexShrink: 0 }}>
        <button onClick={() => router.push('/signup')}
          style={{ background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 8 }}>
          건너뛰기
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
          {isLast ? '무료로 시작하기' : '다음'}
        </button>
      </div>
    </div>
  )
}

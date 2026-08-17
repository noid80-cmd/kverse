'use client'

import { useEffect, useRef, useState } from 'react'

type TickerItem = { dot: boolean; text: string }

export default function LiveTicker({ items, durationSeconds = 12 }: { items: TickerItem[]; durationSeconds?: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draggingRef = useRef(false)
  const lastXRef = useRef(0)
  const [dragging, setDragging] = useState(false)

  // 항목 개수가 적으면(예: 2개) 2배로 복제해도 화면 너비보다 짧아져서
  // 스크롤할 게 없어 애니메이션이 멈춰버림 — 짝수 배수로 충분히 반복해서
  // 항목 개수와 무관하게 항상 화면보다 길게 만든다(반복 카피 수가 짝수면
  // 절반 지점에서 자연스럽게 루프됨).
  const REPEAT = 6
  const doubled = Array.from({ length: REPEAT }, () => items).flat()

  useEffect(() => {
    let raf: number
    let lastTs: number | null = null
    function tick(ts: number) {
      const el = scrollRef.current
      if (el) {
        if (lastTs !== null && !pausedRef.current) {
          const dt = ts - lastTs
          const half = el.scrollWidth / 2
          if (half > 0) {
            const pxPerMs = half / (durationSeconds * 1000)
            let next = el.scrollLeft + pxPerMs * dt
            if (next >= half) next -= half
            else if (next < 0) next += half
            el.scrollLeft = next
          }
        }
        lastTs = ts
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durationSeconds])

  function pauseAndScheduleResume() {
    pausedRef.current = true
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => { pausedRef.current = false }, 1800)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pauseAndScheduleResume()
    if (e.pointerType === 'mouse') {
      draggingRef.current = true
      setDragging(true)
      lastXRef.current = e.clientX
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || e.pointerType !== 'mouse' || !scrollRef.current) return
    const dx = e.clientX - lastXRef.current
    lastXRef.current = e.clientX
    scrollRef.current.scrollLeft -= dx
  }
  function handlePointerUp() {
    draggingRef.current = false
    setDragging(false)
    pauseAndScheduleResume()
  }

  return (
    <div
      ref={scrollRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="kv-live-ticker"
      style={{
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        whiteSpace: 'nowrap', cursor: dragging ? 'grabbing' : 'grab',
      }}
    >
      {doubled.map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 32px', fontSize: 13, fontWeight: 700, color: '#DB2777', flexShrink: 0 }}>
          {item.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DB2777', boxShadow: '0 0 6px rgba(219,39,119,0.6)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />}
          {!item.dot && <span style={{ fontSize: 11, color: 'rgba(219,39,119,0.55)' }}>✦</span>}
          {item.text}
        </span>
      ))}
    </div>
  )
}

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

  const doubled = [...items, ...items]

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
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 32px', fontSize: 13, fontWeight: 700, color: '#fbbf24', flexShrink: 0 }}>
          {item.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />}
          {!item.dot && <span style={{ fontSize: 11, color: 'rgba(251,191,36,0.5)' }}>✦</span>}
          {item.text}
        </span>
      ))}
    </div>
  )
}

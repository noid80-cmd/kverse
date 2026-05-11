'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage, LOCALE_META } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const current = LOCALE_META.find(m => m.code === locale)!

  useEffect(() => { setMounted(true) }, [])

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, left: r.left })
    }
    setOpen(o => !o)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition text-sm"
        dir="ltr"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-white/30 text-xs">{open ? '▲' : '▾'}</span>
      </button>

      {open && mounted && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div
            dir="ltr"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              minWidth: 150,
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            {LOCALE_META.map(m => (
              <button
                key={m.code}
                onClick={() => { setLocale(m.code); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: locale === m.code ? 'white' : 'rgba(255,255,255,0.5)',
                  fontWeight: locale === m.code ? 700 : 400,
                  fontSize: 14,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span>{m.flag}</span>
                <span>{m.label}</span>
                {locale === m.code && (
                  <span style={{ marginLeft: 'auto', color: '#f472b6', fontSize: 12 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

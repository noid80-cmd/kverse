'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type NavItem = { href: string; label: string; icon: ReactNode; fab?: boolean }

export default function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const activeHref = items
    .filter(item => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {items.map(item => {
        const active = item.href === activeHref
        if (item.fab) {
          return (
            <Link key={item.href} href={item.href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '6px 0 8px', textDecoration: 'none', outline: 'none',
              }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(6,182,212,0.45)',
              }}>
                {item.icon}
              </div>
            </Link>
          )
        }
        return (
          <Link key={item.href} href={item.href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '10px 0 8px', gap: 4, textDecoration: 'none',
              outline: 'none',
              color: active ? '#22d3ee' : '#9494b0',
              transition: 'color 0.15s',
            }}>
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.3 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

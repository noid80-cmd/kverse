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
      background: 'rgba(255,248,231,0.97)', backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(36,28,21,0.08)',
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
                background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(216,74,30,0.4)',
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
              color: active ? '#D84A1E' : '#A69A87',
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

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type NavItem = { href: string; label: string; icon: ReactNode }

export default function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {items.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
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

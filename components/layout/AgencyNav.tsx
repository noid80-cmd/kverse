'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const agencyNav = [
  { href: '/agency/discover', label: '탐색', icon: '🔍' },
  { href: '/agency/talents', label: '관심', icon: '⭐' },
  { href: '/agency/contacts', label: '연락', icon: '💌' },
]

export default function AgencyNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
      borderTop: '1px solid #e8e8f2',
      display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {agencyNav.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '10px 0', gap: 3, textDecoration: 'none',
            outline: 'none', color: active ? '#6366f1' : '#b0b0cc', transition: 'color 0.15s',
          }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
          </Link>
        )
      })}
      <button onClick={handleLogout} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '10px 0', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer', color: '#b0b0cc',
      }}>
        <span style={{ fontSize: 22 }}>🚪</span>
        <span style={{ fontSize: 10, fontWeight: 500 }}>로그아웃</span>
      </button>
    </nav>
  )
}

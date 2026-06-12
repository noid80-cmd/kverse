'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Compass, Bookmark, MessageCircle, LogOut, Megaphone, Settings } from 'lucide-react'

const agencyNav = [
  { href: '/agency/discover', label: '탐색', icon: <Compass size={22} strokeWidth={1.8} /> },
  { href: '/agency/auditions', label: '오디션', icon: <Megaphone size={22} strokeWidth={1.8} /> },
  { href: '/agency/talents', label: '관심', icon: <Bookmark size={22} strokeWidth={1.8} /> },
  { href: '/agency/contacts', label: '연락', icon: <MessageCircle size={22} strokeWidth={1.8} /> },
  { href: '/agency/settings', label: '설정', icon: <Settings size={22} strokeWidth={1.8} /> },
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
      background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {agencyNav.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '10px 0 8px', gap: 4, textDecoration: 'none',
            outline: 'none', color: active ? '#22d3ee' : '#3a3a5c', transition: 'color 0.15s',
          }}>
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.3 }}>{item.label}</span>
          </Link>
        )
      })}
      <button onClick={handleLogout} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '10px 0 8px', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a5c',
      }}>
        <LogOut size={22} strokeWidth={1.8} />
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0.3 }}>로그아웃</span>
      </button>
    </nav>
  )
}

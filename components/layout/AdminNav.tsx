'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

const adminNav = [
  { href: '/admin', label: '대시보드', emoji: '📊' },
  { href: '/admin/users', label: '회원', emoji: '👥' },
  { href: '/admin/agencies', label: '기획사', emoji: '🏢' },
  { href: '/admin/videos', label: '영상', emoji: '🎬' },
  { href: '/admin/auditions', label: '오디션', emoji: '🎤' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ background: 'rgba(9,9,15,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(16px)' }}>
      <div className="max-w-2xl mx-auto px-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <span style={{ fontWeight: 900, fontSize: 16, color: '#eeeeff', flexShrink: 0 }}>관리자</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {adminNav.map(n => {
            const active = pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
            return (
              <Link key={n.href} href={n.href}
                style={{
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  padding: '6px 10px', borderRadius: 10,
                  color: active ? '#818cf8' : '#555570',
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                <span style={{ fontSize: 16 }}>{n.emoji}</span>
                <span>{n.label}</span>
              </Link>
            )
          })}
          <button onClick={handleLogout}
            style={{ marginLeft: 4, padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a5c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <LogOut size={16} strokeWidth={1.8} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  )
}

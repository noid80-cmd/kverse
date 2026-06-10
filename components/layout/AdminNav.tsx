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
    <div style={{ background: '#fff', borderBottom: '1px solid #e8e8f2', position: 'sticky', top: 0, zIndex: 30 }}>
      <div className="max-w-2xl mx-auto px-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <span style={{ fontWeight: 900, fontSize: 16, color: '#1e1b4b', flexShrink: 0 }}>관리자</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {adminNav.map(n => {
            const active = pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
            return (
              <Link key={n.href} href={n.href}
                style={{
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  padding: '6px 10px', borderRadius: 10,
                  color: active ? '#6366f1' : '#8b8baa',
                  background: active ? '#ede9fe' : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                <span style={{ fontSize: 16 }}>{n.emoji}</span>
                <span>{n.label}</span>
              </Link>
            )
          })}
          <button onClick={handleLogout}
            style={{ marginLeft: 4, padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <LogOut size={16} strokeWidth={1.8} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  )
}

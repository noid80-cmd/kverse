'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, LayoutDashboard, Users, Building2, Film, Mic2, Flag, Trophy } from 'lucide-react'

const adminNav = [
  { href: '/admin', label: '대시보드', Icon: LayoutDashboard },
  { href: '/admin/users', label: '회원', Icon: Users },
  { href: '/admin/agencies', label: '기획사', Icon: Building2 },
  { href: '/admin/videos', label: '영상', Icon: Film },
  { href: '/admin/auditions', label: '오디션', Icon: Mic2 },
  { href: '/admin/outcomes', label: '합격 추적', Icon: Trophy },
  { href: '/admin/reports', label: '신고', Icon: Flag },
]

const previewNav = [
  { href: '/dashboard', label: '지망생', Icon: Mic2 },
  { href: '/agency/discover', label: '기획사', Icon: Building2 },
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
    <div style={{ background: 'rgba(255,248,231,0.97)', borderBottom: '1px solid rgba(36,28,21,0.09)', position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', minHeight: 56, paddingTop: 'var(--safe-top-0)' }}>
      <div style={{ flex: 1, overflowX: 'auto', display: 'flex', alignItems: 'center', gap: 2, height: '100%', padding: '0 0 0 16px' }}>
        <span style={{ fontWeight: 900, fontSize: 16, color: '#241C15', flexShrink: 0, marginRight: 6 }}>관리자</span>
        {previewNav.map(n => (
          <a key={n.href} href={n.href}
            style={{
              fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
              padding: '4px 9px', borderRadius: 8,
              color: '#8A7F6E',
              background: 'rgba(36,28,21,0.07)',
              border: '1px solid rgba(36,28,21,0.1)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <n.Icon size={15} strokeWidth={2} />
            <span>{n.label}</span>
          </a>
        ))}
        <div style={{ width: 1, height: 24, background: 'rgba(36,28,21,0.1)', margin: '0 4px', flexShrink: 0 }} />
        {adminNav.map(n => {
          const active = pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
          return (
            <Link key={n.href} href={n.href}
              style={{
                fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
                padding: '6px 10px', borderRadius: 10,
                color: active ? '#D84A1E' : '#8A7F6E',
                background: active ? 'rgba(255,111,60,0.12)' : 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
              <n.Icon size={17} strokeWidth={2} />
              <span>{n.label}</span>
            </Link>
          )
        })}
      </div>
      <div style={{ flexShrink: 0, borderLeft: '1px solid rgba(36,28,21,0.09)', height: '100%', display: 'flex', alignItems: 'center' }}>
        <button onClick={handleLogout}
          style={{ padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#8A7F6E', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <LogOut size={16} strokeWidth={1.8} />
          <span style={{ fontSize: 11, fontWeight: 700 }}>로그아웃</span>
        </button>
      </div>
    </div>
  )
}

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

const previewNav = [
  { href: '/dashboard', label: '지망생', emoji: '🎤' },
  { href: '/agency/discover', label: '기획사', emoji: '🏢' },
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
    <div style={{ background: 'rgba(9,9,15,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', height: 56 }}>
      <div style={{ flex: 1, overflowX: 'auto', display: 'flex', alignItems: 'center', gap: 2, height: '100%', padding: '0 0 0 16px' }}>
        <span style={{ fontWeight: 900, fontSize: 16, color: '#eeeeff', flexShrink: 0, marginRight: 6 }}>관리자</span>
        {previewNav.map(n => (
          <a key={n.href} href={n.href}
            style={{
              fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
              padding: '4px 9px', borderRadius: 8,
              color: '#8888aa',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <span>{n.emoji}</span>
            <span>{n.label}</span>
          </a>
        ))}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px', flexShrink: 0 }} />
        {adminNav.map(n => {
          const active = pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
          return (
            <Link key={n.href} href={n.href}
              style={{
                fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
                padding: '6px 10px', borderRadius: 10,
                color: active ? '#22d3ee' : '#555570',
                background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
              <span style={{ fontSize: 16 }}>{n.emoji}</span>
              <span>{n.label}</span>
            </Link>
          )
        })}
      </div>
      <div style={{ flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', height: '100%', display: 'flex', alignItems: 'center' }}>
        <button onClick={handleLogout}
          style={{ padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#555570', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <LogOut size={16} strokeWidth={1.8} />
          <span style={{ fontSize: 11, fontWeight: 700 }}>로그아웃</span>
        </button>
      </div>
    </div>
  )
}

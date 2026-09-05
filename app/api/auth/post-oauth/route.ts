import { notifyTelegram } from '@/lib/telegram'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_EMAIL = 'noid80@hanmail.net'

// 클라이언트가 OAuth 세션을 (브라우저 SDK로 직접) 이미 수립한 뒤 호출한다.
// 여기서는 쿠키에 실린 세션을 읽어서 role 결정/upsert, 신규가입 텔레그램
// 알림처럼 서버에서만 해야 하는(봇 토큰 노출 방지) 후처리만 담당한다.
export async function POST(req: NextRequest) {
  try {
    const { role: roleParam } = await req.json().catch(() => ({ role: null }))

    const cookiesToApply: Array<{ name: string; value: string; options?: any }> = []
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(list) { cookiesToApply.push(...list) },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'no session' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (user.email === ADMIN_EMAIL && (!profile || profile.role !== 'admin')) {
      await supabase.from('profiles').upsert({ id: user.id, role: 'admin' })
    }
    if (roleParam && (!profile || profile.role === 'talent')) {
      await supabase.from('profiles').update({ role: roleParam }).eq('id', user.id)
    }

    const role = user.email === ADMIN_EMAIL ? 'admin'
      : (roleParam && (!profile || profile.role === 'talent')) ? roleParam
      : (profile?.role ?? 'talent')
    const isNewUser = Date.now() - new Date(user.created_at).getTime() < 60_000

    if (isNewUser) {
      const userName = user.user_metadata?.full_name ?? user.email ?? ''
      const userEmail = user.email ?? ''
      const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
      const time = kst.toISOString().replace('T', ' ').slice(0, 16)
      const roleLabel = role === 'agency' ? '기획사' : '탤런트'
      const text = ['🔔 새 회원가입 - Krookie', `이름: ${userName}`, `이메일: ${userEmail}`, `역할: ${roleLabel}`, `시간: ${time} KST`].filter(Boolean).join('\n')
      await notifyTelegram(text)
    }

    const finalDest = role === 'admin' ? '/admin'
      : isNewUser && role === 'agency' ? '/onboarding?next=/agency/discover'
      : role === 'agency' ? '/agency/discover'
      : isNewUser ? '/onboarding'
      : '/dashboard'

    const response = NextResponse.json({ href: finalDest })
    cookiesToApply.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  } catch (e) {
    console.error('[post-oauth] error', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

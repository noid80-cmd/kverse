import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_EMAIL = 'noid80@hanmail.net'

// /auth/callback(서버 리다이렉트)이 코드 검증기 쿠키를 못 찾아 실패했을 때의
// 최종 우회 경로. 클라이언트가 sessionStorage에 백업해둔 code_verifier를
// 직접 넘겨받아, 쿠키 저장소를 거치지 않고 Supabase 토큰 엔드포인트를 바로
// 호출해서 세션을 교환한다.
export async function POST(req: NextRequest) {
  try {
    const { code, verifier, role: roleParam } = await req.json()
    if (!code || !verifier) {
      return NextResponse.json({ error: 'missing code/verifier' }, { status: 400 })
    }

    const tokenRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      }
    )
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[exchange-code] token endpoint failed', tokenData)
      return NextResponse.json({ error: 'exchange failed' }, { status: 401 })
    }

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

    const { data, error } = await supabase.auth.setSession({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    })
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'setSession failed' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

    if (data.user.email === ADMIN_EMAIL && (!profile || profile.role !== 'admin')) {
      await supabase.from('profiles').upsert({ id: data.user.id, role: 'admin' })
    }
    if (roleParam && (!profile || profile.role === 'talent')) {
      await supabase.from('profiles').update({ role: roleParam }).eq('id', data.user.id)
    }

    const role = data.user.email === ADMIN_EMAIL ? 'admin'
      : (roleParam && (!profile || profile.role === 'talent')) ? roleParam
      : (profile?.role ?? 'talent')
    const isNewUser = Date.now() - new Date(data.user.created_at).getTime() < 60_000

    const finalDest = role === 'admin' ? '/admin'
      : isNewUser && role === 'agency' ? '/onboarding?next=/agency/discover'
      : role === 'agency' ? '/agency/discover'
      : isNewUser ? '/onboarding'
      : '/dashboard'

    const response = NextResponse.json({ href: finalDest })
    cookiesToApply.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  } catch (e) {
    console.error('[exchange-code] error', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

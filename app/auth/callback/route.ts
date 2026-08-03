import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const roleParam = searchParams.get('role') as 'talent' | 'agency' | null

  if (!code) {
    const oauthError = searchParams.get('error')
    const oauthErrorDesc = searchParams.get('error_description')
    console.error('[auth/callback] no code param.', 'error=', oauthError, 'error_description=', oauthErrorDesc, 'full url=', request.url)
    return NextResponse.redirect(`${origin}/login`)
  }

  const dest = new URL(`${origin}/dashboard`)
  const response = NextResponse.redirect(dest)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const hasVerifierCookie = request.cookies.getAll().some(c => c.name.includes('-code-verifier'))
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession failed.', 'error=', error?.message, 'status=', error?.status, 'hadVerifierCookie=', hasVerifierCookie, 'cookieNames=', request.cookies.getAll().map(c => c.name).join(','))
    // code_verifier 쿠키가 구글 왕복 사이에 유실되는 게 실측 확인됨(네이티브
    // 앱 WKWebView). 바로 로그인 화면으로 보내지 말고, 클라이언트가
    // sessionStorage에 백업해둔 검증기로 수동 교환을 시도할 수 있는 복구
    // 페이지로 보낸다.
    const recover = new URL(`${origin}/auth/recover`)
    recover.searchParams.set('code', code)
    if (roleParam) recover.searchParams.set('role', roleParam)
    return NextResponse.redirect(recover)
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

  const ADMIN_EMAIL = 'noid80@hanmail.net'
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

  if (isNewUser) {
    const userName = data.user.user_metadata?.full_name ?? data.user.email ?? ''
    const userEmail = data.user.email ?? ''
    const BOT_TOKEN = '8844510756:AAEmttbeJQTNvy-HOWd77F4lvN0Cy4pi2xA'
    const CHAT_ID = '8940756620'
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const time = kst.toISOString().replace('T', ' ').slice(0, 16)
    const roleLabel = role === 'agency' ? '기획사' : '탤런트'
    const text = ['🔔 새 회원가입 - Kpick', `이름: ${userName}`, `이메일: ${userEmail}`, `역할: ${roleLabel}`, `시간: ${time} KST`].filter(Boolean).join('\n')
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    }).catch(() => {})
  }

  const finalDest = role === 'admin' ? '/admin'
    : isNewUser && role === 'agency' ? '/onboarding?next=/agency/discover'
    : role === 'agency' ? '/agency/discover'
    : isNewUser ? '/onboarding'
    : '/dashboard'

  response.headers.set('Location', `${origin}${finalDest}`)
  return response
}

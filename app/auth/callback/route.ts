import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const roleParam = searchParams.get('role') as 'talent' | 'agency' | null

  if (!code) {
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`)
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
    fetch(`${origin}/api/notify-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName, email: userEmail, role }),
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

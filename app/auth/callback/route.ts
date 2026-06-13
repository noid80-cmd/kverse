import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const roleParam = searchParams.get('role') as 'talent' | 'agency' | null

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Collect cookies written by Supabase during the code exchange
  const newCookies: Array<Parameters<ReturnType<typeof NextResponse.redirect>['cookies']['set']>> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            newCookies.push([name, value, options])
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[callback] exchangeCodeForSession error:', error?.message)
    return NextResponse.redirect(`${origin}/login`)
  }

  console.log('[callback] session set, cookies to apply:', newCookies.length)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

  if (roleParam && (!profile || profile.role === 'talent')) {
    await supabase.from('profiles').update({ role: roleParam }).eq('id', data.user.id)
  }

  const role = roleParam ?? profile?.role ?? 'talent'
  const dest = role === 'admin' ? '/admin' : role === 'agency' ? '/agency/discover' : '/dashboard'

  const response = NextResponse.redirect(`${origin}${dest}`)
  newCookies.forEach(args => response.cookies.set(...args))
  return response
}

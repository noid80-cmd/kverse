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

  if (roleParam && (!profile || profile.role === 'talent')) {
    await supabase.from('profiles').update({ role: roleParam }).eq('id', data.user.id)
  }

  const role = (roleParam && (!profile || profile.role === 'talent')) ? roleParam : (profile?.role ?? 'talent')
  const isNewUser = !profile
  const finalDest = role === 'admin' ? '/admin' : role === 'agency' ? '/agency/discover' : isNewUser ? '/onboarding' : '/dashboard'

  response.headers.set('Location', `${origin}${finalDest}`)
  return response
}

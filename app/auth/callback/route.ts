import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const roleParam = searchParams.get('role') as 'talent' | 'agency' | null

  if (code) {
    const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return (request.headers.get('cookie') ?? '').split(';').filter(Boolean).map(c => {
              const idx = c.indexOf('=')
              return { name: c.slice(0, idx).trim(), value: c.slice(idx + 1).trim() }
            })
          },
          setAll(cookies) {
            cookies.forEach(c => cookiesToSet.push(c))
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

      if (roleParam && (!profile || profile.role === 'talent')) {
        await supabase.from('profiles').update({ role: roleParam }).eq('id', data.user.id)
      }

      const role = roleParam ?? profile?.role ?? 'talent'
      const dest = role === 'admin' ? '/admin' : role === 'agency' ? '/agency/discover' : '/dashboard'

      const response = NextResponse.redirect(`${origin}${dest}`)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
      })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}

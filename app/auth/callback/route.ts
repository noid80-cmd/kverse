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
    const allCookies = request.cookies.getAll()
    const hasVerifier = allCookies.some(c => c.name.includes('code-verifier'))
    const names = allCookies.map(c => c.name).join('<br>')
    return new Response(`<!DOCTYPE html><html><body style="background:#07070d;color:#eee;font-family:monospace;padding:30px;font-size:14px">
<h2 style="color:#f87171">Exchange 실패</h2>
<p><b>Error:</b> ${error?.message ?? 'no user'}</p>
<p><b>code-verifier 있음:</b> ${hasVerifier ? '✅ YES' : '❌ NO'}</p>
<p><b>쿠키 수:</b> ${allCookies.length}</p>
<p><b>쿠키 이름:</b><br>${names || '(없음)'}</p>
</body></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  if (roleParam) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile || profile.role === 'talent') {
      await supabase.from('profiles').update({ role: roleParam }).eq('id', data.user.id)
    }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  const role = roleParam ?? profile?.role ?? 'talent'
  const finalDest = role === 'admin' ? '/admin' : role === 'agency' ? '/agency/discover' : '/dashboard'

  response.headers.set('Location', `${origin}${finalDest}`)
  return response
}

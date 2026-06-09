import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const roleParam = searchParams.get('role') as 'talent' | 'agency' | null

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

      // 신규 소셜 가입이고 role 파라미터가 있으면 role 업데이트
      if (roleParam && (!profile || profile.role === 'talent')) {
        await supabase.from('profiles').update({ role: roleParam }).eq('id', data.user.id)
      }

      const role = roleParam ?? profile?.role ?? 'talent'
      const redirect = role === 'admin' ? '/admin' : role === 'agency' ? '/agency/discover' : '/dashboard'
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}

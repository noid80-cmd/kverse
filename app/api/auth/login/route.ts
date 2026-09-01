import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      // 원인을 화면에서 구분할 수 있게 코드를 같이 내려준다 — 인증 안 된 계정과
      // 비번 오류가 똑같은 문구로 보이면 사용자도 우리도 원인을 못 짚는다.
      const code = /confirm/i.test(error?.message ?? '') ? 'email_not_confirmed' : 'invalid_credentials'
      return NextResponse.json({ error: error?.message ?? 'Login failed', code }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles').select('role, is_active').eq('id', data.user.id).single()

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: '정지된 계정입니다.' }, { status: 403 })
    }

    const role = profile?.role ?? 'talent'
    const href = role === 'admin' ? '/admin/users' : role === 'agency' ? '/agency/discover' : '/dashboard'

    return NextResponse.json({
      href,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

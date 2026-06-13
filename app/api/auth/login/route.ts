import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Login failed' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
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

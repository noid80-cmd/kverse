import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: '토큰이 없어요' }, { status: 400 })

  const { data } = await admin
    .from('agency_invites')
    .select('used_at, expires_at, agencies(id, name)')
    .eq('token', token)
    .single()

  if (!data) return NextResponse.json({ error: '유효하지 않은 초대예요' }, { status: 404 })
  if (data.used_at) return NextResponse.json({ error: '이미 사용된 초대예요', alreadyUsed: true }, { status: 400 })
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: '만료된 초대예요 (7일 경과)' }, { status: 400 })

  return NextResponse.json({ agency: (data as any).agencies })
}

export async function POST(req: NextRequest) {
  const { token, email, password } = await req.json()
  if (!token || !email || !password) return NextResponse.json({ error: '필수 항목이 빠졌어요' }, { status: 400 })

  const { data: invite } = await admin
    .from('agency_invites')
    .select('id, agency_id, used_at, expires_at')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ error: '유효하지 않은 초대예요' }, { status: 404 })
  if (invite.used_at) return NextResponse.json({ error: '이미 사용된 초대예요' }, { status: 400 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: '만료된 초대예요' }, { status: 400 })

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.includes('already registered') ? '이미 가입된 이메일이에요' : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = authData.user.id

  const { error: upsertError } = await admin.from('profiles').upsert({ id: userId, role: 'agency' })
  if (upsertError) {
    await admin.from('profiles').update({ role: 'agency' }).eq('id', userId)
  }
  await admin.from('agency_members').insert({ profile_id: userId, agency_id: invite.agency_id })
  await admin.from('agencies').update({ is_verified: true }).eq('id', invite.agency_id)
  await admin.from('agency_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id)

  return NextResponse.json({ ok: true })
}

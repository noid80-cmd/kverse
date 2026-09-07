import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 서비스 롤로 읽고 쓴다. agency_invites는 RLS로 잠겨 있고(어드민 전용),
// 초대 토큰 자체가 자격증명 역할을 한다.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const admin = adminClient()
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: '토큰이 없어요' }, { status: 400 })

  const { data } = await admin
    .from('agency_invites')
    .select('used_at, expires_at, email, agencies(id, name)')
    .eq('token', token)
    .single()

  if (!data) return NextResponse.json({ error: '유효하지 않은 초대예요' }, { status: 404 })
  if (data.used_at) return NextResponse.json({ error: '이미 사용된 초대예요', alreadyUsed: true }, { status: 400 })
  // 유효기간은 발급할 때 정한다. 여기서 "7일"처럼 못박아두면 기간을 바꿨을 때
  // 화면만 옛날 이야기를 하게 된다.
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: '만료된 초대예요' }, { status: 400 })

  // email이 있으면 화면은 버튼 하나만 보여준다(원클릭). 없으면 기존 입력 폼.
  return NextResponse.json({
    agency: (data as any).agencies,
    expiresAt: data.expires_at,
    email: data.email ?? null,
  })
}

export async function POST(req: NextRequest) {
  const admin = adminClient()
  const body = await req.json().catch(() => ({}))
  const token: string | undefined = body.token
  if (!token) return NextResponse.json({ error: '필수 항목이 빠졌어요' }, { status: 400 })

  const { data: invite } = await admin
    .from('agency_invites')
    .select('id, agency_id, used_at, expires_at, email, agencies(name)')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ error: '유효하지 않은 초대예요' }, { status: 404 })
  if (invite.used_at) return NextResponse.json({ error: '이미 사용된 초대예요' }, { status: 400 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: '만료된 초대예요' }, { status: 400 })

  // 원클릭 초대: 이메일은 초대에 박혀 있고 비밀번호는 서버가 만든다.
  // 만들어진 비밀번호는 이 응답으로 딱 한 번 나가서 그 자리에서 로그인하는 데만
  // 쓰이고 어디에도 남지 않는다. 초대 토큰을 쥔 사람에게만 가므로 노출 범위는
  // 토큰과 같다. 비밀번호가 필요해지면 /forgot-password로 본인이 정한다.
  const oneClick = !!invite.email
  const email: string | undefined = oneClick ? invite.email! : body.email
  const password: string = oneClick ? generatePassword() : body.password

  if (!email || !password) return NextResponse.json({ error: '필수 항목이 빠졌어요' }, { status: 400 })

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    const already = authError.message.includes('already registered')
    return NextResponse.json({
      error: already ? '이미 가입된 이메일이에요' : authError.message,
      // 이미 계정이 있으면 우리가 비밀번호를 모르니 대신 로그인시킬 수 없다.
      // 화면이 로그인으로 안내하도록 표시해준다.
      alreadyRegistered: already,
    }, { status: 400 })
  }

  const userId = authData.user.id
  const agencyName = (invite as any).agencies?.name as string | undefined

  // 이름은 기획사명으로 둔다. 트리거 기본값은 이메일 앞부분이라
  // 채팅에서 지망생에게 "contact"같은 게 보인다.
  const { error: upsertError } = await admin
    .from('profiles')
    .upsert({ id: userId, role: 'agency', ...(agencyName ? { name: agencyName } : {}) })
  if (upsertError) {
    await admin.from('profiles').update({ role: 'agency' }).eq('id', userId)
  }
  await admin.from('agency_members').insert({ profile_id: userId, agency_id: invite.agency_id })
  await admin.from('agencies').update({ is_verified: true }).eq('id', invite.agency_id)
  await admin.from('agency_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id)

  return NextResponse.json({ ok: true, email, ...(oneClick ? { password } : {}) })
}

function generatePassword(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

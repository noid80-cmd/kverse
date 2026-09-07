import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 기획사 계정을 우리가 미리 만들어둔다.
//
// 초대 링크 방식은 "링크를 눌러야 계정이 생긴다"가 전제라, 담당자가 앱부터
// 깔고 로그인하면 "가입되지 않은 이메일"이 뜬다. 캐스팅 담당자는 돌아다니며
// 폰으로 일하는 사람들이라 앱을 먼저 깔 가능성이 높다.
//
// 명함에 이메일이 있으니 계정은 우리가 만들어두고, 담당자에게는 "스토어에서
// Krookie 받아서 이 이메일로 로그인하세요" 한 줄만 남긴다. 비밀번호는 만들지
// 않는다 — 메일로 오는 코드로 들어오고, 그게 곧 본인 확인이다.

export const dynamic = 'force-dynamic'

async function verifyAdmin() {
  const store = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  return me?.role === 'admin'
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agencyId, email } = await req.json().catch(() => ({}))
  if (!agencyId || !email) return NextResponse.json({ error: '필수 항목이 빠졌어요' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: agency } = await admin.from('agencies').select('name').eq('id', agencyId).single()
  if (!agency) return NextResponse.json({ error: '기획사를 찾을 수 없어요' }, { status: 404 })

  // 비밀번호는 임의로 만들어 넣고 아무에게도 알려주지 않는다. 로그인은 메일로
  // 오는 코드로 하고, 담당자가 원하면 들어와서 직접 정한다.
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const password = Buffer.from(bytes).toString('base64url')

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })

  let userId: string | undefined = created?.user?.id
  if (authError) {
    if (!authError.message.includes('already registered')) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }
    // 이미 있는 계정이면 그 계정을 이 기획사에 붙인다. 담당자가 다른 기획사에서
    // 옮겨왔거나, 우리가 두 번 눌렀을 때다.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    userId = list?.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase())?.id
    if (!userId) return NextResponse.json({ error: '이미 가입된 이메일인데 계정을 찾지 못했어요' }, { status: 409 })
  }

  if (!userId) return NextResponse.json({ error: '계정을 만들지 못했어요' }, { status: 500 })

  const { error: upsertError } = await admin.from('profiles')
    .upsert({ id: userId, role: 'agency', name: agency.name as string })
  if (upsertError) await admin.from('profiles').update({ role: 'agency' }).eq('id', userId)

  // 같은 기획사에 두 번 넣지 않는다.
  const { data: member } = await admin.from('agency_members')
    .select('profile_id').eq('profile_id', userId).eq('agency_id', agencyId).maybeSingle()
  if (!member) await admin.from('agency_members').insert({ profile_id: userId, agency_id: agencyId })

  await admin.from('agencies').update({ is_verified: true }).eq('id', agencyId)

  return NextResponse.json({ ok: true, email, agencyName: agency.name, existed: !!authError })
}

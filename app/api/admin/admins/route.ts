import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 관리자를 화면에서 추가·해제한다.
//
// 예전엔 SQL로 profiles.role을 직접 바꿔야 했다. 학원 실장님들처럼 실제로
// 운영에 참여하는 사람이 늘면 그때마다 SQL을 돌릴 수는 없다.
//
// 관리자는 지망생 프로필과 연락처를 전부 본다. 대상이 미성년자가 많아서
// 아무나 올려서는 안 되고, 그래서 관리자만 관리자를 만들 수 있게 한다.

export const dynamic = 'force-dynamic'

async function me() {
  const store = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: p } = await sb.from('profiles').select('role').eq('id', user.id).single()
  return p?.role === 'admin' ? user : null
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const admin = await me()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = service()
  const [{ data: profiles }, { data: list }] = await Promise.all([
    sb.from('profiles').select('id, name').eq('role', 'admin'),
    sb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const emailOf = new Map((list?.users ?? []).map(u => [u.id, u.email ?? '']))

  return NextResponse.json({
    me: admin.id,
    admins: (profiles ?? []).map(p => ({
      id: p.id as string,
      name: p.name as string,
      email: emailOf.get(p.id as string) ?? '',
    })),
  })
}

export async function POST(req: NextRequest) {
  const admin = await me()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, name } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: '이메일이 필요해요' }, { status: 400 })

  const sb = service()
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let userId = list?.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase())?.id

  // 계정이 없으면 만든다. 비밀번호는 서버가 임의로 만들어 아무에게도 알려주지
  // 않는다 — 기획사와 같이 메일로 오는 코드로 들어온다.
  if (!userId) {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      password: Buffer.from(bytes).toString('base64url'),
      email_confirm: true,
    })
    if (error || !created?.user) {
      return NextResponse.json({ error: error?.message ?? '계정을 만들지 못했어요' }, { status: 400 })
    }
    userId = created.user.id
  }

  const { error: upErr } = await sb.from('profiles')
    .upsert({ id: userId, role: 'admin', ...(name ? { name } : {}) })
  if (upErr) {
    const { error: e2 } = await sb.from('profiles').update({ role: 'admin' }).eq('id', userId)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email })
}

export async function DELETE(req: NextRequest) {
  const admin = await me()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id가 필요해요' }, { status: 400 })

  // 자기 자신은 못 내린다. 실수로 내리면 그 자리에서 어드민을 잃는다.
  if (id === admin.id) {
    return NextResponse.json({ error: '본인 권한은 해제할 수 없어요' }, { status: 400 })
  }

  const sb = service()
  const { count } = await sb.from('profiles')
    .select('id', { count: 'exact', head: true }).eq('role', 'admin')
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: '마지막 관리자는 해제할 수 없어요' }, { status: 400 })
  }

  // 계정을 지우지 않는다. 권한만 내린다 — 지우는 건 되돌릴 수 없다.
  const { error } = await sb.from('profiles').update({ role: 'talent' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

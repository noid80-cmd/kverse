import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 어드민 공지 발송.
//
// 지금까지 전체 푸시가 나가는 경로는 공고 게시 때 자동 발송 하나뿐이었다.
// 운영 중에 "회차 일정이 바뀌었어요" 같은 걸 보내려면 코드를 고쳐야 했다.
//
// 푸시는 취소가 안 된다. 그래서 두 단계로 나눈다 — 먼저 dry로 "지금 몇
// 명에게 갑니다"를 확인하고, 그다음에 보낸다. 보낸 것은 기록에 남겨서
// 같은 공지를 두 번 보내는 사고를 막는다.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PAGE = 1000

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return session.user.id
}

async function collect<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await build(from, from + PAGE - 1)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

/** 지금 알림이 실제로 닿는 사람 수. /api/push의 broadcast 대상 계산과 같은 규칙이다. */
async function countRecipients(sb: ReturnType<typeof serviceClient>) {
  const members = await collect<{ profile_id: string }>((f, t) =>
    sb.from('agency_members').select('profile_id').order('profile_id').range(f, t))
  const exclude = new Set(members.map(m => m.profile_id))

  const [subs, tokens] = await Promise.all([
    collect<{ user_id: string }>((f, t) =>
      sb.from('push_subscriptions').select('user_id').order('user_id').range(f, t)),
    collect<{ user_id: string }>((f, t) =>
      sb.from('device_tokens').select('user_id').order('user_id').range(f, t)),
  ])

  const web = new Set(subs.map(s => s.user_id).filter(id => !exclude.has(id)))
  const app = new Set(tokens.map(t => t.user_id).filter(id => !exclude.has(id)))
  const people = new Set([...web, ...app])

  return { people: people.size, web: web.size, app: app.size }
}

export async function POST(req: NextRequest) {
  const adminId = await verifyAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, body, url, dry } = await req.json().catch(() => ({}))
  if (typeof title !== 'string' || !title.trim() || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: '제목과 내용을 모두 입력해주세요.' }, { status: 400 })
  }

  const sb = serviceClient()
  const counts = await countRecipients(sb)

  if (dry) return NextResponse.json({ dry: true, ...counts })

  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET이 설정되지 않아 발송할 수 없어요.' }, { status: 503 })
  }

  const origin = new URL(req.url).origin
  const res = await fetch(`${origin}/api/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      broadcast: true,
      title: title.trim(),
      body: body.trim(),
      url: typeof url === 'string' && url.trim() ? url.trim() : '/dashboard',
    }),
  })

  const sent = res.ok ? await res.json().catch(() => ({})) : {}

  // 기록은 발송 뒤에 남긴다. 순서가 반대면 발송이 실패했는데 "보냄"으로
  // 남는다 — 그러면 다음 사람이 안 보내고 넘어간다.
  await sb.from('admin_broadcasts').insert({
    sent_by: adminId,
    title: title.trim(),
    body: body.trim(),
    url: typeof url === 'string' && url.trim() ? url.trim() : null,
    recipients: counts.people,
    web_sent: (sent as { web?: number }).web ?? 0,
    app_sent: (sent as { app?: number }).app ?? 0,
  })

  return NextResponse.json({
    ok: res.ok,
    recipients: counts.people,
    web: (sent as { web?: number }).web ?? 0,
    app: (sent as { app?: number }).app ?? 0,
  })
}

/** 최근 발송 기록. 같은 공지를 두 번 보내는 걸 막는 게 목적이다. */
export async function GET() {
  const adminId = await verifyAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = serviceClient()
  const { data } = await sb
    .from('admin_broadcasts')
    .select('id, title, body, url, recipients, web_sent, app_sent, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTelegram } from '@/lib/telegram'

// 버그 신고.
//
// 텔레그램만 쓰면 봇 토큰이 비어 있을 때(유출로 재발급 대기 중) 신고가 그대로
// 증발한다. DB에 먼저 저장하고 텔레그램은 알림용으로만 보낸다.
//
// 저장은 service role로 한다. bug_reports에 insert 정책을 두지 않았으므로
// 클라이언트는 직접 넣지 못한다 — 열어두면 아무나 대량으로 밀어넣을 수 있다.

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { message?: string; page?: string } = {}
  try { body = await req.json() } catch { /* 아래에서 걸린다 */ }

  const message = (body.message ?? '').trim()
  if (!message) return NextResponse.json({ error: 'empty' }, { status: 400 })
  if (message.length > 2000) return NextResponse.json({ error: 'too long' }, { status: 400 })

  // 지망생인지 기획사인지 알면 재현이 빠르다. 요청 값이 아니라 DB에서 읽는다.
  const { data: prof } = await admin.from('profiles').select('name, role').eq('id', user.id).single()

  const { error } = await admin.from('bug_reports').insert({
    user_id: user.id,
    role: prof?.role ?? null,
    message,
    page: (body.page ?? '').slice(0, 300) || null,
    user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300) || null,
  })
  if (error) return NextResponse.json({ error: 'save failed' }, { status: 500 })

  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16)
  await notifyTelegram([
    '🐛 버그 신고 - Krookie',
    `보낸 사람: ${prof?.name ?? user.email ?? '(없음)'} (${prof?.role ?? '?'})`,
    `화면: ${body.page ?? '(없음)'}`,
    `시간: ${kst} KST`,
    '',
    message.slice(0, 900),
  ].join('\n')).catch(() => {})

  return NextResponse.json({ ok: true })
}

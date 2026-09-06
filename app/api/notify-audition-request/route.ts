import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTelegram } from '@/lib/telegram'

// 기획사가 오디션을 신청하면 운영자에게 알린다.
//
// 신청은 담당자가 전화로 일정을 조율해야 게시된다. 그런데 신청이 들어온
// 걸 알 방법이 어드민 대시보드를 여는 것뿐이었다. 지연이 곧 오픈 지연이다.
//
// 문구는 서버가 만든다. auditionId만 받아서 제목·기획사명을 DB에서 직접
// 읽는다 — 요청 본문을 그대로 보내게 하면 로그인한 사람이 운영자
// 텔레그램에 아무 내용이나 밀어 넣을 수 있다.

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { auditionId } = await req.json().catch(() => ({}))
  if (typeof auditionId !== 'string' || !auditionId) {
    return NextResponse.json({ error: 'auditionId가 필요해요.' }, { status: 400 })
  }

  const { data: aud } = await admin
    .from('auditions')
    .select('id, title, deadline, status, agency_id, agency:agencies(name)')
    .eq('id', auditionId)
    .single()

  if (!aud || aud.status !== 'requested') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // 신청한 사람이 그 기획사 소속인지 확인한다. 남의 신청 건으로 알림을
  // 만들어 보내는 걸 막는다.
  const { data: membership } = await admin
    .from('agency_members')
    .select('profile_id')
    .eq('agency_id', aud.agency_id as string)
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const agencyName = (Array.isArray(aud.agency) ? aud.agency[0]?.name : (aud.agency as { name: string } | null)?.name) ?? '(기획사명 없음)'
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const time = kst.toISOString().replace('T', ' ').slice(0, 16)

  await notifyTelegram([
    '📋 오디션 신청 - Krookie',
    `기획사: ${agencyName}`,
    `공고: ${aud.title}`,
    aud.deadline ? `희망 마감: ${aud.deadline}` : null,
    `시간: ${time} KST`,
    '',
    '연락해서 일정을 조율한 뒤 게시하세요.',
    'https://kpick.app/admin/auditions',
  ].filter(Boolean).join('\n'))

  return NextResponse.json({ ok: true })
}

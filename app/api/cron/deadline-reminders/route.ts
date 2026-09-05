import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 마감 임박 알림.
//
// 지원은 마감 직전에 몰리고, 주 대상(초중등~고등)이 시간을 낼 수 있는 건
// 주말이다. 그래서 오픈 요일보다 마감 요일이 훨씬 중요하고, 실질 지원 수를
// 가장 많이 만드는 건 마감 D-1 저녁이다.
//
// 요일로 짜지 않고 deadline 값으로 판단한다. 회차 일정이 바뀌어도 크론을
// 고칠 필요가 없고, 특별 공고가 다른 요일에 마감돼도 그대로 동작한다.
//
// 이미 지원한 사람에게는 보내지 않는다. "곧 마감이에요"는 할 일이 남은
// 사람에게만 뜻이 있고, 끝낸 사람에게는 그냥 성가신 알림이다.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/** 한국 기준 날짜(YYYY-MM-DD). 마감은 한국 시간으로 정해진다. */
function kstDay(offsetDays = 0): string {
  return new Date(Date.now() + 9 * 3600_000 + offsetDays * 86400_000)
    .toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const today = kstDay(0)
  const tomorrow = kstDay(1)

  const { data: auds } = await admin
    .from('auditions')
    .select('id, title, deadline')
    .eq('status', 'active')
    .in('deadline', [today, tomorrow])

  const auditions = auds ?? []
  if (auditions.length === 0) {
    return NextResponse.json({ ok: true, auditions: 0, notified: 0 })
  }

  const auditionIds = auditions.map(a => a.id as string)

  const [{ data: talents }, { data: applied }] = await Promise.all([
    admin.from('profiles').select('id').eq('role', 'talent').eq('is_active', true),
    admin.from('audition_applications').select('audition_id, talent_id').in('audition_id', auditionIds),
  ])

  // 공고별로 "이미 지원한 사람" 집합
  const appliedBy = new Map<string, Set<string>>()
  for (const row of applied ?? []) {
    const aid = row.audition_id as string
    if (!appliedBy.has(aid)) appliedBy.set(aid, new Set())
    appliedBy.get(aid)!.add(row.talent_id as string)
  }

  // 사람별로 아직 지원 안 한 공고를 모은다. 오늘 마감이 하나라도 있으면
  // 그쪽이 급하므로 문구를 오늘 기준으로 쓴다.
  type Pending = { today: string[]; tomorrow: string[] }
  const pending = new Map<string, Pending>()
  for (const t of talents ?? []) {
    const uid = t.id as string
    const mine: Pending = { today: [], tomorrow: [] }
    for (const a of auditions) {
      if (appliedBy.get(a.id as string)?.has(uid)) continue
      const title = (a.title as string) ?? '오디션'
      if (a.deadline === today) mine.today.push(title)
      else mine.tomorrow.push(title)
    }
    if (mine.today.length + mine.tomorrow.length > 0) pending.set(uid, mine)
  }

  if (pending.size === 0) {
    return NextResponse.json({ ok: true, auditions: auditions.length, notified: 0 })
  }

  // 같은 문구를 받을 사람끼리 묶어서 한 번에 보낸다. 보통 공고가 한 개라
  // 그룹도 한두 개다.
  const groups = new Map<string, { title: string; body: string; ids: string[] }>()
  for (const [uid, mine] of pending) {
    const urgent = mine.today.length > 0
    const list = urgent ? mine.today : mine.tomorrow
    const extra = list.length > 1 ? ` 외 ${list.length - 1}개` : ''
    const title = urgent ? '오늘 밤 마감이에요' : '내일 마감이에요'
    const body = urgent
      ? `${list[0]}${extra} 지원이 오늘 밤 11시 59분에 마감돼요.`
      : `${list[0]}${extra} 지원, 내일까지예요. 영상 하나면 지원할 수 있어요.`
    const key = `${title}|${body}`
    if (!groups.has(key)) groups.set(key, { title, body, ids: [] })
    groups.get(key)!.ids.push(uid)
  }

  const origin = new URL(req.url).origin
  await Promise.allSettled([...groups.values()].map(g =>
    fetch(`${origin}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        userIds: g.ids,
        title: g.title,
        body: g.body,
        url: '/dashboard/auditions',
      }),
    })
  ))

  return NextResponse.json({
    ok: true,
    auditions: auditions.length,
    groups: groups.size,
    notified: pending.size,
  })
}

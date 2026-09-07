import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { roundOpensAt } from '@/lib/launch'

// 마감 후 7일이 지나도록 결과가 안 들어온 회차를 자동으로 닫는다.
//
// 기획사가 "할게요" 하고 미루는 걸 막는 장치인데, 제재를 따로 만들 필요가
// 없다는 게 핵심이다. 결과를 안 내면 그 회차 지원자는 전원 심사 종료가 되고,
// 불합격이면 어차피 연락을 못 하니 그 회차에서 아무것도 못 얻는다.
// 범위는 그 회차 지원자까지다 — 1회 미입력에 앱 전체를 막으면 기획사가 이탈한다.
//
// 이미 1차 합격시킨 사람은 건드리지 않는다. 그건 결과를 낸 것이다.
//
// auto_decided로 표시해서 기획사가 직접 누른 것과 구분한다. 반복해서 방치하는
// 기획사를 나중에 걸러내려면 이 구분이 있어야 한다.
//
// 자동 마감은 마지막 안전망이고, 그 전에 기획사를 데려오는 게 본래 목적이다.
// 그래서 같은 크론에서 "마감됐는데 아직 안 본 지원자가 있는 회차"를 매일
// 기획사에 알린다(remindPendingReviews). 하루에 한 번 돌므로 방치하는 동안
// 계속 간다 — 재촉이 따로 필요 없다.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GRACE_DAYS = 7

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/** 한국 기준 날짜(YYYY-MM-DD). 마감은 한국 시간으로 정해진다. */
function kstDay(offsetDays = 0): string {
  return new Date(Date.now() + 9 * 3600_000 + offsetDays * 86400_000)
    .toISOString().slice(0, 10)
}

type Reminder = { auditionId: string; title: string; waiting: number }

// 마감은 지났지만 아직 자동 마감 유예 안에 있고, 안 본 지원자가 남은 회차.
//
// 문구를 "결과를 입력해주세요"로 쓰지 않는다. 그건 우리 사정이고, 기획사가
// 누를 이유가 없다. 기획사가 어차피 하고 싶은 건 지원 영상을 보는 것이므로
// 거기로 데려가고, 영상을 보다 마음에 드는 사람에게 메시지를 보내는 그 행동이
// 곧 1차 합격 처리가 된다(접촉 모델).
async function collectPendingReviews(today: string, cutoff: string): Promise<Reminder[]> {
  const { data: due } = await admin
    .from('auditions').select('id, title')
    .eq('status', 'active')
    .not('deadline', 'is', null)
    .lt('deadline', today)
    .gte('deadline', cutoff)

  const auditions = due ?? []
  if (auditions.length === 0) return []

  const { data: waiting } = await admin
    .from('audition_applications')
    .select('audition_id')
    .in('audition_id', auditions.map(a => a.id as string))
    .eq('status', 'pending')

  const counts = new Map<string, number>()
  for (const row of waiting ?? []) {
    const aid = row.audition_id as string
    counts.set(aid, (counts.get(aid) ?? 0) + 1)
  }

  return auditions
    .map(a => ({
      auditionId: a.id as string,
      title: (a.title as string) ?? '오디션',
      waiting: counts.get(a.id as string) ?? 0,
    }))
    .filter(r => r.waiting > 0)
}

export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // ?dry=1 이면 계산만 하고 아무것도 바꾸거나 보내지 않는다. 발송과 자동 마감은
  // 둘 다 되돌릴 수 없어서, 대상이 맞는지 눈으로 보고 나서 돌릴 수 있어야 한다.
  const dry = new URL(req.url).searchParams.get('dry') === '1'

  const today = kstDay(0)
  const cutoff = new Date(Date.now() - GRACE_DAYS * 86400_000).toISOString().slice(0, 10)
  const origin = new URL(req.url).origin

  // ── 0. 오픈 시각이 된 예약 회차를 연다
  //
  // 매주 월요일 저녁 6시에 사람이 앉아서 게시 버튼을 누르고 있을 수는 없다.
  // 순번을 미리 등록해두면 여기서 열고 알림까지 보낸다. 'paused'는 건드리지
  // 않는다 — 멈춰둔 건 이유가 있어서 멈춘 것이다.
  const { data: pending } = await admin
    .from('auditions').select('id, title, deadline')
    .eq('status', 'scheduled')
    .not('deadline', 'is', null)

  const toOpen = (pending ?? []).filter(a => roundOpensAt(a.deadline as string).getTime() <= Date.now())
  if (!dry && toOpen.length > 0) {
    await admin.from('auditions').update({ status: 'active' })
      .in('id', toOpen.map(a => a.id as string))
    await Promise.allSettled(toOpen.map(a =>
      fetch(`${origin}/api/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          broadcast: true,
          title: '새 오디션이 열렸어요',
          body: a.title as string,
          url: '/dashboard/auditions',
        }),
      })
    ))
  }
  const opened = toOpen.map(a => ({ title: a.title, deadline: a.deadline }))

  // ── 1. 아직 유예 안에 있는 회차: 기획사를 데려온다
  const reminders = await collectPendingReviews(today, cutoff)
  if (!dry) {
    await Promise.allSettled(reminders.map(r =>
      fetch(`${origin}/api/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          auditionId: r.auditionId,
          title: `지원자 ${r.waiting}명이 기다리고 있어요`,
          body: `${r.title} 지원 영상을 확인해주세요.`,
          url: `/agency/auditions/${r.auditionId}`,
        }),
      })
    ))
  }

  // ── 2. 유예가 끝난 회차: 닫고 지원자에게 알린다
  const { data: overdue } = await admin
    .from('auditions').select('id, title')
    .not('deadline', 'is', null)
    .lt('deadline', cutoff)

  const auditionIds = (overdue ?? []).map(a => a.id as string)
  if (auditionIds.length === 0) {
    return NextResponse.json({ ok: true, dry, opened, auditions: 0, closed: 0, reminders })
  }

  const { data: stale } = await admin
    .from('audition_applications')
    .select('id, talent_id')
    .in('audition_id', auditionIds)
    .in('status', ['pending', 'skip'])

  const rows = stale ?? []

  if (dry) {
    return NextResponse.json({
      ok: true, dry: true, today, cutoff,
      opened, reminders,
      auditions: auditionIds.length,
      closed: rows.length,
    })
  }

  // 회차를 닫는 건 지원자 유무와 상관없다. 예전엔 정리할 지원자가 없으면
  // 여기서 그냥 돌아가버려서, 아무도 지원 안 한 공고는 마감이 반년 지나도
  // 계속 'active'로 남았다.
  await admin.from('auditions').update({ status: 'closed' })
    .in('id', auditionIds).neq('status', 'closed')

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, opened, auditions: auditionIds.length, closed: 0, reminders })
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('audition_applications')
    .update({ status: 'rejected', decided_at: now, auto_decided: true })
    .in('id', rows.map(r => r.id as string))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 결과를 안 알려주면 다음 회차에 안 온다 — 매주 여는 구조에서 그게 가장
  // 빠른 죽음이다. '불합격'이라는 단어는 쓰지 않고 다음 회차로 넘긴다.
  const talentIds = [...new Set(rows.map(r => r.talent_id as string).filter(Boolean))]
  await Promise.allSettled(talentIds.map(userId =>
    fetch(`${origin}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        userId,
        title: '이번 회차 심사가 끝났어요',
        body: '다음 오디션이 곧 열려요. 준비해두신 영상으로 바로 지원할 수 있어요.',
        url: '/dashboard/auditions',
      }),
    })
  ))

  return NextResponse.json({
    ok: true,
    opened,
    auditions: auditionIds.length,
    closed: rows.length,
    notified: talentIds.length,
    reminders,
  })
}

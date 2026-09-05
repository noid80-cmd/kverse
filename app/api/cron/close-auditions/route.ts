import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GRACE_DAYS = 7

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const cutoff = new Date(Date.now() - GRACE_DAYS * 86400_000).toISOString().slice(0, 10)

  const { data: overdue } = await admin
    .from('auditions').select('id, title')
    .not('deadline', 'is', null)
    .lt('deadline', cutoff)

  const auditionIds = (overdue ?? []).map(a => a.id as string)
  if (auditionIds.length === 0) {
    return NextResponse.json({ ok: true, auditions: 0, closed: 0 })
  }

  const { data: stale } = await admin
    .from('audition_applications')
    .select('id, talent_id')
    .in('audition_id', auditionIds)
    .in('status', ['pending', 'skip'])

  // 회차를 닫는 건 지원자 유무와 상관없다. 예전엔 정리할 지원자가 없으면
  // 여기서 그냥 돌아가버려서, 아무도 지원 안 한 공고는 마감이 반년 지나도
  // 계속 'active'로 남았다.
  await admin.from('auditions').update({ status: 'closed' })
    .in('id', auditionIds).neq('status', 'closed')

  const rows = stale ?? []
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, auditions: auditionIds.length, closed: 0 })
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('audition_applications')
    .update({ status: 'rejected', decided_at: now, auto_decided: true })
    .in('id', rows.map(r => r.id as string))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 결과를 안 알려주면 다음 회차에 안 온다 — 매주 여는 구조에서 그게 가장
  // 빠른 죽음이다. '불합격'이라는 단어는 쓰지 않고 다음 회차로 넘긴다.
  const origin = new URL(req.url).origin
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
    auditions: auditionIds.length,
    closed: rows.length,
    notified: talentIds.length,
  })
}

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 마감이 지났는데 결과를 안 낸 회차를 모아 보여준다.
//
// 7일이 지나면 크론이 자동으로 닫아준다. 그건 지망생을 구하는 장치지
// 기획사를 관리하는 장치가 아니다 — "지금 어느 기획사가 며칠째 결과를 안
// 냈는지"를 담당자가 볼 수 있어야 전화를 걸어 재촉할 수 있다.
//
// 자동 마감을 기다리면 그 회차 지원자는 전원 '심사 종료'가 된다. 실제로
// 뽑을 생각이 있는 기획사가 깜빡한 것뿐이라면 그건 양쪽 모두에게 손해다.

export const dynamic = 'force-dynamic'

const GRACE_DAYS = 7

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
  if (!session) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return profile?.role === 'admin'
}

/** 한국 기준 날짜(YYYY-MM-DD). 마감은 한국 시간으로 정해진다. */
function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

export async function GET(_req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = serviceClient()
  const today = kstToday()

  // 마감이 지난 회차. 이미 닫힌 것도 포함한다 — 크론이 닫아버린 뒤에도
  // "이 기획사가 방치했다"는 사실은 남아 있어야 한다.
  const { data: auds, error } = await sb
    .from('auditions')
    .select('id, title, deadline, status, agency_id, agency:agencies(name)')
    .not('deadline', 'is', null)
    .lt('deadline', today)
    .order('deadline', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = auds ?? []
  if (rows.length === 0) return NextResponse.json([])

  const auditionIds = rows.map(r => r.id as string)

  // 아직 결과가 안 나온 지원자만 센다. invited(1차 합격)·rejected는 결과가
  // 나온 것이다.
  const { data: apps } = await sb
    .from('audition_applications')
    .select('audition_id, status')
    .in('audition_id', auditionIds)
    .in('status', ['pending', 'skip'])

  const waiting = new Map<string, number>()
  for (const a of apps ?? []) {
    const id = a.audition_id as string
    waiting.set(id, (waiting.get(id) ?? 0) + 1)
  }

  const pending = rows.filter(r => (waiting.get(r.id as string) ?? 0) > 0)
  if (pending.length === 0) return NextResponse.json([])

  // 전화를 걸어야 하니 담당자 연락처가 목록 안에 있어야 한다.
  const agencyIds = [...new Set(pending.map(r => r.agency_id).filter(Boolean) as string[])]
  const contactsByAgency = new Map<string, unknown[]>()

  if (agencyIds.length > 0) {
    const { data: members } = await sb
      .from('agency_members').select('agency_id, profile_id').in('agency_id', agencyIds)
    const memberRows = members ?? []
    const profileIds = [...new Set(memberRows.map(m => m.profile_id as string))]

    const { data: profs } = profileIds.length
      ? await sb.from('profiles').select('id, name, phone').in('id', profileIds)
      : { data: [] }
    const profById = new Map((profs ?? []).map(p => [p.id as string, p]))

    const emails = new Map<string, string>()
    await Promise.all(profileIds.map(async id => {
      const { data: u } = await sb.auth.admin.getUserById(id)
      if (u?.user?.email) emails.set(id, u.user.email)
    }))

    for (const m of memberRows) {
      const p = profById.get(m.profile_id as string)
      const list = contactsByAgency.get(m.agency_id as string) ?? []
      list.push({
        name: (p?.name as string) ?? null,
        phone: (p?.phone as string) ?? null,
        email: emails.get(m.profile_id as string) ?? null,
      })
      contactsByAgency.set(m.agency_id as string, list)
    }
  }

  const todayMs = new Date(`${today}T00:00:00+09:00`).getTime()

  return NextResponse.json(pending.map(r => {
    const deadline = r.deadline as string
    const daysOver = Math.round((todayMs - new Date(`${deadline}T00:00:00+09:00`).getTime()) / 86400_000)
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      deadline,
      days_over: daysOver,
      // 음수면 이미 자동 마감 대상이다(크론이 다음 실행에서 닫는다).
      auto_close_in: GRACE_DAYS - daysOver,
      waiting: waiting.get(r.id as string) ?? 0,
      // Supabase 타입은 조인을 배열로 추론하지만 실제로는 단일 객체가 온다.
      agency_name: (Array.isArray(r.agency) ? r.agency[0]?.name : (r.agency as { name: string } | null)?.name) ?? null,
      contacts: r.agency_id ? (contactsByAgency.get(r.agency_id as string) ?? []) : [],
    }
  }))
}

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return { user: session.user, token: session.access_token }
}

async function autoTranslate(title: string, description: string | null) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!apiKey) return null

  // app translation keys → Google Translate target codes
  const targets: Array<[string, string]> = [
    ['ja', 'ja'],
    ['en', 'en'],
    ['zh-CN', 'zh-CN'],
    ['th', 'th'],
  ]

  const results = await Promise.allSettled(
    targets.map(async ([storeKey, googleTarget]) => {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: [title, description ?? ''],
            source: 'ko',
            target: googleTarget,
            format: 'text',
          }),
        }
      )
      if (!res.ok) throw new Error(`translate failed for ${googleTarget}`)
      const data = await res.json()
      const translated = data.data.translations as { translatedText: string }[]
      return {
        key: storeKey,
        title: translated[0].translatedText,
        description: translated[1]?.translatedText ?? '',
      }
    })
  )

  const translations: Record<string, { title: string; description: string }> = {}
  for (const r of results) {
    if (r.status === 'fulfilled') {
      translations[r.value.key] = { title: r.value.title, description: r.value.description }
    }
  }
  return Object.keys(translations).length > 0 ? translations : null
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = serviceClient()
  const { data, error } = await sb
    .from('auditions')
    .select('id, title, description, category, mode, deadline, status, created_at, agency_id, agency:agencies(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 신청 건은 담당자가 기획사에 전화해서 일정을 조율한 뒤 게시한다. 그런데
  // 화면에 연락처가 없어서 매번 DB를 뒤져야 했다. 신청 카드에 바로 붙인다.
  //
  // 신청(requested) 건에 대해서만 조회한다 — 게시된 공고까지 담당자 연락처를
  // 실어 보낼 이유가 없다. 이메일은 auth.users에 있어 서비스 롤로만 읽힌다.
  const rows = data ?? []
  const agencyIds = [...new Set(
    rows.filter(r => r.status === 'requested' && r.agency_id).map(r => r.agency_id as string)
  )]

  if (agencyIds.length > 0) {
    const { data: members } = await sb
      .from('agency_members').select('agency_id, profile_id').in('agency_id', agencyIds)
    const memberRows = members ?? []
    const profileIds = [...new Set(memberRows.map(m => m.profile_id as string))]

    const { data: profs } = profileIds.length
      ? await sb.from('profiles').select('id, name, phone').in('id', profileIds)
      : { data: [] }

    const emails = new Map<string, string>()
    await Promise.all(profileIds.map(async id => {
      const { data: u } = await sb.auth.admin.getUserById(id)
      if (u?.user?.email) emails.set(id, u.user.email)
    }))

    const profById = new Map((profs ?? []).map(p => [p.id as string, p]))
    const byAgency = new Map<string, unknown[]>()
    for (const m of memberRows) {
      const p = profById.get(m.profile_id as string)
      const list = byAgency.get(m.agency_id as string) ?? []
      list.push({
        name: (p?.name as string) ?? null,
        phone: (p?.phone as string) ?? null,
        email: emails.get(m.profile_id as string) ?? null,
      })
      byAgency.set(m.agency_id as string, list)
    }

    for (const r of rows) {
      if (r.status === 'requested' && r.agency_id) {
        (r as Record<string, unknown>).contacts = byAgency.get(r.agency_id as string) ?? []
      }
    }
  }

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const sb = serviceClient()

  const translations = await autoTranslate(body.title, body.description ?? null)

  const { error } = await sb.from('auditions').insert({
    agency_id: body.agency_id ?? null,
    title: body.title,
    description: body.description ?? null,
    category: body.category,
    mode: body.mode,
    deadline: body.deadline,
    status: 'active',
    ...(translations ? { translations } : {}),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  fetch(`${new URL(request.url).origin}/api/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin.token}` },
    body: JSON.stringify({
      broadcast: true,
      title: '새 오디션 공고',
      body: `${body.title} 오디션이 올라왔어요!`,
      url: '/dashboard/auditions',
    }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = serviceClient()

  // status만 바꾸는 호출(마감/재개)이 있으므로 보내온 필드만 갱신한다.
  // 예전처럼 통째로 덮으면 {id, status}만 받았을 때 title 등이 날아간다.
  if ('status' in fields && Object.keys(fields).length === 1) {
    const { error } = await sb.from('auditions').update({ status: fields.status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const translations = await autoTranslate(fields.title, fields.description ?? null)

  const { error } = await sb.from('auditions').update({
    agency_id: fields.agency_id ?? null,
    title: fields.title,
    description: fields.description ?? null,
    category: fields.category,
    mode: fields.mode,
    deadline: fields.deadline,
    ...(translations ? { translations } : {}),
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const sb = serviceClient()
  const { error } = await sb.from('auditions').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

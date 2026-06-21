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
  return NextResponse.json(data)
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

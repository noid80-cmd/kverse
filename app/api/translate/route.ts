import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TARGET_LANGS = ['en', 'ja', 'zh-CN', 'th']

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await adminSupabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { texts } = await request.json()
  const key = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 500 })

  const results: Record<string, string[]> = {}

  await Promise.all(TARGET_LANGS.map(async (lang) => {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: texts, target: lang, source: 'ko' }),
      }
    )
    const data = await res.json()
    results[lang] = data.data?.translations?.map((t: { translatedText: string }) => t.translatedText) ?? texts
  }))

  return NextResponse.json(results)
}

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, title, body, url } = await req.json()
  console.log('[push] start userId:', userId)
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })

  const { data: subs, error: dbErr } = await adminSupabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)

  console.log('[push] subs:', subs?.length ?? 0, dbErr?.message ?? 'ok')
  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url })
  let sent = 0

  for (const { id, subscription } of subs) {
    try {
      console.log('[push] sending sub id:', id)
      const result = await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
      console.log('[push] ok statusCode:', result.statusCode)
      sent++
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string; message?: string }
      console.error('[push] failed:', e.statusCode, e.body, e.message)
      if (e.statusCode === 410 || e.statusCode === 404) {
        await adminSupabase.from('push_subscriptions').delete().eq('id', id)
      }
    }
  }

  console.log('[push] done sent:', sent)
  return NextResponse.json({ sent })
}

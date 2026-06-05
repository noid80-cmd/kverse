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
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })

  const { data: subs } = await adminSupabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url })
  let sent = 0

  for (const { id, subscription } of subs) {
    try {
      const result = await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
      console.log('Push sent ok:', result.statusCode)
      sent++
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string }
      console.error('Push failed:', e.statusCode, e.body)
      await adminSupabase.from('push_subscriptions').delete().eq('id', id)
    }
  }

  return NextResponse.json({ sent })
}

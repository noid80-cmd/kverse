import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const ADMIN_EMAIL = 'noid80@hanmail.net'

export async function POST(req: NextRequest) {
  try {
    const { title, body, url } = await req.json()
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: users } = await db.auth.admin.listUsers()
    const adminUser = users?.users?.find(u => u.email === ADMIN_EMAIL)
    if (!adminUser) return NextResponse.json({ ok: true, sent: 0 })

    const { data: adminAccount } = await db
      .from('accounts')
      .select('id')
      .eq('user_id', adminUser.id)
      .maybeSingle()

    if (!adminAccount) return NextResponse.json({ ok: true, sent: 0 })

    const { data: subs } = await db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('account_id', adminAccount.id)

    if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    const payload = JSON.stringify({ title, body: body || '', url: url || '/admin' })

    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async err => {
          if (err.statusCode === 410) {
            await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        })
      )
    )

    return NextResponse.json({ ok: true, sent: subs.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

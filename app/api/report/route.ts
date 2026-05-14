import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const ADMIN_EMAIL = 'noid80@hanmail.net'

async function notifyAdmin(db: ReturnType<typeof createClient>, title: string, body: string) {
  const { data: users } = await db.auth.admin.listUsers()
  const adminUser = users?.users?.find(u => u.email === ADMIN_EMAIL)
  if (!adminUser) return

  const { data: adminAccount } = await db
    .from('accounts').select('id').eq('user_id', adminUser.id).maybeSingle()
  if (!adminAccount) return

  const { data: subs } = await db
    .from('push_subscriptions').select('endpoint, p256dh, auth').eq('account_id', adminAccount.id)
  if (!subs || subs.length === 0) return

  const payload = JSON.stringify({ title, body, url: '/admin' })
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
}

export async function POST(req: NextRequest) {
  try {
    const { videoId, reporterAccountId, reason } = await req.json()
    if (!videoId || !reporterAccountId || !reason) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await db.from('video_reports').insert({
      video_id: videoId,
      reporter_account_id: reporterAccountId,
      reason,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: video } = await db
      .from('videos')
      .select('title, accounts(username)')
      .eq('id', videoId)
      .maybeSingle()

    const videoTitle = video?.title || '영상'
    const uploaderUsername = (video?.accounts as any)?.username || '알 수 없음'

    await notifyAdmin(db, '🚨 영상 신고 접수', `@${uploaderUsername}의 "${videoTitle}" — ${reason}`)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

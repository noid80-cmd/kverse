import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// VAPID JWT using crypto.subtle — bypasses jws/web-push JWT signing bugs
async function makeVapidJwt(endpoint: string, publicKey: string): Promise<string> {
  const { protocol, host } = new URL(endpoint)
  const headerB64 = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify({
    aud: `${protocol}//${host}`,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: `mailto:${process.env.VAPID_EMAIL}`,
  })).toString('base64url')
  const signingInput = `${headerB64}.${payloadB64}`

  // Public key is uncompressed P-256: 0x04 || x(32) || y(32) = 65 bytes
  const pub = Buffer.from(publicKey, 'base64url')
  const jwk = {
    kty: 'EC', crv: 'P-256',
    d: process.env.VAPID_PRIVATE_KEY!.trim(),
    x: Buffer.from(pub.subarray(1, 33)).toString('base64url'),
    y: Buffer.from(pub.subarray(33, 65)).toString('base64url'),
  }

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${Buffer.from(sig).toString('base64url')}`
}

async function sendToSubs(
  subs: { id: string; subscription: unknown }[],
  payload: string,
  publicKey: string,
  privateKey: string,
): Promise<number> {
  let sent = 0
  await Promise.allSettled(subs.map(async ({ id, subscription }) => {
    try {
      const sub = subscription as webpush.PushSubscription
      const details = await webpush.generateRequestDetails(sub, payload, {
        vapidDetails: { subject: `mailto:${process.env.VAPID_EMAIL}`, publicKey, privateKey },
      })
      const jwt = await makeVapidJwt(sub.endpoint, publicKey)
      const headers: Record<string, string> = { ...(details.headers as unknown as Record<string, string>) }
      headers['Authorization'] = `vapid t=${jwt},k=${publicKey}`

      const res = await fetch(details.endpoint, {
        method: 'POST', headers, body: details.body as unknown as BodyInit | null,
      })
      if (res.status >= 200 && res.status < 300) {
        sent++
      } else if (res.status === 410 || res.status === 404) {
        await adminSupabase.from('push_subscriptions').delete().eq('id', id)
      }
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      if (e.statusCode === 410 || e.statusCode === 404) {
        await adminSupabase.from('push_subscriptions').delete().eq('id', id)
      }
    }
  }))
  return sent
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await adminSupabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const publicKey = (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim()
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim()

  webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, publicKey, privateKey)

  const { userId, broadcast, title, body, url } = await req.json()

  let subs: { id: string; subscription: unknown }[] = []

  if (broadcast) {
    // 기획사 멤버 제외하고 전체 지망생에게 발송
    const { data: agencyMembers } = await adminSupabase
      .from('agency_members').select('profile_id')
    const agencyIds = agencyMembers?.map((m: { profile_id: string }) => m.profile_id) ?? []

    let query = adminSupabase.from('push_subscriptions').select('id, subscription')
    if (agencyIds.length > 0) {
      query = query.not('user_id', 'in', `(${agencyIds.join(',')})`)
    }
    const { data } = await query
    subs = data ?? []
    console.log('[push] broadcast to talents:', subs.length)
  } else {
    if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })
    const { data } = await adminSupabase
      .from('push_subscriptions').select('id, subscription').eq('user_id', userId)
    subs = data ?? []
    console.log('[push] userId:', userId, 'subs:', subs.length)
  }

  if (!subs.length) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url })
  const sent = await sendToSubs(subs, payload, publicKey, privateKey)
  console.log('[push] done sent:', sent)
  return NextResponse.json({ sent })
}

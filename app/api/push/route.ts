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

export async function POST(req: NextRequest) {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim()
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim()
  console.log('[push] publicKey:', publicKey.slice(0, 12), 'len:', publicKey.length)

  webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, publicKey, privateKey)

  const { userId, title, body, url } = await req.json()
  console.log('[push] userId:', userId)
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
      const sub = subscription as webpush.PushSubscription
      console.log('[push] sending to:', sub.endpoint.slice(0, 40))

      // Use web-push for payload encryption only
      const details = await webpush.generateRequestDetails(sub, payload, {
        vapidDetails: { subject: `mailto:${process.env.VAPID_EMAIL}`, publicKey, privateKey },
      })

      // Override Authorization header with our crypto.subtle JWT
      const jwt = await makeVapidJwt(sub.endpoint, publicKey)
      const headers: Record<string, string> = { ...(details.headers as unknown as Record<string, string>) }
      headers['Authorization'] = `vapid t=${jwt},k=${publicKey}`
      console.log('[push] jwt first 30:', jwt.slice(0, 30))

      const res = await fetch(details.endpoint, {
        method: 'POST',
        headers,
        body: details.body as unknown as BodyInit | null,
      })

      const resText = res.status >= 400 ? await res.text() : ''
      console.log('[push] status:', res.status, resText.slice(0, 100))

      if (res.status >= 200 && res.status < 300) {
        sent++
      } else if (res.status === 410 || res.status === 404) {
        await adminSupabase.from('push_subscriptions').delete().eq('id', id)
      }
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string; message?: string }
      console.error('[push] error:', e.statusCode, e.body ?? e.message)
      if (e.statusCode === 410 || e.statusCode === 404) {
        await adminSupabase.from('push_subscriptions').delete().eq('id', id)
      }
    }
  }

  console.log('[push] done sent:', sent)
  return NextResponse.json({ sent })
}

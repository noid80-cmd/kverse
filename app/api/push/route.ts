import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendFcm, fcmHealth } from '@/lib/fcm'

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

// PostgREST는 한 번에 1000행까지만 준다. 초과분은 에러 없이 빠지므로
// "일부에게만 알림이 갔다"가 조용히 벌어진다. 끝까지 읽는다.
const PAGE = 1000
// user_id 목록은 URL 쿼리로 나간다. UUID 하나가 36자라 수백 개를 한 번에
// 넣으면 URL 길이 제한에 걸린다. 나눠서 조회한 뒤 합친다.
const ID_CHUNK = 200

async function collect<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await build(from, from + PAGE - 1)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
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

  // 크론에는 로그인 사용자가 없다. CRON_SECRET이 설정돼 있을 때만 열리는
  // 서버 대 서버 경로를 둔다 — 값이 없으면 이 분기 자체가 죽어서, 설정을
  // 깜빡해도 누구나 부를 수 있는 구멍이 생기지는 않는다.
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  const isInternal = cronSecret.length > 0 && token === cronSecret

  if (!isInternal) {
    const { data: { user } } = await adminSupabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const publicKey = (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim()
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim()

  webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, publicKey, privateKey)

  const { userId, userIds, agencyId, auditionId, broadcast, title, body, url } = await req.json()

  // 수신자 계산은 전부 여기(서비스 롤)에서 한다. 예전엔 오디션 지원 알림의
  // 대상 담당자를 지망생 브라우저가 agency_members에서 직접 찾았는데, 그
  // 테이블 RLS는 "본인 행 또는 어드민"만 통과시켜서 talent에게는 언제나 빈
  // 배열이 돌아왔다 — 에러도 안 나고 알림만 통째로 사라진다. 클라이언트가
  // 볼 수 없는 대상은 클라이언트에게 찾게 하면 안 된다.
  let targetIds: string[] | null = null // null이면 broadcast
  if (!broadcast) {
    // 마감 알림처럼 수백 명에게 같은 문구를 보내는 경우가 있다. 한 명씩
    // 요청하면 왕복 횟수만큼 시간이 들어 크론의 maxDuration에 걸린다.
    if (Array.isArray(userIds) && userIds.length > 0) {
      targetIds = [...new Set(userIds as string[])].filter(Boolean)
    } else if (userId) {
      targetIds = [userId]
    } else if (agencyId || auditionId) {
      let agId: string | null = agencyId ?? null
      if (!agId && auditionId) {
        const { data: aud } = await adminSupabase
          .from('auditions').select('agency_id').eq('id', auditionId).single()
        agId = aud?.agency_id ?? null
      }
      const { data: members } = agId
        ? await adminSupabase.from('agency_members').select('profile_id').eq('agency_id', agId)
        : { data: null }
      targetIds = members?.map((m: { profile_id: string }) => m.profile_id) ?? []
      if (targetIds.length === 0) {
        console.warn('[push] 기획사', agId, '에 담당자가 없어 보낼 곳이 없음')
      }
    } else {
      return NextResponse.json({ error: 'missing userId' }, { status: 400 })
    }
  }

  // broadcast는 기획사 담당자를 뺀 전체 지망생이 대상
  let excludeIds: string[] = []
  if (broadcast) {
    const { data: agencyMembers } = await adminSupabase.from('agency_members').select('profile_id')
    excludeIds = agencyMembers?.map((m: { profile_id: string }) => m.profile_id) ?? []
  }

  // 웹 푸시 구독과 앱(FCM) 토큰은 대상이 겹치지 않는다 — 스토어 앱에는 웹
  // 푸시가 아예 없고, 브라우저에는 FCM 토큰이 없다. 대상자 목록만 같다.
  type Sub = { id: string; subscription: unknown }
  type Tok = { id: string; token: string }
  const subs: Sub[] = []
  const tokens: Tok[] = []

  if (broadcast) {
    const [s, t] = await Promise.all([
      collect<Sub>((from, to) => {
        let q = adminSupabase.from('push_subscriptions').select('id, subscription')
        if (excludeIds.length > 0) q = q.not('user_id', 'in', `(${excludeIds.join(',')})`)
        return q.order('id').range(from, to)
      }),
      collect<Tok>((from, to) => {
        let q = adminSupabase.from('device_tokens').select('id, token')
        if (excludeIds.length > 0) q = q.not('user_id', 'in', `(${excludeIds.join(',')})`)
        return q.order('id').range(from, to)
      }),
    ])
    subs.push(...s)
    tokens.push(...t)
  } else if (targetIds && targetIds.length > 0) {
    for (const ids of chunked(targetIds, ID_CHUNK)) {
      const [s, t] = await Promise.all([
        collect<Sub>((from, to) => adminSupabase
          .from('push_subscriptions').select('id, subscription')
          .in('user_id', ids).order('id').range(from, to)),
        collect<Tok>((from, to) => adminSupabase
          .from('device_tokens').select('id, token')
          .in('user_id', ids).order('id').range(from, to)),
      ])
      subs.push(...s)
      tokens.push(...t)
    }
  }
  console.log('[push]', broadcast ? 'broadcast' : `대상 ${targetIds?.length ?? 0}명`,
    '- web:', subs.length, 'app:', tokens.length)

  const payload = JSON.stringify({ title, body, url })
  const [sent, fcm] = await Promise.all([
    subs.length ? sendToSubs(subs, payload, publicKey, privateKey) : Promise.resolve(0),
    tokens.length
      ? sendFcm(tokens.map((t) => t.token), { title, body, url })
      : Promise.resolve({ sent: 0, failed: 0, deadTokens: [] as string[] }),
  ])

  // 죽은 토큰을 안 지우면 계속 쌓여 발송이 느려진다
  if (fcm.deadTokens.length > 0) {
    await adminSupabase.from('device_tokens').delete().in('token', fcm.deadTokens)
  }

  console.log('[push] web:', sent, '/ app:', fcm.sent, '(실패', fcm.failed, ')')
  return NextResponse.json({ sent, web: sent, app: fcm.sent, appFailed: fcm.failed })
}

// 설정 점검용. 비밀값은 내보내지 않고 성공 여부와 프로젝트 ID만 알려준다.
export async function GET() {
  return NextResponse.json(await fcmHealth())
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-portone-signature') ?? ''

  // 웹훅 서명 검증 (HMAC-SHA256)
  const expected = crypto
    .createHmac('sha256', process.env.PORTONE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (signature !== expected) {
    return NextResponse.json({ error: '서명 검증 실패' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.type === 'Transaction.Paid') {
    const payment = event.data
    const userId = payment.customer?.customerId

    if (!userId || !payment.orderName?.includes('Kverse Plus')) {
      return NextResponse.json({ ok: true })
    }

    const plusExpiresAt = new Date()
    plusExpiresAt.setMonth(plusExpiresAt.getMonth() + 1)

    await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          is_plus: true,
          plus_expires_at: plusExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
  }

  if (event.type === 'Transaction.Cancelled') {
    const payment = event.data
    const userId = payment.customer?.customerId

    if (userId && payment.orderName?.includes('Kverse Plus')) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ is_plus: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COIN_PACKAGES: Record<string, number> = {
  coins_100: 100, coins_550: 550, coins_1200: 1200,
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: '서명 검증 실패' }, { status: 401 })
  }

  // Plus 구독 결제 완료
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, accountId, packageId } = session.metadata ?? {}

    if (userId) {
      const plusExpiresAt = new Date()
      plusExpiresAt.setMonth(plusExpiresAt.getMonth() + 1)
      await supabaseAdmin.from('subscriptions').upsert(
        { user_id: userId, is_plus: true, plus_expires_at: plusExpiresAt.toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    }

    if (accountId && packageId) {
      const coins = COIN_PACKAGES[packageId] ?? 0
      const { data: acc } = await supabaseAdmin.from('accounts').select('coins').eq('id', accountId).single()
      await supabaseAdmin.from('accounts').update({ coins: (acc?.coins ?? 0) + coins }).eq('id', accountId)
    }
  }

  // Plus 구독 갱신
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = invoice.customer as string
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    // stripe customer id로 user 찾는 로직은 stripe_customer_id 컬럼 추가 필요 — 일단 skip
  }

  // Plus 구독 해지
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const metadata = (sub as any).metadata ?? {}
    const userId = metadata.userId
    if (userId) {
      await supabaseAdmin.from('subscriptions').update({ is_plus: false }).eq('user_id', userId)
    }
  }

  return NextResponse.json({ ok: true })
}

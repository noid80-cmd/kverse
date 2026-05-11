import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!

const PACKAGES: Record<string, { coins: number; priceUsd: number; label: string }> = {
  coins_100:  { coins: 100,  priceUsd: 99,   label: '100 Coins' },
  coins_550:  { coins: 550,  priceUsd: 499,  label: '550 Coins (+50 bonus)' },
  coins_1200: { coins: 1200, priceUsd: 999,  label: '1,200 Coins (+200 bonus)' },
}

export async function POST(req: NextRequest) {
  const { accountId, packageId } = await req.json()
  if (!accountId || !packageId) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

  const pkg = PACKAGES[packageId]
  if (!pkg) return NextResponse.json({ error: '잘못된 패키지' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Kverse ${pkg.label}` },
        unit_amount: pkg.priceUsd,
      },
      quantity: 1,
    }],
    success_url: `${BASE_URL}/shop/coins/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/shop/coins`,
    metadata: { accountId, packageId },
  })

  return NextResponse.json({ url: session.url })
}

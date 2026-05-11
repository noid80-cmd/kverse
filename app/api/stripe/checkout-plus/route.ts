import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId 누락' }, { status: 400 })

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = user?.user?.email

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Kverse Plus', description: 'Unlimited accounts, premium items & more' },
        unit_amount: 299,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    success_url: `${BASE_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/upgrade`,
    metadata: { userId },
  })

  return NextResponse.json({ url: session.url })
}

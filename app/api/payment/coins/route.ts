import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PACKAGES: Record<string, { price: number; coins: number }> = {
  coins_100:  { price: 1000,  coins: 100  },
  coins_550:  { price: 5000,  coins: 550  },
  coins_1200: { price: 10000, coins: 1200 },
}

export async function POST(req: NextRequest) {
  const { paymentId, packageId } = await req.json()
  if (!paymentId || !packageId) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })
  }

  const pkg = PACKAGES[packageId]
  if (!pkg) {
    return NextResponse.json({ error: '잘못된 패키지' }, { status: 400 })
  }

  // 포트원 API로 결제 검증
  const portoneRes = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` } }
  )

  if (!portoneRes.ok) {
    return NextResponse.json({ error: '결제 정보를 찾을 수 없어요' }, { status: 400 })
  }

  const payment = await portoneRes.json()

  if (payment.status !== 'PAID') {
    return NextResponse.json({ error: '결제가 완료되지 않았어요' }, { status: 400 })
  }
  if (payment.amount?.total !== pkg.price) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않아요' }, { status: 400 })
  }

  // paymentId 형식: kvers-coin-{accountId(36자)}-{timestamp}
  const accountId = payment.customer?.customerId
    || paymentId.slice('kvers-coin-'.length, 'kvers-coin-'.length + 36)

  // 현재 코인 조회 후 추가
  const { data: acc } = await supabaseAdmin
    .from('accounts')
    .select('coins')
    .eq('id', accountId)
    .single()

  const currentCoins = acc?.coins ?? 0
  const { error } = await supabaseAdmin
    .from('accounts')
    .update({ coins: currentCoins + pkg.coins })
    .eq('id', accountId)

  if (error) {
    return NextResponse.json({ error: '코인 지급에 실패했어요' }, { status: 500 })
  }

  return NextResponse.json({ success: true, coins: pkg.coins })
}

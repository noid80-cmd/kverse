import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { paymentId } = await req.json()
  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId 누락' }, { status: 400 })
  }

  // 포트원 API로 결제 정보 조회
  const portoneRes = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` } }
  )

  if (!portoneRes.ok) {
    return NextResponse.json({ error: '결제 정보를 찾을 수 없어요' }, { status: 400 })
  }

  const payment = await portoneRes.json()

  // 결제 상태 · 금액 검증
  if (payment.status !== 'PAID') {
    return NextResponse.json({ error: '결제가 완료되지 않았어요' }, { status: 400 })
  }
  if (payment.amount?.total !== 2900) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않아요' }, { status: 400 })
  }

  // paymentId 형식: kvers-plus-{userId(36자 UUID)}-{timestamp}
  const userId = payment.customer?.customerId || paymentId.slice('kvers-plus-'.length, 'kvers-plus-'.length + 36)
  if (!userId) {
    return NextResponse.json({ error: '사용자 정보를 확인할 수 없어요' }, { status: 400 })
  }

  // 구독 만료일 계산 (1개월 뒤)
  const plusExpiresAt = new Date()
  plusExpiresAt.setMonth(plusExpiresAt.getMonth() + 1)

  const { error } = await supabaseAdmin
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

  if (error) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: '구독 정보 저장에 실패했어요' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

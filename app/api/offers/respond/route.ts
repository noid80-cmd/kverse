import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 오디션 제안에 대한 지망생의 응답(수락/거절).
//
// 서버에서 처리하는 이유는 수락 시 대화를 열어야 하는데, conversations는
// 기획사만 만들 수 있게 돼 있어서 지망생 세션으로는 못 만들기 때문이다.
// 그리고 제안 메시지를 첫 대화 메시지로 넣어줘야 지망생이 수락하자마자
// 읽을 게 있다 — 빈 대화방만 열리면 또 기다리게 된다.

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { offerId, action } = await req.json()
  if (!offerId || (action !== 'accept' && action !== 'decline')) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const { data: offer } = await admin
    .from('audition_offers')
    .select('id, agency_id, agency_member_id, talent_id, message, status, expires_at')
    .eq('id', offerId).single()

  if (!offer) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // 받은 사람만 응답할 수 있다.
  if (offer.talent_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (offer.status !== 'pending') return NextResponse.json({ error: 'already responded' }, { status: 409 })
  if (new Date(offer.expires_at).getTime() < Date.now()) {
    await admin.from('audition_offers').update({ status: 'expired' }).eq('id', offer.id)
    return NextResponse.json({ error: 'expired' }, { status: 409 })
  }

  const now = new Date().toISOString()

  if (action === 'decline') {
    // 거절은 기획사에 알리지 않는다. 화면에는 '응답 없음'과 합쳐서 보여주므로
    // 지망생이 거절 버튼을 누르는 데 부담이 없고, 기획사도 상할 일이 없다.
    // 데이터로는 구분해 남겨야 거절률이 높은 기획사를 걸러낼 수 있다.
    await admin.from('audition_offers')
      .update({ status: 'declined', responded_at: now }).eq('id', offer.id)
    return NextResponse.json({ ok: true, status: 'declined' })
  }

  const { data: existing } = await admin
    .from('conversations').select('id')
    .eq('agency_member_id', offer.agency_member_id).eq('talent_id', offer.talent_id)
    .limit(1).maybeSingle()

  let convId = existing?.id as string | undefined
  if (!convId) {
    const { data: created, error: convErr } = await admin
      .from('conversations')
      .insert({ agency_member_id: offer.agency_member_id, talent_id: offer.talent_id })
      .select('id').single()
    if (convErr || !created) {
      return NextResponse.json({ error: convErr?.message ?? 'conversation failed' }, { status: 500 })
    }
    convId = created.id
    // 제안에 적힌 말이 곧 첫 메시지다. 기획사가 다시 들어와 인사를 쓸 때까지
    // 기다리게 하지 않는다.
    await admin.from('messages').insert({
      conversation_id: convId,
      sender_id: offer.agency_member_id,
      content: offer.message,
    })
  }

  await admin.from('audition_offers')
    .update({ status: 'accepted', responded_at: now }).eq('id', offer.id)

  return NextResponse.json({ ok: true, status: 'accepted', conversationId: convId })
}

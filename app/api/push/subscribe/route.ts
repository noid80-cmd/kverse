import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { subscription } = await req.json()
  const endpoint: string | undefined = subscription?.endpoint

  // 웹푸시 구독은 계정이 아니라 브라우저에 묶인다. 예전엔 "같은 유저의 구독"만
  // 지우고 넣어서, 한 브라우저에서 계정을 갈아타면 옛 계정의 구독이 그대로
  // 남았다. 그러면 그 브라우저가 남의 알림까지 받고(기획사 PC로 지망생 알림이
  // 왔다), 계정 수만큼 같은 알림이 겹쳐 온다(PC에 3번 왔다).
  //
  // 주소(endpoint)를 기준으로 지운다. 한 브라우저에는 구독이 하나뿐이어야 한다.
  if (endpoint) {
    await adminSupabase.from('push_subscriptions').delete().eq('subscription->>endpoint', endpoint)
  }
  // 유저 단위로 싹 지우지는 않는다. 폰과 PC를 같이 쓰면 둘 다 받아야 한다.
  await adminSupabase.from('push_subscriptions').insert({ user_id: user.id, subscription })

  return NextResponse.json({ ok: true })
}

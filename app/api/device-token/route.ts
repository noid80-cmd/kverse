import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 앱(FCM) 기기 토큰 등록. 웹 푸시(push_subscriptions)와 별개로 관리한다.
// 토큰은 앱 재설치·데이터 삭제·주기적 갱신으로 바뀌므로 앱이 열릴 때마다 올린다.

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

  const { token, platform } = await req.json()
  if (!token || (platform !== 'ios' && platform !== 'android')) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  // 같은 기기를 다른 계정으로 로그인하면 토큰 주인이 바뀌어야 한다.
  // token에 unique가 걸려 있어 upsert로 주인만 갱신된다.
  const { error } = await admin
    .from('device_tokens')
    .upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    )

  if (error) {
    console.error('[device-token] 저장 실패:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  await admin.from('device_tokens').delete().eq('token', token).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}

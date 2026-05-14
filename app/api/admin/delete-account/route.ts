import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'noid80@hanmail.net'

export async function POST(req: NextRequest) {
  const { accountId, requesterId } = await req.json()
  if (!accountId || !requesterId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 요청자가 admin인지 확인
  const { data: { user } } = await serviceClient.auth.admin.getUserById(requesterId)
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 영상 목록 조회
  const { data: videos } = await serviceClient.from('videos').select('id').eq('account_id', accountId)
  const videoIds = (videos || []).map(v => v.id)

  // 순서대로 삭제
  if (videoIds.length > 0) {
    await serviceClient.from('likes').delete().in('video_id', videoIds)
  }
  await serviceClient.from('likes').delete().eq('account_id', accountId)
  await serviceClient.from('videos').delete().eq('account_id', accountId)
  const { error } = await serviceClient.from('accounts').delete().eq('id', accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

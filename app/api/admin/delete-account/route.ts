import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'noid80@hanmail.net'

export async function POST(req: NextRequest) {
  const { accountId, accessToken } = await req.json()
  if (!accountId || !accessToken) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // access token으로 요청자 확인
  const { data: { user }, error: authError } = await db.auth.getUser(accessToken)
  if (authError || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 영상 ID 목록
  const { data: videos } = await db.from('videos').select('id').eq('account_id', accountId)
  const videoIds = (videos || []).map((v: { id: string }) => v.id)

  // 게시글 ID 목록
  const { data: posts } = await db.from('posts').select('id').eq('account_id', accountId)
  const postIds = (posts || []).map((p: { id: string }) => p.id)

  // 대화 ID 목록
  const { data: convs } = await db.from('conversations').select('id')
    .or(`account1_id.eq.${accountId},account2_id.eq.${accountId}`)
  const convIds = (convs || []).map((c: { id: string }) => c.id)

  if (videoIds.length > 0) await db.from('video_views').delete().in('video_id', videoIds)
  await db.from('video_views').delete().eq('viewer_id', accountId)

  if (videoIds.length > 0) await db.from('video_comments').delete().in('video_id', videoIds)
  await db.from('video_comments').delete().eq('account_id', accountId)

  if (videoIds.length > 0) await db.from('likes').delete().in('video_id', videoIds)
  await db.from('likes').delete().eq('account_id', accountId)

  await db.from('notifications').delete().eq('account_id', accountId)
  if (videoIds.length > 0) await db.from('notifications').delete().in('video_id', videoIds)

  if (postIds.length > 0) await db.from('post_likes').delete().in('post_id', postIds)
  await db.from('post_likes').delete().eq('account_id', accountId)

  await db.from('posts').delete().eq('account_id', accountId)

  if (convIds.length > 0) await db.from('messages').delete().in('conversation_id', convIds)
  await db.from('conversations').delete().or(`account1_id.eq.${accountId},account2_id.eq.${accountId}`)

  await db.from('follows').delete().eq('follower_id', accountId)
  await db.from('follows').delete().eq('following_id', accountId)

  await db.from('fandom_members').delete().eq('account_id', accountId)
  await db.from('scout_lists').delete().eq('scout_id', accountId)
  await db.from('scout_lists').delete().eq('target_id', accountId)
  await db.from('user_items').delete().eq('account_id', accountId)
  await db.from('videos').delete().eq('account_id', accountId)

  const { error } = await db.from('accounts').delete().eq('id', accountId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

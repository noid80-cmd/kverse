import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'noid80@hanmail.net'

export async function POST(req: NextRequest) {
  const { accountId, requesterId } = await req.json()
  if (!accountId || !requesterId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 요청자가 admin인지 확인
  const { data: { user } } = await db.auth.admin.getUserById(requesterId)
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 영상 ID 목록
  const { data: videos } = await db.from('videos').select('id').eq('account_id', accountId)
  const videoIds = (videos || []).map(v => v.id)

  // 게시글 ID 목록
  const { data: posts } = await db.from('posts').select('id').eq('account_id', accountId)
  const postIds = (posts || []).map(p => p.id)

  // 대화 ID 목록
  const { data: convs } = await db.from('conversations').select('id')
    .or(`account1_id.eq.${accountId},account2_id.eq.${accountId}`)
  const convIds = (convs || []).map(c => c.id)

  // 1. video_views
  if (videoIds.length > 0) await db.from('video_views').delete().in('video_id', videoIds)
  await db.from('video_views').delete().eq('viewer_id', accountId)

  // 2. video_comments
  if (videoIds.length > 0) await db.from('video_comments').delete().in('video_id', videoIds)
  await db.from('video_comments').delete().eq('account_id', accountId)

  // 3. likes
  if (videoIds.length > 0) await db.from('likes').delete().in('video_id', videoIds)
  await db.from('likes').delete().eq('account_id', accountId)

  // 4. notifications
  await db.from('notifications').delete().eq('account_id', accountId)
  if (videoIds.length > 0) await db.from('notifications').delete().in('video_id', videoIds)

  // 5. post_likes
  if (postIds.length > 0) await db.from('post_likes').delete().in('post_id', postIds)
  await db.from('post_likes').delete().eq('account_id', accountId)

  // 6. posts
  await db.from('posts').delete().eq('account_id', accountId)

  // 7. messages & conversations
  if (convIds.length > 0) await db.from('messages').delete().in('conversation_id', convIds)
  await db.from('conversations').delete().or(`account1_id.eq.${accountId},account2_id.eq.${accountId}`)

  // 8. follows
  await db.from('follows').delete().eq('follower_id', accountId)
  await db.from('follows').delete().eq('following_id', accountId)

  // 9. fandom_members
  await db.from('fandom_members').delete().eq('account_id', accountId)

  // 10. scout_lists
  await db.from('scout_lists').delete().eq('scout_id', accountId)
  await db.from('scout_lists').delete().eq('target_id', accountId)

  // 11. user_items
  await db.from('user_items').delete().eq('account_id', accountId)

  // 12. videos
  await db.from('videos').delete().eq('account_id', accountId)

  // 13. account
  const { error } = await db.from('accounts').delete().eq('id', accountId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'noid80@hanmail.net'

export async function POST(req: NextRequest) {
  const { accountId, accessToken } = await req.json()
  if (!accountId || !accessToken) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'No service key configured' }, { status: 500 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // access token으로 요청자 확인
  const { data: { user }, error: authError } = await db.auth.getUser(accessToken)
  if (authError) return NextResponse.json({ error: 'Auth error: ' + authError.message }, { status: 403 })
  if (!user) return NextResponse.json({ error: 'No user found' }, { status: 403 })
  if (user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Not admin: ' + user.email }, { status: 403 })

  try {
    const { data: videos } = await db.from('videos').select('id').eq('account_id', accountId)
    const videoIds = (videos || []).map((v: { id: string }) => v.id)

    const { data: posts } = await db.from('posts').select('id').eq('account_id', accountId)
    const postIds = (posts || []).map((p: { id: string }) => p.id)

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
    await db.from('subscriptions').delete().eq('account_id', accountId)
    await db.from('videos').delete().eq('account_id', accountId)

    const { error: accError } = await db.from('accounts').delete().eq('id', accountId)
    if (accError) return NextResponse.json({ error: 'accounts delete failed: ' + accError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Exception: ' + msg }, { status: 500 })
  }
}

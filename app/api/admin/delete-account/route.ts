import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'noid80@hanmail.net'

export async function POST(req: NextRequest) {
  try {
    const { accountId, accessToken } = await req.json()
    if (!accountId || !accessToken) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // 토큰으로 요청자 확인 (anon key + Bearer token)
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized: ' + (authError?.message || user?.email || 'no user') }, { status: 403 })
    }

    // service role로 삭제
    const db = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // user_id 먼저 조회 (Auth 삭제용)
    const { data: accountData } = await db.from('accounts').select('user_id').eq('id', accountId).maybeSingle()
    const userId = accountData?.user_id

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
    await db.from('push_subscriptions').delete().eq('account_id', accountId)
    if (videoIds.length > 0) await db.from('video_reports').delete().in('video_id', videoIds)
    await db.from('video_reports').delete().eq('reporter_account_id', accountId)
    await db.from('videos').delete().eq('account_id', accountId)

    const { error: accErr } = await db.from('accounts').delete().eq('id', accountId)
    if (accErr) return NextResponse.json({ error: 'accounts: ' + accErr.message }, { status: 500 })

    // Supabase Auth 유저도 삭제
    if (userId) await db.auth.admin.deleteUser(userId)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

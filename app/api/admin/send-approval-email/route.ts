import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const ADMIN_EMAIL = 'noid80@hanmail.net'
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kverse-nine.vercel.app'

function makeDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, accessToken } = await req.json()
    if (!accountId || !accessToken) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const db = makeDb()

    const { data: account } = await db
      .from('accounts')
      .select('user_id, username, agency_name')
      .eq('id', accountId)
      .maybeSingle()

    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const { data: { user: scoutUser } } = await db.auth.admin.getUserById(account.user_id)
    const scoutEmail = scoutUser?.email
    if (!scoutEmail) return NextResponse.json({ error: 'No email found' }, { status: 404 })

    const resend = new Resend(process.env.RESEND_API_KEY!)

    await resend.emails.send({
      from: 'Kverse <onboarding@resend.dev>',
      to: scoutEmail,
      subject: '🎯 Kverse Scout 계정이 승인됐어요',
      html: `
        <div style="background:#000;color:#fff;font-family:system-ui,sans-serif;padding:40px 24px;max-width:480px;margin:0 auto;border-radius:16px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:16px;">🎯</div>
            <h1 style="font-size:24px;font-weight:900;margin:0 0 8px;">Scout 계정 승인 완료</h1>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0;">${account.agency_name || ''}</p>
          </div>

          <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin-bottom:24px;">
            안녕하세요! <strong style="color:#fff;">@${account.username}</strong> 계정이 Kverse Scout로 승인됐어요.<br/>
            이제 전 세계 커버 아티스트들을 발굴해보세요.
          </p>

          <div style="text-align:center;margin-bottom:32px;">
            <a href="${APP_URL}/login"
              style="display:inline-block;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#E91E8C,#7B2FBE);">
              Kverse 시작하기 →
            </a>
          </div>

          <p style="color:rgba(255,255,255,0.25);font-size:12px;text-align:center;margin:0;">
            이 이메일은 Kverse에서 자동 발송됐어요.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

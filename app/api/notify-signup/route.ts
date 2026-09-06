import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTelegram } from '@/lib/telegram'

// 가입 알림.
//
// 이 라우트가 무인증으로 열려 있었다. 저장소가 공개라 주소도 함께 공개돼
// 있어서, 누구나 가짜 가입 알림을 운영자 텔레그램에 쏟아부을 수 있었다.
//
// 가입 직후에는 이미 세션이 있다(이메일 인증이 꺼져 있어 signUp이 세션을
// 바로 준다). 그 토큰을 확인한다. 세션이 없으면 알림만 건너뛰고, 가입
// 자체는 이미 끝난 뒤이므로 사용자 흐름에는 영향이 없다.
//
// 이름·이메일은 요청 값이 아니라 토큰이 가리키는 계정에서 읽는다. 요청
// 값을 믿으면 로그인한 사람이 아무 이름이나 적어 보낼 수 있다.

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const meta = (user.user_metadata ?? {}) as { name?: string; role?: string; agency_name?: string }
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const time = kst.toISOString().replace('T', ' ').slice(0, 16)
  const roleLabel = meta.role === 'agency' ? '기획사' : '탤런트'

  await notifyTelegram([
    '🔔 새 회원가입 - Krookie',
    `이름: ${meta.name ?? '(없음)'}`,
    `이메일: ${user.email ?? '(없음)'}`,
    `역할: ${roleLabel}`,
    meta.agency_name ? `기획사명: ${meta.agency_name}` : null,
    `시간: ${time} KST`,
  ].filter(Boolean).join('\n'))

  return NextResponse.json({ ok: true })
}

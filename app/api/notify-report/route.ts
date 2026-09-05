import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTelegram } from '@/lib/telegram'

// 신고가 들어오면 운영자에게 즉시 알린다.
//
// 신고는 `reports` 테이블에 쌓이고 어드민 화면도 있지만, 그 화면을 열어봐야만
// 알 수 있었다. 신고를 며칠 방치하는 건 안전 문제이자 앱 심사 문제다
// (Apple Guideline 1.2). 대시보드 배너로도 보이게 했지만, 대시보드조차
// 안 여는 날이 있으므로 밀어서 알려야 한다.
//
// 로그인 사용자만 부를 수 있게 막는다. 열어두면 아무나 운영자 텔레그램으로
// 가짜 신고 알림을 쏟아부을 수 있다.

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { targetType, reason } = await req.json().catch(() => ({}))

  // 신고 내용은 그대로 옮기지 않는다. 알림은 "가서 보라"는 신호면 충분하고,
  // 신고 본문에는 남의 개인정보가 섞여 들어올 수 있다.
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const time = kst.toISOString().replace('T', ' ').slice(0, 16)
  const kind = targetType === 'video' ? '영상'
    : targetType === 'message' ? '채팅'
    : targetType === 'profile' ? '프로필'
    : '기타'

  await notifyTelegram([
    '🚩 신고 접수 - Krookie',
    `대상: ${kind}`,
    `사유: ${typeof reason === 'string' ? reason.slice(0, 60) : '미기재'}`,
    `시간: ${time} KST`,
    '',
    'https://kpick.app/admin/reports',
  ].join('\n'))

  return NextResponse.json({ ok: true })
}

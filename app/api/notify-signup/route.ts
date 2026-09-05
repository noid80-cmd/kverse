import { NextResponse } from 'next/server'
import { notifyTelegram } from '@/lib/telegram'


export async function POST(req: Request) {
  const { name, email, role, agency_name } = await req.json()

  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const time = kst.toISOString().replace('T', ' ').slice(0, 16)

  const roleLabel = role === 'agency' ? '기획사' : '탤런트'

  const text = [
    '🔔 새 회원가입 - Krookie',
    `이름: ${name}`,
    `이메일: ${email}`,
    `역할: ${roleLabel}`,
    agency_name ? `기획사명: ${agency_name}` : null,
    `시간: ${time} KST`,
  ].filter(Boolean).join('\n')

  await notifyTelegram(text)

  return NextResponse.json({ ok: true })
}

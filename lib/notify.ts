'use client'

import { createClient } from './supabase/client'
import type { PushKey } from './i18n/push'

// /api/push는 Authorization 헤더로 로그인 사용자를 확인한다. 호출부마다
// 헤더를 직접 붙이다 보니 11곳 중 7곳에서 빠져 있었고, 전부 결과를 안 보는
// fetch라 401이 나도 아무 흔적 없이 알림만 조용히 사라졌다(지원 알림 포함).
// 발송 경로를 여기 하나로 모아 헤더를 빠뜨릴 수 없게 한다.

type PushArgs = {
  userId?: string
  // 기획사 담당자 전원에게 보낼 때 쓴다. 담당자가 누구인지는 서버가 찾는다 —
  // agency_members는 RLS상 talent에게 빈 배열로 보여서 클라이언트가 찾으면 안 된다.
  agencyId?: string
  auditionId?: string
  broadcast?: boolean
  // 지망생에게 가는 알림은 문구를 여기서 만들지 않는다. 받는 사람의 언어는
  // 서버만 알기 때문에(profiles.lang), 키와 값만 넘기고 문장은 서버가 만든다.
  msgKey?: PushKey
  params?: Record<string, string | number>
  // 사용자가 쓴 글(채팅 내용, 공지)처럼 번역할 수 없는 문구는 그대로 넘긴다
  title?: string
  body?: string
  url?: string
}

export async function sendPush(args: PushArgs): Promise<void> {
  try {
    const { data } = await createClient().auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      console.warn('[push] 세션이 없어 발송하지 않음:', args.msgKey ?? args.title)
      return
    }
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(args),
    })
    if (!res.ok) {
      // 조용한 실패가 이 버그를 오래 못 찾게 만들었다. 최소한 콘솔에는 남긴다.
      console.warn('[push] 발송 실패', res.status, args.msgKey ?? args.title)
    }
  } catch (err) {
    console.warn('[push] 발송 오류', err)
  }
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'

// 하단 탭 위에 뜨는 숫자.
//
// 알림은 한 번 지나가면 끝인데, 앱을 열었을 때 "뭐가 새로 생겼는지" 알 방법이
// 지금까지 없었다. 특히 10/1에 지원이 몰리면 기획사가 새 지원자를 놓친다.
//
// 숫자는 "내가 해야 할 일"만 센다. 읽었는지 여부를 저장소에 따로 관리하기
// 시작하면 기기마다 어긋나고 금방 신뢰를 잃는다. 안 읽은 메시지, 응답 안 한
// 제안, 아직 심사 안 한 지원자 — 전부 서버에 상태가 남아 있어 어느 기기에서
// 봐도 같은 숫자가 나온다.

export type NavBadges = {
  /** 안 읽은 메시지 (양쪽 공통) */
  chats: number
  /** 아직 응답하지 않은 오디션 제안 (지망생) */
  offers: number
  /** 아직 심사하지 않은 지원자 (기획사) */
  applicants: number
}

const EMPTY: NavBadges = { chats: 0, offers: 0, applicants: 0 }

async function countUnreadMessages(
  supabase: ReturnType<typeof createClient>, myId: string,
): Promise<number> {
  // conversations는 RLS가 내 것만 돌려준다.
  const { data: convs } = await supabase.from('conversations').select('id')
  const ids = (convs ?? []).map(c => c.id as string)
  if (ids.length === 0) return 0

  const { count } = await supabase
    .from('messages').select('*', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', myId)
    .eq('is_read', false)
  return count ?? 0
}

export function useNavBadges(role: 'talent' | 'agency'): NavBadges {
  const [badges, setBadges] = useState<NavBadges>(EMPTY)

  useEffect(() => {
    let alive = true
    const supabase = createClient()

    async function load() {
      try {
        const user = (await supabase.auth.getSession()).data.session?.user
        if (!user) return

        const chats = await countUnreadMessages(supabase, user.id)
        let offers = 0
        let applicants = 0

        if (role === 'talent') {
          const { count } = await supabase
            .from('audition_offers').select('*', { count: 'exact', head: true })
            .eq('talent_id', user.id).eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
          offers = count ?? 0
        } else {
          const { data: am } = await supabase
            .from('agency_members').select('agency_id').eq('profile_id', user.id).maybeSingle()
          if (am?.agency_id) {
            const { data: mine } = await supabase
              .from('auditions').select('id').eq('agency_id', am.agency_id)
            const ids = (mine ?? []).map(a => a.id as string)
            if (ids.length > 0) {
              const { count } = await supabase
                .from('audition_applications').select('*', { count: 'exact', head: true })
                .in('audition_id', ids).eq('status', 'pending')
              applicants = count ?? 0
            }
          }
        }

        if (alive) setBadges({ chats, offers, applicants })
      } catch {
        // 숫자를 못 세는 건 화면을 깨뜨릴 일이 아니다. 조용히 0으로 둔다.
      }
    }

    load()
    // 화면을 다시 볼 때 갱신한다. 폴링은 하지 않는다 — 무료 플랜에서
    // 탭 하나 때문에 쿼리를 계속 때릴 이유가 없다.
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [role])

  return badges
}

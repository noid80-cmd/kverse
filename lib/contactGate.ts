import type { SupabaseClient } from '@supabase/supabase-js'

// 기획사가 지망생에게 "접촉"할 자격이 있는지 판정한다.
//
// 접촉이란 채팅을 열거나 자기소개 전문(=사실상 외부 연락처)을 보는 것을 말한다.
// 심사에 필요한 것 — 영상, 이름, 나이, 카테고리, 스킬 — 은 자격과 무관하게
// 항상 보인다. 판단을 막는 게 목적이 아니라 접촉을 기록하는 게 목적이기 때문에,
// 덜 보여주면 오히려 확신이 안 서서 1차 합격을 안 누른다.
//
// 자격은 오디션을 통해서만 생긴다. 이렇게 해야 모든 접촉이 오디션 맥락 안에
// 들어와서 회차별로 집계되고, 결과 확정도 회차 단위로 떨어진다.
//
// 규칙을 경로가 아니라 "기획사 × 지망생" 단위로 건다는 게 핵심이다. 경로마다
// 막으면 피드로 들어오든 오디션으로 들어오든 계속 새 구멍이 생긴다.

export type ContactAccess = {
  allowed: boolean
  reason: 'existing_conversation' | 'audition_passed' | 'locked'
}

const LOCKED: ContactAccess = { allowed: false, reason: 'locked' }

export async function checkContactAccess(
  supabase: SupabaseClient,
  opts: { agencyMemberId: string; agencyId: string | null; talentId: string },
): Promise<ContactAccess> {
  const { agencyMemberId, agencyId, talentId } = opts
  if (!agencyMemberId || !talentId) return LOCKED

  try {
    // 이미 열려 있는 대화는 그대로 통과시킨다. 게이트를 소급 적용해서 진행 중인
    // 관계를 끊으면 기획사가 이탈한다 — 잃는 게 얻는 것보다 크다.
    const { data: conv } = await supabase
      .from('conversations').select('id')
      .eq('agency_member_id', agencyMemberId).eq('talent_id', talentId)
      .limit(1).maybeSingle()
    if (conv) return { allowed: true, reason: 'existing_conversation' }

    if (!agencyId) return LOCKED

    // audition_applications ↔ auditions에 FK가 걸려 있다는 보장이 없어서
    // PostgREST 임베드 대신 두 번에 나눠 조회한다.
    const { data: mine } = await supabase
      .from('auditions').select('id').eq('agency_id', agencyId)
    const auditionIds = (mine ?? []).map(a => a.id as string)
    if (auditionIds.length === 0) return LOCKED

    const { data: passed } = await supabase
      .from('audition_applications').select('id')
      .eq('talent_id', talentId).eq('status', 'invited')
      .in('audition_id', auditionIds)
      .limit(1).maybeSingle()

    return passed ? { allowed: true, reason: 'audition_passed' } : LOCKED
  } catch {
    // 조회가 실패하면 잠근다. 잘못 열면 연락처가 새고 기록이 남지 않는데,
    // 잘못 잠그면 기획사가 한 번 불편할 뿐이라 복구가 된다.
    return LOCKED
  }
}

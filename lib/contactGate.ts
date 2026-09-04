import type { SupabaseClient } from '@supabase/supabase-js'

// 기획사가 지망생에게 "접촉"할 자격이 있는지 판정한다.
//
// 접촉이란 채팅을 열거나 자기소개 전문(=사실상 외부 연락처)을 보는 것을 말한다.
// 심사에 필요한 것 — 영상, 이름, 나이, 카테고리, 스킬 — 은 자격과 무관하게
// 항상 보인다. 판단을 막는 게 목적이 아니라 접촉을 기록하는 게 목적이기 때문에,
// 덜 보여주면 오히려 확신이 안 서서 1차 합격을 안 누른다.
//
// 자격은 두 가지로만 생긴다.
//   1) 오디션에 지원한 사람을 1차 합격시켰다 (회차 경로)
//   2) 피드에서 발견해 보낸 오디션 제안을 지망생이 수락했다 (상시 경로)
// 둘 다 기록이 남고, 맥락이 달라서 집계도 따로 된다. 피드 경로가 없으면
// 기획사는 좋은 사람을 발견해도 다음 공고까지 기다려야 하고, 그러면 인스타로 샌다.
//
// 규칙을 경로가 아니라 "기획사 × 지망생" 단위로 건다는 게 핵심이다. 경로마다
// 막으면 피드로 들어오든 오디션으로 들어오든 계속 새 구멍이 생긴다.

export type ContactAccess = {
  allowed: boolean
  reason: 'existing_conversation' | 'audition_passed' | 'offer_accepted' | 'locked'
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

    const { data: passed } = auditionIds.length === 0 ? { data: null } : await supabase
      .from('audition_applications').select('id')
      .eq('talent_id', talentId).eq('status', 'invited')
      .in('audition_id', auditionIds)
      .limit(1).maybeSingle()

    if (passed) return { allowed: true, reason: 'audition_passed' }

    const { data: accepted } = await supabase
      .from('audition_offers').select('id')
      .eq('agency_member_id', agencyMemberId).eq('talent_id', talentId)
      .eq('status', 'accepted')
      .limit(1).maybeSingle()

    return accepted ? { allowed: true, reason: 'offer_accepted' } : LOCKED
  } catch {
    // 조회가 실패하면 잠근다. 잘못 열면 연락처가 새고 기록이 남지 않는데,
    // 잘못 잠그면 기획사가 한 번 불편할 뿐이라 복구가 된다.
    return LOCKED
  }
}

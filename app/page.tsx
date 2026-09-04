import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import LandingClient, { type LiveStats } from './LandingClient'

export const metadata: Metadata = {
  title: 'Krookie — 매주 새로운 오디션에 지원하세요',
  description: '기획사가 직접 여는 온라인 오디션. 갖고 있는 영상 하나로 지원하고 결과는 앱에서 받아보세요.',
  openGraph: {
    title: 'Krookie — 매주 새로운 오디션에 지원하세요',
    description: '기획사가 직접 여는 온라인 오디션. 영상 하나로 지원하세요.',
    url: 'https://kpick.app',
  },
}

// 실적은 자주 바뀌지 않는다. 랜딩은 첫인상이라 빨라야 하므로 5분 캐시.
export const revalidate = 300

// 지금까지 랜딩의 신뢰 문구가 코드에 박혀 있었다. 오디션을 서른 번 열어도
// 보여줄 게 안 늘어난다는 뜻이고, 지망생 유입의 근거가 거기서 멈춘다.
//
// 값을 못 가져오면(테이블이 비었거나 RLS에 막히거나) null을 넘긴다.
// 클라이언트가 기존 문구로 떨어지므로 아무것도 후퇴하지 않는다.
async function getLiveStats(): Promise<LiveStats> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return {}

  const supabase = createClient(url, key)
  const stats: LiveStats = {}

  try {
    const { data } = await supabase
      .from('success_stories')
      .select('agency_name')
      .eq('is_public', true)
      .order('happened_on', { ascending: false })
      .limit(200)

    if (data && data.length > 0) {
      // 기획사 이름이 붙어야 신뢰가 생긴다. "합격자 5명"보다 "FNC 합격자 2명"이
      // 훨씬 세다. 그래서 가장 많이 배출한 곳 하나를 골라 이름과 함께 쓴다.
      const byAgency = new Map<string, number>()
      for (const row of data) {
        const name = (row.agency_name as string) ?? ''
        if (name) byAgency.set(name, (byAgency.get(name) ?? 0) + 1)
      }
      const top = [...byAgency.entries()].sort((a, b) => b[1] - a[1])[0]
      if (top) { stats.topAgency = top[0]; stats.topAgencyCount = top[1] }
    }
  } catch { /* 기존 문구로 떨어진다 */ }

  try {
    // "참여 기획사"의 기준을 공고를 한 번이라도 올린 곳으로 잡는다.
    // 초대만 받고 활동하지 않는 곳까지 세면 숫자가 정직하지 않다.
    const { data } = await supabase.from('auditions').select('agency_id').not('agency_id', 'is', null)
    if (data && data.length > 0) {
      stats.activeAgencies = new Set(data.map(a => a.agency_id as string)).size
    }
  } catch { /* 기존 문구로 떨어진다 */ }

  return stats
}

export default async function LandingPage() {
  const stats = await getLiveStats()
  return <LandingClient stats={stats} />
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { daysUntilLaunch, roundOpensAt, roundDeadline, currentRoundNo, roundClosesAt } from '@/lib/launch'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

// 오디션은 매주 한 곳씩 순서대로 열린다 — 월요일 저녁 6시에 열려 그 주
// 일요일 저녁 9시에 닫는다(1회차만 10/1 목요일에 열어 10/11에 닫는다).
// 그 리듬이 제품의 정체다.
//
// 처음엔 달력처럼 매주 일요일을 기계적으로 찍었는데, 그러면 존재하지 않는
// 회차까지 줄이 생기고(9/28–10/4와 10/1–10/11이 겹쳤다) 무엇보다 목록이
// 메모장처럼 보였다. 회차는 날짜가 아니라 순번이다.
//
// 그 다음 판이 표였다. 회차·기간·상태를 같은 무게로 줄 세우니 눈이 멈출 곳이
// 없어 공지사항처럼 읽혔다. 지금은 선 하나로 잇는다 — 지나온 회차, 지금,
// 앞으로. 같은 정보인데 읽는 방향이 생긴다.
//
// 아직 순번이 안 잡힌 회차는 비워두지 않고 로고 실루엣으로 표시한다.
// 빈 칸은 서비스가 멈춘 것처럼 보이지만, 실루엣은 아직 안 밝힌 것으로 읽힌다.
// 없는 기획사 이름을 지어내지는 않는다 — 확정된 회차만 이름이 나온다.

type Round = { deadline: string; title: string; status: string; agencyName: string | null; logo: string | null }

const KST = 9 * 3600_000

function md(t: number): string {
  const d = new Date(t + KST)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export default function AuditionSchedule({
  compact = false, limit = 5, skipDeadline,
}: {
  compact?: boolean
  /** 몇 회차까지 보여줄지. 화면 위에 히어로가 있으면 짧게 — 다섯 줄이 전부
   *  "준비 중"이면 준비 중이 주인공이 된다. */
  limit?: number
  /** 이미 다른 곳(히어로)에 크게 나온 회차는 빼고 센다. */
  skipDeadline?: string | null
}) {
  const { lang } = useLang()
  const tx = useT(lang)
  const [rounds, setRounds] = useState<Round[]>([])
  const [loaded, setLoaded] = useState(false)

  // 히어로가 이번 회차를 이미 보여주고 있으면 그 다음 회차부터 센다.
  // 그렇지 않으면 지난 회차 하나를 같이 보여준다 — 방금 끝난 게 뭐였는지가
  // 다음 회차의 근거이고, 앱이 실제로 돌고 있다는 증거다.
  const cur = currentRoundNo()
  const startNo = skipDeadline ? cur + 1 : Math.max(1, cur - 1)
  const numbers = Array.from({ length: limit }, (_, i) => startNo + i)
  const first = numbers[0]
  const last = numbers[numbers.length - 1]

  useEffect(() => {
    const supabase = createClient()
    supabase.from('auditions')
      .select('deadline, title, status, agency:agencies(name, logo_url)')
      .not('deadline', 'is', null)
      .gte('deadline', roundDeadline(first))
      .lte('deadline', roundDeadline(last))
      // 확정된 회차만 내보낸다. 신청(requested)은 조율이 깨지면 없던 일이 되고,
      // 멈춰둔 것(paused)은 열릴지 아직 모른다.
      .in('status', ['scheduled', 'active', 'closed'])
      .then(({ data }) => {
        setRounds((data ?? []).map(r => {
          const ag = (r as unknown as { agency?: { name?: string; logo_url?: string } }).agency
          return {
            deadline: r.deadline as string,
            title: (r.title as string) ?? tx.schedule.audition,
            status: (r.status as string) ?? 'active',
            agencyName: ag?.name ?? null,
            logo: ag?.logo_url ?? null,
          }
        }))
        setLoaded(true)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, last])

  const daysLeft = daysUntilLaunch()
  const now = Date.now()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 12px' }}>
        <span style={{ fontSize: 14.5, fontWeight: 900, color: '#241C15', letterSpacing: -0.2 }}>
          {skipDeadline ? tx.auditions.nextRounds : tx.schedule.title}
        </span>
        {/* 카운트다운은 화면에 한 번만 나온다. 위 히어로가 이미 세고 있으면
            여기서는 말하지 않는다 — 같은 말을 두 번 하면 둘 다 약해진다. */}
        {!skipDeadline && daysLeft >= 0 && (
          <span style={{ fontSize: 12.5, color: '#8A7F6E', fontWeight: 700 }}>D-{daysLeft}</span>
        )}
      </div>

      <div style={{ position: 'relative', paddingLeft: 30 }}>
        {/* 회차를 잇는 선 */}
        <div style={{
          position: 'absolute', left: 9, top: 16, bottom: 18, width: 2, background: 'rgba(36,28,21,0.1)',
        }} />

        {numbers.map(no => {
          const deadline = roundDeadline(no)
          const opensAt = roundOpensAt(deadline).getTime()
          const closesAt = roundClosesAt(deadline).getTime()
          const round = rounds.find(r => r.deadline === deadline)
          // 공고가 있으면 상태를 따른다. 시계로만 판단하면 [지금 열기]로 앞당겼을 때
          // 목록에는 "지원하기"가 뜨는데 일정표는 "예정"이라고 말한다 — 보는 사람은
          // 뭐가 맞는지 알 수 없다. 상태가 진실이고, 시계는 공고가 아직 없는
          // 회차에만 쓴다.
          const past = round ? round.status === 'closed' || now > closesAt : now > closesAt
          const live = !past && (round ? round.status === 'active' : now >= opensAt)
          const initials = (round?.agencyName ?? '').slice(0, 2)

          return (
            <div key={no} style={{ position: 'relative', marginBottom: 2 }}>
              {/* 노드 — 지금 회차만 크고 색이 있다 */}
              <div style={{
                position: 'absolute',
                left: live ? -25 : -22, top: live ? 13 : 17,
                width: live ? 16 : 10, height: live ? 16 : 10, borderRadius: '50%',
                background: live ? '#FF6F3C' : past ? 'rgba(36,28,21,0.22)' : '#FFF8E7',
                border: live ? '3px solid #FFF8E7' : `2px solid ${past ? 'rgba(36,28,21,0.22)' : 'rgba(36,28,21,0.18)'}`,
                boxShadow: live ? '0 0 0 3px rgba(255,111,60,0.28)' : 'none',
              }} />

              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0',
              }}>
                {/* 날짜 폭은 가장 긴 조합("10/19–10/25")이 한 줄에 들어가야 한다.
                    78px에서는 그 한 회차만 두 줄로 접혀 줄이 어긋나 보였다. */}
                <div style={{ width: 90, flexShrink: 0 }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 800, letterSpacing: 0.2, marginBottom: 1,
                    color: live ? '#D84A1E' : past ? '#B0A89C' : '#8A7F6E',
                  }}>
                    {tx.schedule.round.replace('{n}', String(no))}
                  </div>
                  <div style={{
                    fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap',
                    color: past ? '#B0A89C' : live ? '#D84A1E' : '#241C15',
                  }}>
                    {md(opensAt)}–{md(closesAt)}
                  </div>
                </div>

                {/* 기획사 — 확정 전에는 실루엣으로 둔다 */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0, overflow: 'hidden', position: 'relative',
                    background: round ? (round.logo ? '#FFFFFF' : 'rgba(255,111,60,0.12)') : 'rgba(36,28,21,0.06)',
                    border: round ? '1px solid rgba(36,28,21,0.08)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: past ? 0.55 : 1,
                  }}>
                    {round
                      ? (round.logo
                        ? <img src={round.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: 10.5, fontWeight: 900, color: '#D84A1E' }}>{initials}</span>)
                      : <span style={{
                        position: 'absolute', inset: 7, borderRadius: '50%', background: 'rgba(36,28,21,0.13)',
                      }} />}
                  </div>
                  {round ? (
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13.5, fontWeight: 800, color: past ? '#8A7F6E' : '#241C15',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{round.agencyName ?? round.title}</div>
                      {round.agencyName && !compact && (
                        <div style={{
                          fontSize: 11.5, color: '#8A7F6E', marginTop: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{round.title}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'rgba(36,28,21,0.34)', fontWeight: 600 }}>
                      {loaded ? tx.schedule.preparing : ' '}
                    </div>
                  )}
                </div>

                {round && (past || live) && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 7, flexShrink: 0,
                    background: past ? 'rgba(36,28,21,0.05)' : 'rgba(34,197,94,0.13)',
                    color: past ? '#A69C8E' : '#16a34a',
                  }}>{past ? tx.schedule.closed : tx.schedule.live}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { daysUntilLaunch, roundOpensAt, roundDeadline, currentRoundNo } from '@/lib/launch'

// 오디션은 매주 한 곳씩 순서대로 열린다 — 월요일 저녁 6시에 열려 그 주
// 일요일 밤 11시 59분에 닫는다(1회차만 10/1 목요일에 열어 10/11에 닫는다).
// 그 리듬이 제품의 정체다.
//
// 처음엔 달력처럼 매주 일요일을 기계적으로 찍었는데, 그러면 존재하지 않는
// 회차까지 줄이 생기고(9/28–10/4와 10/1–10/11이 겹쳤다) 무엇보다 목록이
// 메모장처럼 보였다. 회차는 날짜가 아니라 순번이다. 1회차부터 세고, 각 줄이
// 곧 "누가 언제"를 말하게 한다.
//
// 아직 순번이 안 잡힌 회차는 비워두지 않고 "공고 준비 중"으로 표시한다.
// 빈 칸은 서비스가 멈춘 것처럼 보이지만, 준비 중은 주기가 돌고 있다는 뜻이다.
// 없는 기획사 이름을 지어내지는 않는다 — 확정된 회차만 이름이 나온다.

const ROUNDS_SHOWN = 5

type Round = { deadline: string; title: string; status: string; agencyName: string | null; logo: string | null }

const KST = 9 * 3600_000

function md(t: number): string {
  const d = new Date(t + KST)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export default function AuditionSchedule({ compact = false }: { compact?: boolean }) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loaded, setLoaded] = useState(false)

  // 지난 회차 하나를 같이 보여준다. 방금 끝난 게 뭐였는지가 다음 회차의 근거다.
  const startNo = Math.max(1, currentRoundNo() - 1)
  const numbers = Array.from({ length: ROUNDS_SHOWN }, (_, i) => startNo + i)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('auditions')
      .select('deadline, title, status, agency:agencies(name, logo_url)')
      .not('deadline', 'is', null)
      .gte('deadline', roundDeadline(numbers[0]))
      .lte('deadline', roundDeadline(numbers[numbers.length - 1]))
      // 확정된 회차만 내보낸다. 신청(requested)은 조율이 깨지면 없던 일이 되고,
      // 멈춰둔 것(paused)은 열릴지 아직 모른다.
      .in('status', ['scheduled', 'active', 'closed'])
      .then(({ data }) => {
        setRounds((data ?? []).map(r => {
          const ag = (r as unknown as { agency?: { name?: string; logo_url?: string } }).agency
          return {
            deadline: r.deadline as string,
            title: (r.title as string) ?? '오디션',
            status: (r.status as string) ?? 'active',
            agencyName: ag?.name ?? null,
            logo: ag?.logo_url ?? null,
          }
        }))
        setLoaded(true)
      })
    // numbers는 렌더마다 같은 값이라 의존성에 넣지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const daysLeft = daysUntilLaunch()
  const now = Date.now()

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
      border: '1px solid rgba(36,28,21,0.08)',
    }}>
      <div style={{
        padding: compact ? '16px 18px 14px' : '18px 20px 16px',
        borderBottom: '1px solid rgba(36,28,21,0.06)',
        background: 'linear-gradient(135deg, rgba(255,111,60,0.07), rgba(255,111,60,0.02))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <CalendarDays size={17} strokeWidth={2} color="#D84A1E" />
          <span style={{ fontSize: 15.5, fontWeight: 900, color: '#241C15', letterSpacing: -0.2 }}>오디션 일정</span>
          {daysLeft > 0 && (
            <span style={{
              marginLeft: 'auto', fontSize: 11.5, fontWeight: 800, color: '#D84A1E',
              background: 'rgba(216,74,30,0.1)', padding: '3px 9px', borderRadius: 8,
            }}>D-{daysLeft}</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: '#8A7F6E', lineHeight: 1.55 }}>
          매주 한 곳씩 · 월요일 저녁 6시 오픈 → 일요일 밤 마감
        </div>
      </div>

      <div style={{ padding: '6px 0' }}>
        {numbers.map(no => {
          const deadline = roundDeadline(no)
          const opensAt = roundOpensAt(deadline).getTime()
          const closesAt = new Date(`${deadline}T23:59:59+09:00`).getTime()
          const round = rounds.find(r => r.deadline === deadline)
          // 공고가 있으면 상태를 따른다. 시계로만 판단하면 [지금 열기]로 앞당겼을 때
          // 목록에는 "지원하기"가 뜨는데 일정표는 "예정"이라고 말한다 — 보는 사람은
          // 뭐가 맞는지 알 수 없다. 상태가 진실이고, 시계는 공고가 아직 없는
          // 회차에만 쓴다.
          const past = round ? round.status === 'closed' || now > closesAt : now > closesAt
          const live = !past && (round ? round.status === 'active' : now >= opensAt)

          const initials = (round?.agencyName ?? '').slice(0, 2)

          return (
            <div key={no} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: live ? 'rgba(255,111,60,0.06)' : 'transparent',
              borderLeft: `3px solid ${live ? '#FF6F3C' : 'transparent'}`,
            }}>
              {/* 회차 + 기간 */}
              <div style={{ width: 88, flexShrink: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: 0.2,
                  color: live ? '#D84A1E' : past ? '#B0A89C' : '#8A7F6E', marginBottom: 1,
                }}>
                  {no}회차
                </div>
                <div style={{
                  fontSize: 13.5, fontWeight: 800,
                  color: past ? '#B0A89C' : live ? '#D84A1E' : '#241C15',
                }}>
                  {md(opensAt)}–{md(closesAt)}
                </div>
              </div>

              {/* 기획사 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
                {round ? (
                  <>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0, overflow: 'hidden',
                      background: round.logo ? '#FFFFFF' : 'rgba(255,111,60,0.12)',
                      border: '1px solid rgba(36,28,21,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: past ? 0.55 : 1,
                    }}>
                      {round.logo
                        ? <img src={round.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: 11, fontWeight: 900, color: '#D84A1E' }}>{initials}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13.5, fontWeight: 800, color: past ? '#8A7F6E' : '#241C15',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{round.agencyName ?? round.title}</div>
                      {round.agencyName && (
                        <div style={{
                          fontSize: 11.5, color: '#8A7F6E', marginTop: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{round.title}</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'rgba(36,28,21,0.32)' }}>
                    {loaded ? '공고 준비 중' : ' '}
                  </div>
                )}
              </div>

              {/* 상태 */}
              {round && (
                <span style={{
                  fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 7, flexShrink: 0,
                  background: past ? 'rgba(36,28,21,0.05)' : live ? 'rgba(34,197,94,0.13)' : 'rgba(255,111,60,0.12)',
                  color: past ? '#A69C8E' : live ? '#16a34a' : '#D84A1E',
                }}>{past ? '마감' : live ? '진행 중' : '예정'}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

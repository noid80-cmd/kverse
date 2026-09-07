'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AUDITION_LAUNCH, FIRST_DEADLINE, daysUntilLaunch, roundOpensAt } from '@/lib/launch'

// 오디션은 매주 한 곳씩 순서대로 열린다 — 월요일 저녁 6시에 열려 그 주
// 일요일 밤 11시 59분에 닫는다(첫 회차만 10/1 목요일에 열어 10/11에 닫는다).
// 그 리듬이 제품의 정체인데 화면 어디에도 드러나지 않아서, 처음 온 사람은
// "지금 공고 하나 있네" 이상을 알 수 없었다.
//
// 기획사의 "언제 우리 차례인가"와 지망생의 "다음 주엔 어디가 열리나"는
// 같은 질문이라 화면 하나로 답한다.
//
// 아직 순번이 안 잡힌 주는 비워두지 않고 "공고 준비 중"으로 표시한다.
// 빈 칸은 서비스가 멈춘 것처럼 보이지만, 준비 중은 주기가 돌고 있다는 뜻이다.
// 없는 기획사 이름을 지어내지는 않는다 — 확정된 회차만 이름이 나온다.

const ROUNDS_AHEAD = 4
const ROUNDS_BACK = 1

type Round = { deadline: string; title: string; status: string; agencyName: string | null }

const KST = 9 * 3600_000

function kstParts(t: number) {
  const d = new Date(t + KST)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), dow: d.getUTCDay() }
}

/** 그 시각이 속한 회차의 마감일(그 주 일요일) */
function deadlineOfWeek(t: number): string {
  const { dow } = kstParts(t)
  const toSunday = dow === 0 ? 0 : 7 - dow // 일=0
  const sun = new Date(t + toSunday * 86400_000 + KST)
  return sun.toISOString().slice(0, 10)
}

function md(t: number): string {
  const p = kstParts(t)
  return `${p.m}/${p.d}`
}

export default function AuditionSchedule({ compact = false }: { compact?: boolean }) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loaded, setLoaded] = useState(false)

  // 이번 주 일요일을 기준으로 앞뒤 회차의 마감일을 만든다.
  const baseSunday = deadlineOfWeek(Date.now())
  const deadlines: string[] = []
  for (let i = -ROUNDS_BACK; i <= ROUNDS_AHEAD; i++) {
    const t = new Date(`${baseSunday}T00:00:00+09:00`).getTime() + i * 7 * 86400_000
    deadlines.push(new Date(t + KST).toISOString().slice(0, 10))
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('auditions')
      .select('deadline, title, status, agency:agencies(name)')
      .not('deadline', 'is', null)
      .gte('deadline', deadlines[0])
      .lte('deadline', deadlines[deadlines.length - 1])
      // 신청 단계(requested)는 아직 확정이 아니다. 확정 전에 이름이 뜨면
      // 조율이 깨졌을 때 없던 일이 된다.
      .neq('status', 'requested')
      .then(({ data }) => {
        setRounds((data ?? []).map(r => ({
          deadline: r.deadline as string,
          title: (r.title as string) ?? '오디션',
          status: (r.status as string) ?? 'active',
          agencyName: (r as unknown as { agency?: { name?: string } }).agency?.name ?? null,
        })))
        setLoaded(true)
      })
    // deadlines는 렌더마다 같은 값이라 의존성에 넣지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const daysLeft = daysUntilLaunch()
  const launchTime = new Date(`${AUDITION_LAUNCH}T00:00:00+09:00`).getTime()
  const now = Date.now()

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 18, padding: compact ? '16px 16px 10px' : '20px 20px 12px',
      border: '1px solid rgba(36,28,21,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <CalendarDays size={17} strokeWidth={1.9} color="#D84A1E" />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#241C15' }}>오디션 일정</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#8A7F6E', marginBottom: 14, lineHeight: 1.6 }}>
        매주 한 곳씩, 월요일 저녁 6시에 열려 일요일 밤에 마감돼요
        {daysLeft > 0 && ` · 첫 오디션까지 D-${daysLeft}`}
      </div>

      <div>
        {deadlines.map(deadline => {
          const opensAt = roundOpensAt(deadline).getTime()
          const closesAt = new Date(`${deadline}T23:59:59+09:00`).getTime()
          const round = rounds.find(r => r.deadline === deadline)
          const name = round?.agencyName ?? round?.title
          const isFirst = deadline === FIRST_DEADLINE
          const live = now >= opensAt && now <= closesAt
          const past = now > closesAt
          const beforeLaunch = closesAt < launchTime

          return (
            <div key={deadline} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px', borderRadius: 12, marginBottom: 6,
              background: live ? 'rgba(255,111,60,0.08)' : 'transparent',
              border: live ? '1px solid rgba(255,111,60,0.22)' : '1px solid transparent',
            }}>
              <div style={{ width: 82, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: live ? '#D84A1E' : past ? '#8A7F6E' : '#241C15' }}>
                  {md(opensAt)}–{md(closesAt)}
                </div>
                {isFirst && <div style={{ fontSize: 10.5, color: '#D84A1E', fontWeight: 700 }}>첫 오디션</div>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {name ? (
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: past ? '#8A7F6E' : '#241C15',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{name}</div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'rgba(36,28,21,0.35)' }}>
                    {!loaded ? ' ' : beforeLaunch ? '오픈 전' : '공고 준비 중'}
                  </div>
                )}
              </div>

              {name && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, flexShrink: 0,
                  background: past ? 'rgba(36,28,21,0.06)' : live ? 'rgba(34,197,94,0.12)' : 'rgba(255,111,60,0.12)',
                  color: past ? '#8A7F6E' : live ? '#16a34a' : '#D84A1E',
                }}>{past ? '마감' : live ? '진행 중' : '예정'}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

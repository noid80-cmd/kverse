'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AUDITION_LAUNCH, daysUntilLaunch } from '@/lib/launch'

// 오디션은 매주 한 곳씩 순서대로 열린다. 그 리듬이 제품의 정체인데, 화면
// 어디에도 드러나지 않아서 처음 온 사람은 "지금 공고 하나 있네" 이상을
// 알 수 없었다. 기획사에게는 "언제 우리 차례인가", 지망생에게는 "다음 주엔
// 어디가 열리나"가 같은 질문이고, 둘 다 이 한 화면으로 답한다.
//
// 아직 순번이 안 잡힌 주는 비워두지 않고 "준비 중"으로 표시한다. 빈 칸은
// 서비스가 멈춘 것처럼 보이지만, 준비 중은 주기가 돌고 있다는 뜻이다.
// 없는 기획사 이름을 지어내지는 않는다 — 확정된 회차만 이름이 나온다.

const WEEKS_AHEAD = 5
const WEEKS_BACK = 1

type Round = { deadline: string; title: string; status: string; agencyName: string | null }

/** 한국 시간 기준 자정 */
function kstMidnight(d: Date): Date {
  const shifted = new Date(d.getTime() + 9 * 3600_000)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 9 * 3600_000)
}

/** 그 날짜가 속한 주의 월요일 (한국 기준) */
function weekStart(d: Date): Date {
  const mid = kstMidnight(d)
  const shifted = new Date(mid.getTime() + 9 * 3600_000)
  const dow = (shifted.getUTCDay() + 6) % 7 // 월=0
  return new Date(mid.getTime() - dow * 86400_000)
}

function ymd(d: Date): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
}

function label(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600_000)
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()}`
}

export default function AuditionSchedule({ compact = false }: { compact?: boolean }) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const from = ymd(new Date(weekStart(new Date()).getTime() - WEEKS_BACK * 7 * 86400_000))
    const to = ymd(new Date(weekStart(new Date()).getTime() + (WEEKS_AHEAD + 1) * 7 * 86400_000))

    supabase.from('auditions')
      .select('deadline, title, status, agency:agencies(name)')
      .not('deadline', 'is', null)
      .gte('deadline', from)
      .lte('deadline', to)
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
  }, [])

  const thisWeek = weekStart(new Date())
  const launchWeek = weekStart(new Date(`${AUDITION_LAUNCH}T00:00:00+09:00`))
  const daysLeft = daysUntilLaunch()

  const weeks = Array.from({ length: WEEKS_BACK + 1 + WEEKS_AHEAD }, (_, i) => {
    const start = new Date(thisWeek.getTime() + (i - WEEKS_BACK) * 7 * 86400_000)
    const end = new Date(start.getTime() + 6 * 86400_000)
    const round = rounds.find(r => {
      const t = new Date(`${r.deadline}T00:00:00+09:00`).getTime()
      return t >= start.getTime() && t <= end.getTime() + 86400_000 - 1
    })
    return { start, end, round, isNow: start.getTime() === thisWeek.getTime(), beforeLaunch: end.getTime() < launchWeek.getTime() }
  })

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 18, padding: compact ? '16px 16px 8px' : '20px 20px 10px',
      border: '1px solid rgba(36,28,21,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <CalendarDays size={17} strokeWidth={1.9} color="#D84A1E" />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#241C15' }}>오디션 일정</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#8A7F6E', marginBottom: 14, lineHeight: 1.6 }}>
        매주 한 곳씩 순서대로 열려요
        {daysLeft > 0 && ` · 첫 오디션까지 D-${daysLeft}`}
      </div>

      <div>
        {weeks.map((w, i) => {
          const closed = w.round?.status === 'closed'
          const name = w.round?.agencyName ?? w.round?.title
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px', borderRadius: 12, marginBottom: 6,
              background: w.isNow ? 'rgba(255,111,60,0.08)' : 'transparent',
              border: w.isNow ? '1px solid rgba(255,111,60,0.22)' : '1px solid transparent',
            }}>
              <div style={{ width: 74, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: w.isNow ? '#D84A1E' : '#241C15' }}>
                  {label(w.start)}–{label(w.end)}
                </div>
                {w.isNow && <div style={{ fontSize: 10.5, color: '#D84A1E', fontWeight: 700 }}>이번 주</div>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {name ? (
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: closed ? '#8A7F6E' : '#241C15',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{name}</div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'rgba(36,28,21,0.35)' }}>
                    {!loaded ? ' ' : w.beforeLaunch ? '오픈 전' : '공고 준비 중'}
                  </div>
                )}
              </div>

              {name && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, flexShrink: 0,
                  background: closed ? 'rgba(36,28,21,0.06)' : 'rgba(34,197,94,0.12)',
                  color: closed ? '#8A7F6E' : '#16a34a',
                }}>{closed ? '마감' : '진행 중'}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

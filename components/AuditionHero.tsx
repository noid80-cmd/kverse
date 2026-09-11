'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { roundClosesAt, roundNoOf, CLOSE_HOUR_KST } from '@/lib/launch'
import { agencyName, agencyInitials } from '@/lib/agencyName'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

// 이번 회차 하나를 화면 맨 위에 세운다.
//
// 예전 화면은 일정표가 먼저 나오고 공고 카드가 그 아래였다. 그러면 화면에서
// 가장 굵은 글씨가 "10/1–10/11"이 되는데, 지망생이 앱을 다시 여는 이유는
// 날짜가 아니라 "이번 주는 어디가 열렸나"다. 주인공을 바꾼다.
//
// 마감도 날짜 대신 시계로 보여준다. "10/11"은 달력을 떠올려야 알지만
// "7일 14시간"은 그 자리에서 등을 민다. 일요일 저녁 9시 마감이라는 규칙이
// 그제야 손에 잡힌다.

type HeroAudition = {
  id: string
  title: string
  deadline: string | null
  mode: 'online' | 'offline' | 'both' | null
  agency: { name: string; name_en?: string | null; is_verified: boolean; logo_url: string | null } | null
}

function twoDigit(n: number) {
  return String(Math.max(0, n)).padStart(2, '0')
}

/** "10/11 (일) 21:00" — 마감 시각은 매주 같아서 lib/launch 값에서 온다. */
function closeLabel(deadline: string, lang: string): string {
  const at = roundClosesAt(deadline)
  const hh = `${String(CLOSE_HOUR_KST).padStart(2, '0')}:00`
  try {
    const f = new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : lang, {
      month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul',
    }).format(at)
    return `${f} ${hh}`
  } catch {
    return `${deadline} ${hh}`
  }
}

export default function AuditionHero({
  audition, appStatus, onApply,
}: {
  audition: HeroAudition
  appStatus?: string
  onApply: () => void
}) {
  const { lang } = useLang()
  const tx = useT(lang)

  // 남은 시간은 서버와 브라우저의 시각이 달라 hydration 경고가 나기 쉽다.
  // 마운트한 뒤에 계산하고, 그 전에는 자리만 잡아둔다.
  const [left, setLeft] = useState<{ d: number; h: number; m: number } | null>(null)

  useEffect(() => {
    if (!audition.deadline) return
    const closesAt = roundClosesAt(audition.deadline).getTime()
    function tick() {
      const ms = closesAt - Date.now()
      if (ms <= 0) { setLeft({ d: 0, h: 0, m: 0 }); return }
      setLeft({
        d: Math.floor(ms / 86400_000),
        h: Math.floor(ms / 3600_000) % 24,
        m: Math.floor(ms / 60_000) % 60,
      })
    }
    tick()
    // 분 단위라 1분에 한 번이면 충분하다. 더 자주 돌리면 배터리만 먹는다.
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [audition.deadline])

  const roundNo = audition.deadline ? roundNoOf(audition.deadline) : null
  const shownName = agencyName(audition.agency, lang) || tx.auditions.adminNotice
  const initials = agencyInitials(audition.agency, lang) || shownName.slice(0, 3)
  const canApply = !appStatus && audition.mode !== 'offline'

  const ctaLabel = appStatus === 'pending' ? tx.auditions.review
    : appStatus === 'invited' ? tx.auditions.checkChat
    : audition.mode === 'offline' ? tx.auditions.offlineAudition
    : appStatus ? tx.auditions.applied
    : tx.auditions.apply

  return (
    <div style={{
      borderRadius: 26, padding: 22, color: '#FFFFFF', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(150deg, #E2541F 0%, #C0350F 62%, #8E2508 100%)',
      boxShadow: '0 12px 30px rgba(216,74,30,0.22)',
    }}>
      {/* 오른쪽 위 빛무리. 평평한 주황 한 덩어리면 배너처럼 보인다. */}
      <div style={{
        position: 'absolute', right: -56, top: -70, width: 210, height: 210, borderRadius: '50%',
        background: 'rgba(255,255,255,0.09)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)',
          padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 800,
        }}>
          <i style={{ width: 7, height: 7, borderRadius: '50%', background: '#6EE7A0', display: 'block' }} />
          {roundNo
            ? `${tx.schedule.round.replace('{n}', String(roundNo))} ${tx.schedule.live}`
            : tx.schedule.live}
        </span>
        {audition.deadline && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
            {closeLabel(audition.deadline, lang)} {tx.auditions.deadline}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0 14px', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 62, height: 62, borderRadius: 20, flexShrink: 0, overflow: 'hidden',
          background: '#FFFFFF', color: '#D84A1E', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 900, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}>
          {audition.agency?.logo_url
            ? <img src={audition.agency.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 900, letterSpacing: -0.4,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shownName}</span>
            {audition.agency?.is_verified && <Check size={15} strokeWidth={3} style={{ flexShrink: 0 }} />}
          </div>
          <div style={{
            fontSize: 13.5, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{audition.title}</div>
        </div>
      </div>

      {audition.deadline && (
        <>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', fontWeight: 600, marginBottom: 10, position: 'relative', zIndex: 1 }}>
            {tx.auditions.timeLeft}
          </div>
          <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
            {[
              { v: left ? String(left.d) : '–', u: tx.auditions.unitDay },
              { v: left ? twoDigit(left.h) : '–', u: tx.auditions.unitHour },
              { v: left ? twoDigit(left.m) : '–', u: tx.auditions.unitMin },
            ].map(cell => (
              <div key={cell.u} style={{
                flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '9px 0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{cell.v}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{cell.u}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => canApply && onApply()}
        disabled={!canApply}
        style={{
          width: '100%', marginTop: 14, padding: 15, borderRadius: 16, border: 'none',
          background: canApply ? '#FFFFFF' : 'rgba(255,255,255,0.18)',
          color: canApply ? '#C0350F' : '#FFFFFF',
          fontSize: 16, fontWeight: 900, cursor: canApply ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          position: 'relative', zIndex: 1, fontFamily: 'inherit',
        }}>
        {ctaLabel}
        {canApply && <ArrowRight size={18} strokeWidth={2.4} />}
      </button>

      {/* 회차당 한 곳뿐이라는 게 이 서비스의 정체인데, 어디에도 적혀 있지 않았다. */}
      <p style={{
        fontSize: 11.5, color: 'rgba(255,255,255,0.72)', textAlign: 'center', margin: '11px 0 0',
        position: 'relative', zIndex: 1, wordBreak: 'keep-all',
      }}>
        {tx.auditions.onlyOne}
      </p>
    </div>
  )
}

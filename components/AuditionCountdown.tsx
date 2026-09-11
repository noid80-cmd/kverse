'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Megaphone } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'
import { daysUntilLaunch, launchDateLabel, roundOpensAt, roundNoOf } from '@/lib/launch'
import { createClient } from '@/lib/supabase/client'
import { agencyName, agencyInitials } from '@/lib/agencyName'
import { doSubscribe } from '@/components/PushSubscribe'
import { isNativeApp } from '@/lib/capacitor'
import { nativeNotifState } from '@/lib/pushNative'

// 공고가 하나도 없을 때 "현재 열린 오디션이 없어요"만 띄우면 빈손으로 나가게 된다.
// 오픈까지 남은 날짜를 세어주고, 그 자리에서 알림을 켜게 해서 첫 공고가 올라오는
// 순간 다시 데려올 수 있게 한다. 오픈일이 지나면 이 카드는 스스로 사라진다.
export default function AuditionCountdown({
  variant = 'notify', compact = false,
}: {
  variant?: 'notify' | 'signup'
  /** 홈처럼 이 카드가 목적지가 아니라 입구일 때. 같은 카드를 두 화면에서
   *  똑같이 크게 보여주면, 눌러 들어간 사람은 같은 것을 두 번 본다. 홈은
   *  요약이고 오디션 화면이 본편이다. */
  compact?: boolean
}) {
  const { lang } = useLang()
  const tx = useT(lang).auditions
  const sx = useT(lang).schedule
  const [days, setDays] = useState<number | null>(null)
  const [notifyOn, setNotifyOn] = useState(false)
  const [busy, setBusy] = useState(false)

  // 오픈 전이라도 어디가 열리는지는 정해져 있다. 그걸 안 보여주고 D-day만
  // 크게 띄우면, 처음 들어온 사람 눈에는 아무것도 없는 앱이다. 기다릴 이유는
  // 숫자가 아니라 이름이 만든다 — "19일 남았다"가 아니라 "미스틱스토리가
  // 열린다"여야 한다. 지원은 정해진 시각에 열리고, 이름은 지금부터 건다.
  type NextUp = { name: string; name_en: string | null; logo: string | null; no: number | null; opensAt: Date }
  const [next, setNext] = useState<NextUp | null>(null)

  useEffect(() => {
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
    createClient()
      .from('auditions')
      .select('deadline, agency:agencies(name, name_en, logo_url)')
      .in('status', ['scheduled', 'active'])
      .not('deadline', 'is', null)
      .gte('deadline', today)
      .order('deadline', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        const row = data?.[0] as unknown as
          { deadline: string; agency?: { name?: string; name_en?: string; logo_url?: string } } | undefined
        if (!row?.agency?.name) return
        setNext({
          name: row.agency.name,
          name_en: row.agency.name_en ?? null,
          logo: row.agency.logo_url ?? null,
          no: roundNoOf(row.deadline),
          opensAt: roundOpensAt(row.deadline),
        })
      })
  }, [])

  function openLabel(at: Date) {
    try {
      return new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : lang, {
        month: 'long', day: 'numeric', timeZone: 'Asia/Seoul',
      }).format(at)
    } catch {
      return at.toISOString().slice(0, 10)
    }
  }

  // 남은 일수는 서버와 클라이언트의 시각이 달라 hydration 경고가 나기 쉬워서
  // 마운트 후에 계산한다.
  useEffect(() => { setDays(daysUntilLaunch()) }, [])

  // 알림 상태는 이 화면 밖에서도 바뀐다. 앱을 처음 열 때 뜨는 팝업에서 켜거나,
  // iOS 설정에서 직접 바꾸기도 한다. 처음 한 번만 확인하면 켜고 나서도 계속
  // "알림 켜기"가 남는다 — 앱은 웹뷰가 살아 있어서 나갔다 와도 다시 확인하지
  // 않는다. 그래서 화면이 다시 보일 때와 다른 곳에서 켰을 때 같이 확인한다.
  useEffect(() => {
    if (variant !== 'notify') return

    function check() {
      if (isNativeApp()) {
        nativeNotifState().then(s => setNotifyOn(s === 'granted')).catch(() => {})
        return
      }
      if (typeof Notification !== 'undefined') setNotifyOn(Notification.permission === 'granted')
    }

    check()
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    window.addEventListener('kpick-notif-changed', check)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
      window.removeEventListener('kpick-notif-changed', check)
    }
  }, [variant])

  async function handleNotify() {
    setBusy(true)
    try {
      if (!isNativeApp() && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') { setBusy(false); return }
      }
      await doSubscribe()
      setNotifyOn(true)
      window.dispatchEvent(new Event('kpick-notif-changed'))
    } catch { /* 실패해도 카운트다운은 계속 보여준다 */ }
    setBusy(false)
  }

  if (days === null || days < 0) return null

  const dateLabel = launchDateLabel(lang)

  if (compact) {
    return (
      <div style={{
        background: '#FFFFFF', borderRadius: 18, padding: '15px 16px',
        border: '1px solid rgba(36,28,21,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            fontSize: 32, fontWeight: 900, letterSpacing: -1.4, color: '#D84A1E', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {days === 0 ? 'D-DAY' : `D-${days}`}
          </div>
          {next ? (
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0, overflow: 'hidden',
                background: next.logo ? '#FFFFFF' : 'rgba(255,111,60,0.12)',
                border: '1px solid rgba(36,28,21,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {next.logo
                  ? <img src={next.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 11, fontWeight: 900, color: '#D84A1E' }}>{agencyInitials(next, lang, 2)}</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 14, color: '#241C15', fontWeight: 900, letterSpacing: -0.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{agencyName(next, lang)}</div>
                <div style={{ fontSize: 11.5, color: '#8A7F6E', fontWeight: 600, marginTop: 1 }}>
                  {next.no ? `${sx.round.replace('{n}', String(next.no))} · ` : ''}
                  {tx.opensOn.replace('{date}', openLabel(next.opensAt))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#8A7F6E', fontWeight: 700 }}>{tx.countdownLabel}</div>
              <div style={{ fontSize: 13, color: '#241C15', fontWeight: 700, marginTop: 2, wordBreak: 'keep-all' }}>
                {days === 0 ? tx.countdownToday : tx.countdownDesc.replace('{date}', dateLabel)}
              </div>
            </div>
          )}
        </div>

        {/* 알림은 아직 안 켠 사람에게만 묻는다. 켠 사람에게 다시 묻는 건
            같은 말을 두 번 하는 것이고, 홈은 그럴 자리가 아니다. */}
        {variant === 'notify' && !notifyOn && (
          <button onClick={handleNotify} disabled={busy} style={{
            width: '100%', marginTop: 13, padding: '11px', borderRadius: 13, border: 'none',
            background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: '#FFFFFF',
            fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Bell size={15} strokeWidth={2.2} />
            {tx.countdownNotify}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 26, padding: 22, color: '#FFFFFF', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(150deg, #E2541F 0%, #C0350F 62%, #8E2508 100%)',
      boxShadow: '0 12px 30px rgba(216,74,30,0.22)',
    }}>
      {/* 진행 중인 회차 히어로와 같은 자리, 같은 옷이다. 공고가 열리면 이
          카드가 사라지고 그 자리에 기획사가 들어온다 — 화면이 바뀌는 게
          아니라 주인공이 도착하는 것으로 읽힌다. */}
      <div style={{
        position: 'absolute', right: -56, top: -70, width: 210, height: 210, borderRadius: '50%',
        background: 'rgba(255,255,255,0.09)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)',
          padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 800,
        }}>
          <Megaphone size={14} strokeWidth={2.2} />
          {tx.countdownLabel}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>{dateLabel}</span>
      </div>

      <div style={{
        fontSize: 58, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2,
        margin: '16px 0 6px', position: 'relative', zIndex: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {days === 0 ? 'D-DAY' : `D-${days}`}
      </div>
      <div style={{
        fontSize: 13.5, color: 'rgba(255,255,255,0.84)', fontWeight: 500, lineHeight: 1.6,
        wordBreak: 'keep-all', position: 'relative', zIndex: 1,
      }}>
        {days === 0 ? tx.countdownToday : tx.countdownDesc.replace('{date}', dateLabel)}
      </div>

      {/* 어디가 열리는지 정해졌으면 이름을 건다. 아직이면 실루엣으로 둔다 —
          빈 칸은 멈춘 것처럼 보이지만 실루엣은 아직 안 밝힌 것으로 읽힌다. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, margin: '18px 0 16px', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: next?.logo ? '#FFFFFF' : 'rgba(255,255,255,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {next?.logo
            ? <img src={next.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : next
              ? <span style={{ fontSize: 15, fontWeight: 900 }}>{agencyInitials(next, lang)}</span>
              : <span style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          {next ? (
            <>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', fontWeight: 700, marginBottom: 2 }}>
                {tx.firstUp}
              </div>
              <div style={{
                fontSize: 19, fontWeight: 900, letterSpacing: -0.4, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{agencyName(next, lang)}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: 600 }}>
                {next.no ? `${sx.round.replace('{n}', String(next.no))} · ` : ''}
                {tx.opensOn.replace('{date}', openLabel(next.opensAt))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.88)' }}>{sx.preparing}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2, fontWeight: 500 }}>
                {tx.countdownNotifyDesc}
              </div>
            </>
          )}
        </div>
      </div>

      {variant === 'signup' ? (
        <Link href="/signup" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 15,
          background: '#FFFFFF', borderRadius: 16, color: '#C0350F', fontSize: 16, fontWeight: 900,
          textDecoration: 'none', position: 'relative', zIndex: 1,
        }}>{tx.countdownSignup}</Link>
      ) : notifyOn ? (
        // 이미 켠 사람에게 "켜져 있어요"를 다시 말해줄 이유가 없다. 화면에서
        // 가장 좋은 자리를 확인 문구가 차지하고 있었다 — 그 자리는 비워두는
        // 편이 낫고, 정작 알림을 켜야 할 사람에게 버튼이 더 크게 보인다.
        null
      ) : (
        <button onClick={handleNotify} disabled={busy} style={{
          width: '100%', padding: 15, background: '#FFFFFF', border: 'none', borderRadius: 16,
          color: '#C0350F', fontSize: 16, fontWeight: 900, fontFamily: 'inherit',
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          position: 'relative', zIndex: 1,
        }}>
          <Bell size={17} strokeWidth={2.2} />
          {tx.countdownNotify}
        </button>
      )}
    </div>
  )
}

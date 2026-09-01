'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, BellRing, Megaphone } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'
import { daysUntilLaunch, launchDateLabel } from '@/lib/launch'
import { doSubscribe } from '@/components/PushSubscribe'
import { isNativeApp } from '@/lib/capacitor'
import { nativeNotifState } from '@/lib/pushNative'

// 공고가 하나도 없을 때 "현재 열린 오디션이 없어요"만 띄우면 빈손으로 나가게 된다.
// 오픈까지 남은 날짜를 세어주고, 그 자리에서 알림을 켜게 해서 첫 공고가 올라오는
// 순간 다시 데려올 수 있게 한다. 오픈일이 지나면 이 카드는 스스로 사라진다.
export default function AuditionCountdown({ variant = 'notify' }: { variant?: 'notify' | 'signup' }) {
  const { lang } = useLang()
  const tx = useT(lang).auditions
  const [days, setDays] = useState<number | null>(null)
  const [notifyOn, setNotifyOn] = useState(false)
  const [busy, setBusy] = useState(false)

  // 남은 일수는 서버와 클라이언트의 시각이 달라 hydration 경고가 나기 쉬워서
  // 마운트 후에 계산한다.
  useEffect(() => { setDays(daysUntilLaunch()) }, [])

  useEffect(() => {
    if (variant !== 'notify') return
    if (isNativeApp()) {
      nativeNotifState().then(s => setNotifyOn(s === 'granted')).catch(() => {})
      return
    }
    if (typeof Notification !== 'undefined') setNotifyOn(Notification.permission === 'granted')
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
    } catch { /* 실패해도 카운트다운은 계속 보여준다 */ }
    setBusy(false)
  }

  if (days === null || days < 0) return null

  const dateLabel = launchDateLabel(lang)

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 18, padding: '26px 20px',
      border: '1px solid rgba(36,28,21,0.06)', textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, background: 'rgba(255,111,60,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px', color: '#D84A1E',
      }}>
        <Megaphone size={20} strokeWidth={1.6} />
      </div>

      <div style={{ fontSize: 12, color: '#8A7F6E', fontWeight: 600, letterSpacing: 0.3 }}>
        {tx.countdownLabel}
      </div>
      <div style={{
        fontSize: 44, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5,
        color: '#D84A1E', margin: '4px 0 10px',
      }}>
        {days === 0 ? 'D-DAY' : `D-${days}`}
      </div>
      <div style={{ fontSize: 14, color: '#4A4438', fontWeight: 600, lineHeight: 1.6, wordBreak: 'keep-all' }}>
        {days === 0 ? tx.countdownToday : tx.countdownDesc.replace('{date}', dateLabel)}
      </div>

      {variant === 'signup' ? (
        <Link href="/signup" style={{
          display: 'block', marginTop: 20, padding: '14px',
          background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
          borderRadius: 14, color: 'white', fontSize: 15, fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 4px 16px rgba(216,74,30,0.28)',
        }}>{tx.countdownSignup}</Link>
      ) : notifyOn ? (
        <div style={{
          marginTop: 20, padding: '13px 14px', borderRadius: 14,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <BellRing size={16} strokeWidth={1.8} color="#15803D" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>{tx.countdownNotifyOn}</div>
            <div style={{ fontSize: 11, color: '#4A7C59' }}>{tx.countdownNotifyOnDesc}</div>
          </div>
        </div>
      ) : (
        <>
          <button onClick={handleNotify} disabled={busy} style={{
            width: '100%', marginTop: 20, padding: '14px',
            background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
            border: 'none', borderRadius: 14, color: 'white', fontSize: 15, fontWeight: 700,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
            boxShadow: '0 4px 16px rgba(216,74,30,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Bell size={16} strokeWidth={2} />
            {tx.countdownNotify}
          </button>
          <div style={{ fontSize: 11, color: '#8A7F6E', marginTop: 9 }}>{tx.countdownNotifyDesc}</div>
        </>
      )}
    </div>
  )
}

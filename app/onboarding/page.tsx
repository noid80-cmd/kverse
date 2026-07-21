'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bell, BellOff, Video, Star, MessageCircle, Search, ClipboardList } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function subscribeNotif() {
  try {
    const keyRes = await fetch('/api/push/vapid-key')
    if (!keyRes.ok) return
    const { publicKey } = await keyRes.json()
    if (!publicKey) return
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    const stored = localStorage.getItem('kpick-vapid-key-v2')
    if (sub && stored !== publicKey) { await sub.unsubscribe(); sub = null }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      localStorage.setItem('kpick-vapid-key-v2', publicKey)
    }
    await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub }) })
  } catch {}
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'
  const isAgency = nextPath.includes('agency')
  const isPreview = searchParams.get('preview') === '1'
  const [step, setStep] = useState<0 | 1 | 2 | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default')
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (!isPreview && localStorage.getItem('kpick-onboarded')) { router.replace(nextPath); return }

    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream
    const android = /Android/.test(ua)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    const isMobile = ios || android

    setIsIOS(ios)
    setIsAndroid(android)
    setIsStandalone(standalone)

    if ('Notification' in window) setNotifPerm(Notification.permission)

    setStep(0)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as any)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // step 2: 이미 알림 허용된 경우 바로 완료
  useEffect(() => {
    if (step === 2 && notifPerm === 'granted') {
      subscribeNotif().finally(finish)
    }
  }, [step, notifPerm])

  function finish() {
    if (!isPreview) localStorage.setItem('kpick-onboarded', '1')
    router.replace(nextPath)
  }

  async function handleAndroidInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    }
    setInstalled(true)
  }

  function goToStep2() { setStep(2) }

  // 이미 설치됐거나 데스크탑이면 '홈 화면에 추가' 단계는 건너뜀
  function goFromIntro() {
    const isMobile = isIOS || isAndroid
    setStep(isStandalone || !isMobile ? 2 : 1)
  }

  async function handleNotif() {
    if (!('Notification' in window)) { finish(); return }
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm === 'granted') await subscribeNotif()
    finish()
  }

  if (step === null) return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #0891b2', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>

      {/* 진행 표시 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 48 }}>
        {[0, 1, 2].map(s => (
          <div key={s} style={{ width: s === step ? 20 : 6, height: 6, borderRadius: 3, background: s === step ? '#0891b2' : 'rgba(255,255,255,0.12)', transition: 'all 0.3s' }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {step === 0 && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9l5 3-5 3V9z" fill="white" stroke="none" />
              </svg>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#eeeeff', marginBottom: 12, textAlign: 'center' }}>
              {isAgency ? '숨은 인재를 가장 먼저 발견하세요' : 'K-pop 커버로 시작하는 데뷔의 문'}
            </h1>
            <p style={{ fontSize: 15, color: '#8888aa', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
              {isAgency
                ? <>전세계 K-pop 팬들의 커버 영상에서<br />다음 스타를 찾아보세요</>
                : <>커버 영상을 올리면 전세계 기획사가<br />직접 찾아와요</>}
            </p>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {(isAgency
                ? [
                    { Icon: Search, text: '커버 영상 탐색 — 실력있는 지망생들을 둘러보세요' },
                    { Icon: Star, text: '관심 표시·오디션 제안 — 마음에 들면 바로 연락' },
                    { Icon: MessageCircle, text: '채팅으로 소통 — 오디션까지 매끄럽게' },
                  ]
                : [
                    { Icon: Video, text: '커버 영상 올리기 — 원하는 곡으로 자유롭게' },
                    { Icon: Star, text: '기획사가 발견해요 — 관심 있으면 북마크·오디션 제안' },
                    { Icon: MessageCircle, text: '채팅으로 소통 — 오디션까지 이어져요' },
                  ]
              ).map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#111118', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <item.Icon size={18} color="#22d3ee" strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#8888aa' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <button onClick={goFromIntro} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(6,182,212,0.35)' }}>
              다음 →
            </button>
          </>
        )}

        {step === 1 && (
          <>
            {/* 아이콘 */}
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12" y2="18.01" />
              </svg>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#eeeeff', marginBottom: 12, textAlign: 'center' }}>홈 화면에 추가하세요</h1>
            <p style={{ fontSize: 15, color: '#8888aa', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
              앱처럼 빠르게 열고<br />기획사 알림도 바로 받을 수 있어요
            </p>

            {isIOS && (
              <div style={{ width: '100%', background: '#111118', borderRadius: 20, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {/* iOS 공유 아이콘 */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#eeeeff', marginBottom: 3 }}>1단계</p>
                    <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.5 }}>하단 가운데 <span style={{ color: '#22d3ee', fontWeight: 700 }}>공유 버튼</span>을 탭하세요</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12l7-7 7 7"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#eeeeff', marginBottom: 3 }}>2단계</p>
                    <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.5 }}><span style={{ color: '#22d3ee', fontWeight: 700 }}>홈 화면에 추가</span>를 선택하세요</p>
                  </div>
                </div>
              </div>
            )}

            {isAndroid && !installed && deferredPrompt && (
              <button onClick={handleAndroidInstall} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 16px rgba(6,182,212,0.35)' }}>
                홈 화면에 추가하기
              </button>
            )}

            {isAndroid && installed && (
              <div style={{ width: '100%', padding: '15px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 16, textAlign: 'center', color: '#4ade80', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                ✓ 홈 화면에 추가됐어요
              </div>
            )}

            <button onClick={goToStep2} style={{ width: '100%', padding: '15px', background: isIOS || installed ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#111118', border: isIOS || installed ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: isIOS || installed ? '0 4px 16px rgba(6,182,212,0.35)' : 'none', marginBottom: 12 }}>
              {isIOS ? '추가했어요 →' : installed ? '다음 →' : '다음 →'}
            </button>

            <button onClick={finish} style={{ background: 'none', border: 'none', color: '#555570', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px' }}>
              나중에
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}>
              <Bell size={36} strokeWidth={1.6} color="white" />
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#eeeeff', marginBottom: 12, textAlign: 'center' }}>알림을 켜두세요</h1>
            <p style={{ fontSize: 15, color: '#8888aa', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
              기획사가 관심을 보이거나<br />채팅을 보내면 바로 알려드려요
            </p>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {[
                { Icon: Star, text: '기획사가 내 영상에 관심을 표시했을 때' },
                { Icon: MessageCircle, text: '기획사 담당자가 채팅을 보냈을 때' },
                { Icon: ClipboardList, text: '새 오디션 공고가 올라왔을 때' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#111118', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <item.Icon size={18} color="#22d3ee" strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#8888aa' }}>{item.text}</span>
                </div>
              ))}
            </div>

            {notifPerm === 'denied' ? (
              <>
                <div style={{ width: '100%', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
                  <BellOff size={20} color="#f87171" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>알림이 차단되어 있어요<br />설정 앱에서 직접 허용해주세요</p>
                </div>
                <button onClick={finish} style={{ width: '100%', padding: '15px', background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, color: '#8888aa', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  나중에 설정하기
                </button>
              </>
            ) : (
              <>
                <button onClick={handleNotif} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 16px rgba(6,182,212,0.35)' }}>
                  알림 켜기
                </button>
                <button onClick={finish} style={{ background: 'none', border: 'none', color: '#555570', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px' }}>
                  나중에
                </button>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}

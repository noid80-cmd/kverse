'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Share, PlusSquare, Star, MessageCircle, ClipboardList } from 'lucide-react'
import { isNativeApp, isIosWebTab } from '@/lib/capacitor'
import { enableNativeNotifications, nativeNotifState, refreshNativeToken } from '@/lib/pushNative'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function doSubscribe() {
  // 스토어 앱(WKWebView)에는 PushManager가 없어 아래 웹 푸시 경로가 통째로
  // 실패한다. 앱이면 FCM 토큰을 등록하고 여기서 끝낸다.
  if (isNativeApp()) {
    await enableNativeNotifications()
    return
  }

  const keyRes = await fetch('/api/push/vapid-key')
  if (!keyRes.ok) return
  const { publicKey } = await keyRes.json()
  if (!publicKey) return

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  const stored = localStorage.getItem('kpick-vapid-key-v2')
  if (sub && stored !== publicKey) {
    await sub.unsubscribe()
    sub = null
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    localStorage.setItem('kpick-vapid-key-v2', publicKey)
  }

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub }),
  })
}

// 아이폰 사파리 탭에는 알림을 켤 방법 자체가 없다. 같은 배너를 쓰되
// 내용을 바꿔서 '앱 설치' 또는 '홈 화면 추가'로 안내한다.
type Mode = 'permission' | 'ios'

const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6791017827'

export default function PushSubscribe() {
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<Mode>('permission')
  const [showHomeGuide, setShowHomeGuide] = useState(false)

  useEffect(() => {
    // 이미 한 번 닫은 경우 24시간 내 재표시 안 함
    const dismissed = localStorage.getItem('kpick-push-dismissed')
    const recentlyDismissed = dismissed && Date.now() - Number(dismissed) < 86400000

    // 앱(WKWebView)에는 serviceWorker·PushManager·Notification이 모두 없다.
    // 웹 기준으로 판단하면 앱에서는 배너가 영영 안 뜬다.
    if (isNativeApp()) {
      nativeNotifState().then((state) => {
        if (state === 'granted') {
          // 토큰은 재설치·갱신으로 바뀌므로 열 때마다 다시 올린다
          refreshNativeToken().catch(() => {})
          return
        }
        if (state === 'prompt' && !recentlyDismissed) {
          setTimeout(() => setShow(true), 1500)
        }
      })
      return
    }

    // 아이폰 사파리 탭 — Push API가 없다. 예전엔 여기서 그냥 return 해서
    // 아무 안내도 못 받고 지나갔다. 이제 안내 배너를 띄운다.
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      if (isIosWebTab() && !recentlyDismissed) {
        setMode('ios')
        setTimeout(() => setShow(true), 1500)
      }
      return
    }
    if (Notification.permission !== 'default') {
      // 이미 결정된 경우 — granted면 조용히 재등록
      if (Notification.permission === 'granted') doSubscribe().catch(() => {})
      return
    }
    if (recentlyDismissed) return

    const timer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  async function handleAllow() {
    setShow(false)
    if (isNativeApp()) {
      await enableNativeNotifications()
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') doSubscribe().catch(() => {})
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('kpick-push-dismissed', String(Date.now()))
  }

  if (!show) return null

  return (
    <>
      {/* 딤 배경 */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          animation: 'fadeInDim 0.2s ease',
        }}
      />
      {/* 바텀시트 */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
        background: '#FFFCF6',
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px',
        boxShadow: '0 -8px 40px rgba(36,28,21,0.18)',
        border: '1px solid rgba(36,28,21,0.08)',
        animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        maxWidth: 480, margin: '0 auto',
      }}>
        {/* 핸들 */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(36,28,21,0.15)', margin: '0 auto 24px' }} />

        <button onClick={handleDismiss} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(36,28,21,0.05)', border: 'none', borderRadius: 10,
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#8A7F6E',
        }}>
          <X size={16} strokeWidth={2} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(216,74,30,0.3)',
          }}>
            <Bell size={24} strokeWidth={1.8} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#241C15', marginBottom: 3 }}>기획사 알림 받기</div>
            <div style={{ fontSize: 13, color: '#8A7F6E' }}>
              {mode === 'ios' ? '한 단계만 더 하면 받을 수 있어요' : '놓치면 아쉬운 연락이 올 수 있어요'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { Icon: Star, text: '기획사가 내 영상에 관심을 표시했을 때' },
            { Icon: MessageCircle, text: '기획사 담당자가 채팅을 보냈을 때' },
            { Icon: ClipboardList, text: '새 오디션 공고가 올라왔을 때' },
          ].map(({ Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={17} strokeWidth={1.8} color="#D84A1E" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#6B6355' }}>{text}</span>
            </div>
          ))}
        </div>

        {mode === 'ios' ? (
          <>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={handleDismiss} style={{
              display: 'block', width: '100%', padding: '15px', boxSizing: 'border-box',
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
              border: 'none', borderRadius: 16, textAlign: 'center', textDecoration: 'none',
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', marginBottom: 10,
              boxShadow: '0 4px 16px rgba(216,74,30,0.3)',
            }}>
              앱 설치하고 알림 받기
            </a>

            <button onClick={() => setShowHomeGuide(v => !v)} style={{
              width: '100%', padding: '13px',
              background: 'none', border: '1px solid rgba(36,28,21,0.12)', borderRadius: 14,
              color: '#6B6355', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', marginBottom: showHomeGuide ? 12 : 10,
            }}>
              앱 없이 홈 화면에 추가하기
            </button>

            {showHomeGuide && (
              <div style={{
                background: 'rgba(36,28,21,0.04)', borderRadius: 14,
                padding: '14px 16px', marginBottom: 10,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Share size={16} strokeWidth={1.8} color="#8A7F6E" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#6B6355' }}>사파리 아래쪽 공유 버튼을 누르고</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlusSquare size={16} strokeWidth={1.8} color="#8A7F6E" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#6B6355' }}>[홈 화면에 추가]를 선택하세요</span>
                </div>
                <div style={{ fontSize: 12, color: '#8A7F6E', paddingLeft: 26 }}>
                  홈 화면에서 열면 알림을 켤 수 있어요
                </div>
              </div>
            )}
          </>
        ) : (
          <button onClick={handleAllow} style={{
            width: '100%', padding: '15px',
            background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
            border: 'none', borderRadius: 16,
            color: 'white', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', marginBottom: 10,
            boxShadow: '0 4px 16px rgba(216,74,30,0.3)',
          }}>
            알림 켜기
          </button>
        )}

        <button onClick={handleDismiss} style={{
          width: '100%', padding: '13px',
          background: 'none', border: 'none',
          color: '#8A7F6E', fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}>
          나중에
        </button>
      </div>

      <style>{`
        @keyframes fadeInDim { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}

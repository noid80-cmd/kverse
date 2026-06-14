'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function doSubscribe() {
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

export default function PushSubscribe() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'default') {
      // 이미 결정된 경우 — granted면 조용히 재등록
      if (Notification.permission === 'granted') doSubscribe().catch(() => {})
      return
    }
    // 이미 한 번 닫은 경우 24시간 내 재표시 안 함
    const dismissed = localStorage.getItem('kpick-push-dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 86400000) return

    const timer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  async function handleAllow() {
    setShow(false)
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
        background: '#13131e',
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
        animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        maxWidth: 480, margin: '0 auto',
      }}>
        {/* 핸들 */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 24px' }} />

        <button onClick={handleDismiss} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#555570',
        }}>
          <X size={16} strokeWidth={2} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(6,182,212,0.35)',
          }}>
            <Bell size={24} strokeWidth={1.8} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#eeeeff', marginBottom: 3 }}>기획사 알림 받기</div>
            <div style={{ fontSize: 13, color: '#555570' }}>놓치면 아쉬운 연락이 올 수 있어요</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { emoji: '⭐', text: '기획사가 내 영상에 관심을 표시했을 때' },
            { emoji: '💬', text: '기획사 담당자가 채팅을 보냈을 때' },
            { emoji: '📋', text: '새 오디션 공고가 올라왔을 때' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
              <span style={{ fontSize: 14, color: '#8888aa' }}>{item.text}</span>
            </div>
          ))}
        </div>

        <button onClick={handleAllow} style={{
          width: '100%', padding: '15px',
          background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
          border: 'none', borderRadius: 16,
          color: 'white', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', marginBottom: 10,
          boxShadow: '0 4px 16px rgba(6,182,212,0.35)',
        }}>
          알림 켜기
        </button>
        <button onClick={handleDismiss} style={{
          width: '100%', padding: '13px',
          background: 'none', border: 'none',
          color: '#555570', fontSize: 14, fontWeight: 600,
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

'use client'

import { useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function PushSubscribe() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function register() {
      // Fetch the current VAPID key from the server at runtime
      const keyRes = await fetch('/api/push/vapid-key')
      if (!keyRes.ok) return
      const { publicKey } = await keyRes.json()
      if (!publicKey) return

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      let sub = await reg.pushManager.getSubscription()

      // Always re-subscribe if key changed (compare against stored key)
      const stored = localStorage.getItem('kpick-vapid-key-v2')
      if (sub && stored !== publicKey) {
        await sub.unsubscribe()
        sub = null
      }

      if (!sub) {
        if (Notification.permission === 'denied') return
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') return
        }
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

    register().catch(() => {})
  }, [])

  return null
}

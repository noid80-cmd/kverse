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

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_KEY_STORE = 'kverse-vapid-key'

export default function PushSubscribe() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function register() {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      let sub = await reg.pushManager.getSubscription()

      // Force re-subscribe if VAPID key changed
      const storedKey = localStorage.getItem(VAPID_KEY_STORE)
      if (sub && storedKey !== VAPID_KEY) {
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
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        })
        localStorage.setItem(VAPID_KEY_STORE, VAPID_KEY)
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

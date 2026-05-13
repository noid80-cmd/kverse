'use client'
import { useEffect } from 'react'

export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Register the self-destructing SW to clear all stale caches
    navigator.serviceWorker.register('/sw.js').catch(() => {})

    // After SW unregisters itself, reload once to get fresh resources
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
  }, [])
  return null
}

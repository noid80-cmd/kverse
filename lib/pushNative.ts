'use client'

import { isNativeApp } from './capacitor'
import { createClient } from './supabase/client'

// 스토어에서 받은 앱(WKWebView)에는 웹 푸시(PushManager)가 아예 없다. 그래서
// 앱 사용자는 알림을 켤 방법 자체가 없었다. 앱에서는 FCM 토큰을 받아 서버에
// 저장하고, 서버가 그 토큰으로 직접 보낸다. 웹/PWA/안드로이드 TWA는 기존
// 웹 푸시를 그대로 쓴다.

type Messaging = typeof import('@capacitor-firebase/messaging')['FirebaseMessaging']

async function messaging(): Promise<Messaging | null> {
  // 실기기에서 [알림 켜기]가 아무 반응도 없이 멈추는 걸 추적하려고 각 단계를
  // 찍는다. 에러도 응답도 없으면 어디서 멈췄는지가 유일한 단서다.
  console.log('[fcm] messaging() native?', isNativeApp())
  if (!isNativeApp()) return null
  try {
    const mod = await import('@capacitor-firebase/messaging')
    console.log('[fcm] module loaded?', !!mod?.FirebaseMessaging)
    return mod.FirebaseMessaging
  } catch (e) {
    console.log('[fcm] module import failed', String(e))
    // 플러그인이 없는 빌드(구버전 앱)에서도 화면이 깨지지 않아야 한다
    return null
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function saveToken(token: string) {
  const platform = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android'
  await fetch('/api/device-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ token, platform }),
  })
}

/** 이미 허용된 상태인지 */
export async function nativeNotifState(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  const fm = await messaging()
  if (!fm) return 'unsupported'
  try {
    const { receive } = await fm.checkPermissions()
    return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unsupported'
  }
}

/** 권한을 요청하고 토큰을 서버에 등록한다. 성공하면 true */
export async function enableNativeNotifications(): Promise<boolean> {
  console.log('[fcm] enable start')
  const fm = await messaging()
  if (!fm) { console.log('[fcm] no messaging module'); return false }
  try {
    console.log('[fcm] requesting permissions...')
    const { receive } = await fm.requestPermissions()
    console.log('[fcm] permission =', receive)
    if (receive !== 'granted') return false
    console.log('[fcm] getting token...')
    const { token } = await fm.getToken()
    console.log('[fcm] token?', token ? token.slice(0, 12) + '...' : 'none')
    if (!token) return false
    await saveToken(token)
    console.log('[fcm] token saved')
    return true
  } catch {
    return false
  }
}

/**
 * 앱을 열 때마다 호출한다.
 * FCM 토큰은 앱 재설치·데이터 삭제·주기적 갱신으로 바뀐다. 바뀐 걸 모르면
 * 알림이 조용히 끊기므로, 허용 상태면 매번 현재 토큰을 서버에 다시 올린다
 * (토큰 기준 upsert라 중복되지 않는다).
 */
export async function refreshNativeToken(): Promise<void> {
  const fm = await messaging()
  if (!fm) return
  try {
    const { receive } = await fm.checkPermissions()
    if (receive !== 'granted') return
    const { token } = await fm.getToken()
    if (token) await saveToken(token)
    fm.addListener('tokenReceived', ({ token: t }) => {
      if (t) saveToken(t).catch(() => {})
    })
  } catch {
    // 토큰 갱신 실패가 앱 사용을 막으면 안 된다
  }
}

/**
 * 알림을 눌러 앱이 열렸을 때 해당 화면으로 보낸다.
 * 공고 알림을 눌렀는데 홈으로 떨어지면 지원까지 가는 길이 끊긴다.
 */
export async function attachNotificationTap(navigate: (url: string) => void): Promise<void> {
  const fm = await messaging()
  if (!fm) return
  try {
    fm.addListener('notificationActionPerformed', (event) => {
      const url = (event.notification?.data as { url?: string } | undefined)?.url
      if (url) navigate(url)
    })
  } catch {
    // 리스너 등록 실패가 앱 사용을 막으면 안 된다
  }
}

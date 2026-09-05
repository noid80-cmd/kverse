'use client'

import { isNativeApp } from './capacitor'
import { createClient } from './supabase/client'

// 스토어에서 받은 앱(WKWebView)에는 웹 푸시(PushManager)가 아예 없다. 그래서
// 앱 사용자는 알림을 켤 방법 자체가 없었다. 앱에서는 FCM 토큰을 받아 서버에
// 저장하고, 서버가 그 토큰으로 직접 보낸다. 웹/PWA/안드로이드 TWA는 기존
// 웹 푸시를 그대로 쓴다.

type Messaging = typeof import('@capacitor-firebase/messaging')['FirebaseMessaging']

// 플러그인을 객체로 감싸서 돌려준다. 그냥 돌려주면 안 된다 -
// Capacitor 플러그인은 어떤 속성 접근이든 네이티브 호출로 바꾸는 프록시라,
// async 함수가 이걸 return하면 런타임이 "thenable인가" 확인하려고 .then에
// 접근하고, 프록시가 그걸 then()이라는 네이티브 메서드 호출로 넘겨버린다.
// 실기기에서 "FirebaseMessaging.then() is not implemented on ios"로 터졌고,
// 잡는 데가 없어 [알림 켜기]가 아무 반응 없는 버튼처럼 보였다.
async function messaging(): Promise<{ fm: Messaging } | null> {
  if (!isNativeApp()) return null
  try {
    const mod = await import('@capacitor-firebase/messaging')
    return { fm: mod.FirebaseMessaging }
  } catch {
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
  const m = await messaging()
  const fm = m?.fm
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
  const m = await messaging()
  const fm = m?.fm
  if (!fm) return false
  try {
    const { receive } = await fm.requestPermissions()
    if (receive !== 'granted') return false
    const { token } = await fm.getToken()
    if (!token) return false
    await saveToken(token)
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
  const m = await messaging()
  const fm = m?.fm
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
  const m = await messaging()
  const fm = m?.fm
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

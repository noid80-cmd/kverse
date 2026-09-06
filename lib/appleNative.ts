import { isNativeApp } from '@/lib/capacitor'

// iOS 앱 안에서는 Apple 로그인을 웹 OAuth로 돌리지 않는다.
// appleid.apple.com이 웹뷰 안에서의 로그인을 막기 때문에 브라우저를 한 번
// 거쳐야 하는데, 그 이동이 사파리로 새면 돌아온 인증 코드를 아무도 받지 못해
// 로그인 화면만 반복된다(실사용자·App Store 심사원이 겪은 무한 루프).
//
// 네이티브 플러그인(ios/App/App/AppleSignInPlugin.swift)이 시스템 시트를 띄워
// identity token을 주면, 그걸 signInWithIdToken에 넣는 것으로 끝난다.

export type AppleNativeResult = {
  idToken: string
  nonce: string
  fullName?: string
  email?: string
}

type Bridge = {
  Plugins?: { AppleSignIn?: { signIn?: () => Promise<AppleNativeResult> } }
}

function nativePlugin() {
  if (typeof window === 'undefined') return null
  const cap = (window as unknown as { Capacitor?: Bridge }).Capacitor
  const plugin = cap?.Plugins?.AppleSignIn
  return typeof plugin?.signIn === 'function' ? plugin : null
}

/**
 * 네이티브 경로를 쓸 수 있는지. 플러그인이 실제로 붙어 있을 때만 true라서,
 * 아직 이 기능이 없는 구버전 앱은 자동으로 기존 웹 경로로 떨어진다.
 */
export function hasNativeAppleSignIn(): boolean {
  return isNativeApp() && nativePlugin() !== null
}

export async function nativeAppleSignIn(): Promise<AppleNativeResult> {
  const plugin = nativePlugin()
  if (!plugin?.signIn) throw new Error('네이티브 Apple 로그인을 쓸 수 없어요')
  return plugin.signIn()
}

/** 사용자가 시트를 닫은 것뿐이면 오류 문구를 띄우지 않는다. */
export function isAppleCancel(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null
  return err?.code === 'CANCELED' || /cancel/i.test(err?.message ?? '')
}

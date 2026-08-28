'use client'

// 공개 오디션 공고를 보고 들어온 사람이 가입을 마친 뒤 그 공고로 돌아가게 하고,
// 어느 공고를 보고 가입했는지 남기기 위한 값.
//
// URL 파라미터로 실어 나르지 않는 이유: 네이티브 앱의 구글/애플 로그인은
// kpick://auth-callback → https://kpick.app/auth/callback 로 Swift 플러그인이
// 주소를 재조립하기 때문에, 우리가 붙인 파라미터가 살아 돌아온다는 보장이 없다.
// localStorage 는 같은 오리진의 웹뷰로 돌아오므로 그 왕복에서도 남는다.

const KEY = 'kpick-signup-intent'

export type SignupIntent = {
  /** 가입 후 돌아갈 앱 내부 경로 */
  next?: string
  /** 유입 출처. 예: "audition:<공고id>" */
  from?: string
}

/** 외부에서 넘어온 경로를 그대로 믿지 않는다. 앱 내부 경로만 허용. */
function safePath(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (!path.startsWith('/') || path.startsWith('//')) return undefined
  return path
}

export function setSignupIntent(intent: SignupIntent) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }))
  } catch {
    // 시크릿 모드 등에서 막혀도 가입 자체는 계속되어야 한다
  }
}

export function peekSignupIntent(): SignupIntent {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SignupIntent & { at?: number }
    // 며칠 전에 눌러본 공고로 엉뚱하게 보내지 않도록 하루만 유효하게 둔다
    if (parsed.at && Date.now() - parsed.at > 24 * 60 * 60 * 1000) {
      clearSignupIntent()
      return {}
    }
    return { next: safePath(parsed.next), from: parsed.from }
  } catch {
    return {}
  }
}

export function clearSignupIntent() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // 위와 같음
  }
}

/**
 * 로그인·가입 직후 실제로 이동할 곳.
 * 공개 공고에서 넘어온 사람이면 그 공고로 돌려보낸다.
 * 온보딩은 스스로 목적지를 읽으므로 여기서 손대지 않는다.
 */
export function resolveAfterAuth(href: string): string {
  const { next } = peekSignupIntent()
  if (!next) return href
  if (href.startsWith('/onboarding')) return href
  clearSignupIntent()
  return next
}

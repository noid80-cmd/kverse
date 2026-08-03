'use client'
import { useEffect } from 'react'
import { Preferences } from '@capacitor/preferences'
import { createClient } from '@/lib/supabase/client'

const REFRESH_KEY = 'kpick-native-refresh-token'

// 네이티브 앱(Capacitor/WKWebView)에서는 쿠키 기반 세션이 앱 재실행 후
// 유실되는 경우가 있어("로그인이 자꾸 풀림"), 로그인 성공 시 refresh_token을
// 기기 자체 저장소(Capacitor Preferences)에도 따로 저장해두고, 콜드
// 스타트 때 쿠키 세션이 비어있으면 이걸로 복구를 시도한다.
//
// 주의: window.Capacitor.isNativePlatform()/getPlatform()으로 "네이티브
// 여부"를 먼저 확인한 뒤에만 이 로직을 태우려 했었는데, 실기기(Safari
// 원격 디버깅)로 확인해보니 이 플랫폼 판정 자체가 하드 네비게이션(로그인
// 리다이렉트 등) 이후 페이지에서 신뢰할 수 없게 나옴("web"으로 잘못 나옴).
// 반면 Preferences 플러그인 자체(네이티브 브릿지 호출)는 그런 상황에서도
// 계속 정상 동작하는 게 확인됐음. 그래서 플랫폼 판정으로 게이트하지 않고
// 항상 시도한다 — 진짜 웹 브라우저에서는 Capacitor의 web fallback(localStorage
// 기반)으로 조용히 동작하므로 해가 없다.
export default function NativeSessionSync() {
  useEffect(() => {
    const supabase = createClient()

    async function restoreIfNeeded() {
      const { data } = await supabase.auth.getSession()
      if (data.session) return
      const { value: refreshToken } = await Preferences.get({ key: REFRESH_KEY }).catch(() => ({ value: null }))
      if (!refreshToken) return
      await supabase.auth.refreshSession({ refresh_token: refreshToken }).catch(() => {})
    }
    restoreIfNeeded()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.refresh_token) {
        Preferences.set({ key: REFRESH_KEY, value: session.refresh_token }).catch(() => {})
      } else if (event === 'SIGNED_OUT') {
        Preferences.remove({ key: REFRESH_KEY }).catch(() => {})
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return null
}

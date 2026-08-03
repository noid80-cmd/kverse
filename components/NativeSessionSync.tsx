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
// 실기기 테스트로 이 복구가 100% 보장되지는 않는다는 게 확인되어서(원인
// 미확정), 최소한 세션이 풀렸을 때 "가입 화면"이 아니라 "로그인 화면"으로
// 보내고 이메일을 기억해두는 우회책을 병행함(LandingClient, login/page.tsx).
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
        try { localStorage.setItem('kpick-has-logged-in', '1') } catch { /* non-critical */ }
      } else if (event === 'SIGNED_OUT') {
        Preferences.remove({ key: REFRESH_KEY }).catch(() => {})
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return null
}

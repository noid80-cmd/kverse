'use client'
import { useEffect } from 'react'
import { Preferences } from '@capacitor/preferences'
import { createClient } from '@/lib/supabase/client'
import { isNativeApp } from '@/lib/capacitor'

const REFRESH_KEY = 'kpick-native-refresh-token'

// 네이티브 앱(Capacitor/WKWebView)에서는 쿠키 기반 세션이 앱 재실행 후
// 유실되는 경우가 있어("로그인이 자꾸 풀림"), 로그인 성공 시 refresh_token을
// 기기 자체 저장소(Capacitor Preferences, iOS 쪽은 UserDefaults 기반이라
// WKWebView 쿠키보다 안정적)에도 따로 저장해두고, 콜드 스타트 때 쿠키
// 세션이 비어있으면 이걸로 복구를 시도한다.
export default function NativeSessionSync() {
  useEffect(() => {
    if (!isNativeApp()) return
    const supabase = createClient()

    async function restoreIfNeeded() {
      const { data } = await supabase.auth.getSession()
      if (data.session) return
      const { value: refreshToken } = await Preferences.get({ key: REFRESH_KEY })
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

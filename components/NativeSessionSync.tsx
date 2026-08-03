'use client'
import { useEffect, useState } from 'react'
import { Preferences } from '@capacitor/preferences'
import { createClient } from '@/lib/supabase/client'

const REFRESH_KEY = 'kpick-native-refresh-token'

// 네이티브 앱(Capacitor/WKWebView)에서는 쿠키 기반 세션이 앱 재실행 후
// 유실되는 경우가 있어("로그인이 자꾸 풀림"), 로그인 성공 시 refresh_token을
// 기기 자체 저장소(Capacitor Preferences)에도 따로 저장해두고, 콜드
// 스타트 때 쿠키 세션이 비어있으면 이걸로 복구를 시도한다.
export default function NativeSessionSync() {
  const [debugLines, setDebugLines] = useState<string[]>([])
  // 임시 디버그 오버레이 — 네이티브 앱 로그인 세션 유지 문제 진단용.
  // window.Capacitor 객체 존재 여부로만 게이트(isNativePlatform()은 이미
  // 신뢰 못 한다고 확인됨) — 일반 웹 방문자에게는 안 보임. 원인 확정되면
  // 이 오버레이는 제거할 것.
  const showDebug = typeof window !== 'undefined' && typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined'

  function log(line: string) {
    console.log('[NSS]', line)
    setDebugLines(prev => [...prev, line])
  }

  useEffect(() => {
    log(`mount, cookie has sb token? ${document.cookie.includes('-auth-token')}`)
    const supabase = createClient()

    async function restoreIfNeeded() {
      const { data, error } = await supabase.auth.getSession()
      log(`getSession session? ${!!data.session} error? ${error ? String(error) : 'null'}`)
      if (data.session) return
      const { value: refreshToken } = await Preferences.get({ key: REFRESH_KEY }).catch(e => { log(`Preferences.get threw ${String(e)}`); return { value: null } })
      log(`stored refreshToken? ${!!refreshToken}`)
      if (!refreshToken) return
      const r = await supabase.auth.refreshSession({ refresh_token: refreshToken }).catch(e => ({ error: e }))
      log(`refreshSession result: ${JSON.stringify(r).slice(0, 200)}`)
    }
    restoreIfNeeded()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      log(`onAuthStateChange ${event} hasSession=${!!session} hasRefreshToken=${!!session?.refresh_token}`)
      if (session?.refresh_token) {
        Preferences.set({ key: REFRESH_KEY, value: session.refresh_token })
          .then(() => log('Preferences.set OK'))
          .catch(e => log(`Preferences.set FAILED ${String(e)}`))
      } else if (event === 'SIGNED_OUT') {
        Preferences.remove({ key: REFRESH_KEY }).catch(() => {})
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  if (!showDebug) return null
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '40vh', overflowY: 'auto',
      background: 'rgba(0,0,0,0.9)', color: '#0f0', fontSize: 10, fontFamily: 'monospace',
      padding: '8px', zIndex: 999999, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    }}>
      {debugLines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}

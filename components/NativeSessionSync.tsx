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
  // 임시 디버그 오버레이(맥 없이 폰 화면만으로 확인용). window.Capacitor
  // 존재 여부로 게이트해서 일반 웹 방문자에겐 안 보임. 원인 확정되면 제거.
  const showDebug = typeof window !== 'undefined' && typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined'

  function log(line: string) {
    console.log('[NSS]', line)
    setDebugLines(prev => [...prev, line])
  }

  useEffect(() => {
    const supabase = createClient()

    // 콜드 스타트 직후엔 Capacitor의 네이티브 플러그인 브릿지가 아직 다
    // 준비되기 전이라 Preferences 호출이 "not implemented on ios"로 실패하는
    // 게 실측 확인됨(시간이 좀 지나면 정상화됨). 준비될 때까지 짧게 재시도.
    async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 20, delayMs = 500): Promise<T | null> {
      for (let i = 0; i < retries; i++) {
        try {
          const r = await fn()
          if (i > 0) log(`${label} succeeded on try ${i + 1}`)
          return r
        } catch (e) {
          if (i === retries - 1) { log(`${label} gave up after ${retries} tries (${(retries * delayMs / 1000).toFixed(0)}s): ${String(e)}`); return null }
        }
        await new Promise(r => setTimeout(r, delayMs))
      }
      return null
    }

    async function restoreIfNeeded() {
      const { data } = await supabase.auth.getSession()
      log(`getSession session? ${!!data.session}`)
      if (data.session) return
      const result = await withRetry(() => Preferences.get({ key: REFRESH_KEY }), 'Preferences.get')
      const refreshToken = result?.value ?? null
      log(`stored refreshToken? ${!!refreshToken}`)
      if (!refreshToken) return
      const r = await supabase.auth.refreshSession({ refresh_token: refreshToken }).catch(e => ({ error: e }))
      log(`refreshSession ok? ${!('error' in r)}`)
    }
    restoreIfNeeded()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      log(`onAuthStateChange ${event} hasSession=${!!session}`)
      if (session?.refresh_token) {
        withRetry(() => Preferences.set({ key: REFRESH_KEY, value: session.refresh_token }), 'Preferences.set')
          .then(r => log(r !== null ? 'Preferences.set OK' : 'Preferences.set FAILED (see above)'))
        try { localStorage.setItem('kpick-has-logged-in', '1') } catch { /* non-critical */ }
      } else if (event === 'SIGNED_OUT') {
        Preferences.remove({ key: REFRESH_KEY }).catch(() => {})
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  if (!showDebug) return null
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '30vh', overflowY: 'auto',
      background: 'rgba(0,0,0,0.9)', color: '#0f0', fontSize: 10, fontFamily: 'monospace',
      padding: '8px', zIndex: 999999, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    }}>
      {debugLines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}

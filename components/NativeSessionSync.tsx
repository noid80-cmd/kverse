'use client'
import { useEffect, useState } from 'react'
import { Preferences } from '@capacitor/preferences'
import { createClient } from '@/lib/supabase/client'

const REFRESH_KEY = 'kpick-native-refresh-token'

// 네이티브 앱(Capacitor/WKWebView)에서는 쿠키 기반 세션이 앱 재실행 후
// 유실되는 경우가 있어("로그인이 자꾸 풀림"), 로그인 성공 시 refresh_token을
// 기기 자체 저장소(Capacitor Preferences)에도 따로 저장해두고, 콜드
// 스타트 때 쿠키 세션이 비어있으면 이걸로 복구를 시도한다.
const DEBUG_HISTORY_KEY = 'kpick-nss-debug-history'

export default function NativeSessionSync() {
  // 리로드(워밍업) 직전에 찍은 로그는 화면이 곧바로 날아가서 못 보고
  // 지나칠 수 있어, localStorage에도 남겨서 재시작 후에도 "직전에 무슨
  // 일이 있었는지" 확인 가능하게 함. 원인 확정되면 이 디버그 전체 제거.
  const [debugLines, setDebugLines] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DEBUG_HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  // 임시 디버그 오버레이(맥 없이 폰 화면만으로 확인용). window.Capacitor
  // 존재 여부로 게이트해서 일반 웹 방문자에겐 안 보임. 원인 확정되면 제거.
  const showDebug = typeof window !== 'undefined' && typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined'

  function log(line: string) {
    console.log('[NSS]', line)
    const stamped = `${new Date().toTimeString().slice(0, 8)} ${line}`
    setDebugLines(prev => {
      const next = [...prev, stamped].slice(-60)
      try { localStorage.setItem(DEBUG_HISTORY_KEY, JSON.stringify(next)) } catch { /* non-critical */ }
      return next
    })
  }

  function clearDebugHistory() {
    try { localStorage.removeItem(DEBUG_HISTORY_KEY) } catch { /* non-critical */ }
    setDebugLines([])
  }

  useEffect(() => {
    log('--- app start ---')
    // 콜드 스타트 직후 인위적 리로드로 브릿지를 "워밍업"하는 시도를 했었으나,
    // 실측 결과 리로드가 정상 발동해도 Preferences는 여전히 실패함이 확인돼
    // (구글 로그인 왕복 후에만 성공, 단순 reload()로는 재현 안 됨) 제거함.
    // 원인은 iOS 네이티브 셸(WKWebView 구성) 쪽으로 좁혀짐 — 이 저장소엔
    // 해당 코드가 없어 여기서 더 진행 불가.
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
      position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '35vh', overflowY: 'auto',
      background: 'rgba(0,0,0,0.9)', color: '#0f0', fontSize: 10, fontFamily: 'monospace',
      padding: '8px', zIndex: 999999, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    }}>
      <button onClick={clearDebugHistory} style={{ marginBottom: 6, fontSize: 10, background: '#222', color: '#0f0', border: '1px solid #0f0', borderRadius: 4, padding: '2px 6px' }}>
        clear log
      </button>
      {debugLines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}

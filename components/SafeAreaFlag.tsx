'use client'

import { useEffect } from 'react'
import { isNativeAppAsync } from '@/lib/capacitor'

// 네이티브 앱(WKWebView)은 display-mode가 standalone으로 안 잡혀서 CSS만으로는
// "상태바가 페이지를 덮는 상황"을 구분할 수 없다. Capacitor 브릿지로 판별해
// html에 표시를 남기고, --safe-top이 그걸 보고 최소 여백을 준다(globals.css).
export default function SafeAreaFlag() {
  useEffect(() => {
    let cancelled = false
    isNativeAppAsync().then(native => {
      if (!cancelled && native) document.documentElement.dataset.native = '1'
    })
    return () => { cancelled = true }
  }, [])
  return null
}

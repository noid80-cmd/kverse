export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return !!cap?.isNativePlatform?.()
}

// window.Capacitor 브릿지가 페이지 로드 타이밍에 따라 아직 안 붙어있는
// 순간이 있어(실측: 같은 세션 안에서도 페이지마다 true/false 오락가락),
// 단발성 체크로는 신뢰할 수 없다. 짧게 재시도해서 판단한다.
export async function isNativeAppAsync(retries = 5, delayMs = 200): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    if (isNativeApp()) return true
    await new Promise(r => setTimeout(r, delayMs))
  }
  return false
}

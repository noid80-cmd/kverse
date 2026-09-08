// 스토어 주소를 한 곳에 둔다. 여러 화면에서 쓰는데 각자 박아두면
// 한쪽만 고치는 일이 생긴다.

export const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6791017827'
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.kpick.twa'

/** 기기에 맞는 스토어 주소 */
export function storeUrl(): string {
  if (typeof navigator === 'undefined') return APP_STORE_URL
  return /Android/i.test(navigator.userAgent) ? PLAY_STORE_URL : APP_STORE_URL
}

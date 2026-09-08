// 잠금화면·제어센터에 뜨는 "재생 중" 카드.
//
// 아무것도 지정하지 않으면 브라우저가 알아서 채우는데, 제목은 페이지 <title>이
// 되고 그림은 파비콘 추측에 맡겨진다 — 아이폰 잠금화면에 Krookie가 아니라
// 배포 플랫폼 로고가 뜬 이유다. 무엇이 재생 중인지는 우리가 안다.

type NowPlaying = {
  title: string
  talent?: { name: string | null } | null
}

const ARTWORK: MediaImage[] = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
]

export function setNowPlaying(video: NowPlaying) {
  try {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: video.title,
      artist: video.talent?.name ?? 'Krookie',
      album: 'Krookie',
      artwork: ARTWORK,
    })
  } catch {
    // MediaMetadata가 없는 브라우저도 있다. 표시가 예전 그대로일 뿐이다.
  }
}

export function clearNowPlaying() {
  try {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = null
  } catch {}
}

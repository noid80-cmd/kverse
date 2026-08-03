const CACHE_NAME = 'kpick-v2'
const PRECACHE = ['/offline.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  )
})

// 캐시 우선(cache-first) 방식이었을 때는 배포를 아무리 새로 해도 예전에
// 캐시된 HTML/JS가 계속 우선 응답되는 문제가 있었음(네이티브 앱에서
// "고친 게 반영이 안 된다" 처럼 보이는 근본 원인 중 하나였음). 네트워크
// 우선으로 바꿔서 항상 최신 버전을 먼저 시도하고, 오프라인일 때만 캐시로
// 대체하도록 변경.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request).then(res => {
      if (res.ok) {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
      }
      return res
    }).catch(() =>
      caches.match(event.request).then(cached => cached || caches.match('/offline.html'))
    )
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, url } = event.data.json()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const isViewing = url && clientList.some(c => c.url.includes(url))
      if (isViewing) return
      return self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url },
      })
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

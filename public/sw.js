const CACHE = 'kverse-v1'
const STATIC = ['/']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  // navigation requests: network-first (always fresh content)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    )
    return
  }
  // static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})

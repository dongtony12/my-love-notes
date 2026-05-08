// my-love-notes service worker
// 캐시 버전 변경 시 숫자 올리기 → 기존 캐시 자동 정리
const CACHE_NAME = 'my-love-notes-v1'

// 앱 셸 (오프라인에서도 보일 최소 자산)
const APP_SHELL = ['/', '/login', '/manifest.json', '/icons/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // GET만 처리, 그 외는 그대로 통과
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Supabase API / Auth는 절대 캐싱 X (인증 토큰, 실시간 데이터)
  if (url.hostname.endsWith('.supabase.co')) return

  // Next.js 데이터 fetch도 패스 (서버 액션 등)
  if (url.pathname.startsWith('/_next/data')) return

  // 동일 출처 GET: network-first → 실패 시 캐시 fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 정상 응답은 캐시에 복제 저장 (오프라인 대비)
          if (response.ok) {
            const clone = response.clone()
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {})
          }
          return response
        })
        .catch(() => caches.match(request).then((m) => m || Response.error()))
    )
  }
})

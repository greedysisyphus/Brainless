// Service Worker for PWA
const CACHE_NAME = 'brainless-flight-data-v1'
const RUNTIME_CACHE = 'brainless-runtime-v1'
const BASE_PATH = '/Brainless'

// 需要快取的資源
const PRECACHE_URLS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/favicon.png`
]

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 預快取資源')
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => self.skipWaiting())
  )
})

// 啟動 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
          })
          .map((cacheName) => {
            console.log('[Service Worker] 刪除舊快取:', cacheName)
            return caches.delete(cacheName)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') {
    return
  }

  // 跳過非同源請求
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果有快取，返回快取
        if (cachedResponse) {
          return cachedResponse
        }

        // 否則從網路獲取
        return fetch(event.request)
          .then((response) => {
            // 只快取成功的回應
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // 複製回應以進行快取
            const responseToCache = response.clone()

            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })

            return response
          })
          .catch(() => {
            // 如果網路失敗，嘗試返回離線頁面
            if (event.request.destination === 'document') {
              return caches.match(`${BASE_PATH}/index.html`)
            }
          })
      })
  )
})

// 處理背景同步（如果需要）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-flight-data') {
    event.waitUntil(
      // 這裡可以添加背景同步邏輯
      console.log('[Service Worker] 背景同步航班資料')
    )
  }
})

// 處理推送通知（如果需要）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '新的航班資料更新',
    icon: `${BASE_PATH}/favicon.png`,
    badge: `${BASE_PATH}/favicon.png`,
    vibrate: [200, 100, 200],
    tag: 'flight-data-update'
  }

  event.waitUntil(
    self.registration.showNotification('航班資料更新', options)
  )
})

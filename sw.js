const CACHE_NAME = 'travel-app-v3';
const BASE = '/Ocr-one';
// 只快取一定存在的核心檔案，圖示讓 fetch handler 動態快取
const STATIC_ASSETS = [
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/sw.js'
];

// ── 安裝：預快取靜態資源 ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── 啟動：清除舊版快取 ────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── 攔截請求 ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // OCR / 匯率 API → 直接走網路
  if (url.hostname.includes('ocr.space') || url.hostname.includes('er-api.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 其餘：Cache First（靜態資源優先快取）
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

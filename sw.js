const CACHE_NAME = 'ppa-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './passages.json',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isCachedCdn = url.href.includes('cdn.jsdelivr.net/npm/canvas-confetti');
  // Skip non-origin requests except for cached CDN resources
  if (url.origin !== location.origin && !isCachedCdn) return;
  event.respondWith(
    (async () => {
      // Honor cache: 'no-store' by bypassing cache and always fetching from network
      if (event.request.cache === 'no-store') {
        return fetch(event.request).catch(() => Response.error());
      }
      // For other requests, cache-first
      const cached = await caches.match(event.request);
      return cached || fetch(event.request).catch(() => Response.error());
    })()
  );
});

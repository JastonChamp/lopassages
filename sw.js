const CACHE_NAME = 'ppa-v1';
const ASSETS = [
 './',
  './index.html',
  './styles.css',
  './script.js',
  './passages.json'
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
  if (url.origin !== location.origin) return;
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

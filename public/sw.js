const CACHE = 'pocket-pitlane-v2';
const SHELL = ['/', '/index.html', '/demo', '/privacy', '/terms', '/controller', '/404.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) return;
  const sameOrigin = event.data.urls.filter((url) => {
    try { return new URL(url, self.location.origin).origin === self.location.origin; } catch { return false; }
  });
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(sameOrigin.map((url) => cache.add(url).catch(() => undefined)))));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(event.request, { ignoreVary: true })) || (event.request.mode === 'navigate' ? caches.match('/index.html', { ignoreVary: true }) : undefined) || Response.error();
    }
  })());
});

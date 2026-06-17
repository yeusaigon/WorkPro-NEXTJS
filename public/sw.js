const CACHE_NAME = 'aworkpro-cache-v5';
const urlsToCache = ['/', '/login/', '/admin/', '/admin/dashboard/', '/admin/journal/', '/admin/templates/', '/admin/settings/', '/admin/report/', '/logo.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isHtmlRequest =
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html');
  const isStaticAsset =
    requestUrl.pathname.startsWith('/_next/static/') ||
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.woff2');

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }

          return networkResponse;
        });
      }),
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});

self.addEventListener('activate', (event) => {
  const whitelist = [CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.map((name) => (whitelist.includes(name) ? undefined : caches.delete(name)))),
      )
      .then(() => self.clients.claim()),
  );
});

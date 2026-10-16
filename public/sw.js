// =============================================================================
// ALI MOBILES POS - Progressive Web App (PWA) Service Worker
// Enables Desktop Installation (Browser Install Button), Offline Shell, & Fast Cache
// =============================================================================

const CACHE_NAME = 'ali-mobiles-pos-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app_icon.png',
  '/favicon.png',
];

// Install Event - Pre-cache critical app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-caching partial notice:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Network First with Cache Fallback
// Required by Chromium (Chrome, Brave, Edge) for Desktop App Installability
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests or browser extension requests
  if (event.request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Always bypass local dev server / dynamic chunks to avoid stale code during dev
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/src/') ||
    url.search.includes('v=')
  ) {
    return;
  }

  // Supabase API requests: always network first so POS & stock data is live
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // App Shell & Static Assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

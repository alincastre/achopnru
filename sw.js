const CACHE_NAME = 'acho-pnru-v1';

// Static assets to pre-cache on installation
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/about.html',
  '/referral.html',
  '/ambulance.html',
  '/homevisit.html',
  '/hotline.html',
  '/manifest.json'
];

// 1. Install Event - Pre-cache core HTML pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching core static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Network First with Cache Fallback for dynamic content,
// Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip browser extensions or cross-origin analytics if needed
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch fresh version from network in the background
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Clone and cache successful response
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed (offline)
          console.warn('[Service Worker] Network request failed. Serving offline fallback.');
        });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
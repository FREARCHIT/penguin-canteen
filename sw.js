const CACHE_NAME = 'penguin-canteen-v2';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './logo.svg'
];

// Install event: Cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network first, fall back to cache
// This strategy is best for development so you see changes, but provides offline fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            // Only cache requests from our own origin (not CDNs yet to avoid CORS complexity in this simple sw)
            if (event.request.url.startsWith(self.location.origin)) {
              cache.put(event.request, responseToCache);
            }
          });

        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // If strictly offline and requesting index.html, return it from cache
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
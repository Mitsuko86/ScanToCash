const CACHE_NAME = 'scantocash-v4-help';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js'
];

// Install - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache API calls (BooksRun lookups must be fresh)
  if (url.hostname.includes('textbookflips86.workers.dev') || 
      url.hostname.includes('booksrun.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else: cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Serve from cache
      }

      // Not in cache, fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Add to cache for future use
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      // Offline fallback - show cached index if available
      return caches.match('/index.html');
    })
  );
});

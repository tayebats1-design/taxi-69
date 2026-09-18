// Service Worker for Taxi Abiodh Sidi Cheikh
// Handles background sync, cache offline, and notification relays
const CACHE_NAME = 'taxi-abiodh-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW: Precache asset error', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler - network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Pass API and external requests through network directly
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('tile.openstreetmap.org') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background sync for offline trips or location pings
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-taxi-location') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_GPS_PULSE', timestamp: Date.now() });
        });
      })
    );
  }
});

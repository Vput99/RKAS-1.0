
// Service Worker sederhana untuk memenuhi syarat PWA (Installable)
const CACHE_NAME = 'rkas-cache-v2'; // Updated to v2 to force refresh

// Saat install, cache file statis dasar
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Saat activate, claim clients dan hapus cache lama
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
    }).then(() => clients.claim())
  );
});

// Strategi: Network First (Utamakan internet, kalau offline baru cek cache/gagal)
// Ini agar saat development data tidak nyangkut di cache lama
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

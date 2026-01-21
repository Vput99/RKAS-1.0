// Service Worker sederhana untuk memenuhi syarat PWA (Installable)
const CACHE_NAME = 'rkas-cache-v1';

// Saat install, cache file statis dasar
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Saat activate, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
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
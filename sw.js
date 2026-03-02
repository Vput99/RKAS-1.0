
// Service Worker sederhana untuk memenuhi syarat PWA (Installable)
const CACHE_NAME = 'rkas-cache-v3';

// Saat install, JANGAN skipWaiting agar tidak memaksa reload halaman
self.addEventListener('install', (event) => {
  // Tidak pakai self.skipWaiting() agar tidak auto-refresh saat pindah tab
  console.log('SW: Installed, waiting for activation...');
});

// Saat activate, hapus cache lama tapi JANGAN claim clients
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
    // Tidak pakai clients.claim() agar tidak memicu reload otomatis
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

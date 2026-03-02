import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker for PWA (tanpa auto-reload)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        // Cek update secara manual, tapi JANGAN reload otomatis
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('SW: New version available, will apply on next visit.');
                // TIDAK memanggil window.location.reload() agar tidak refresh sendiri
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });

  // GUARD: Cegah reload otomatis saat controller berubah
  // Ini yang menyebabkan halaman refresh saat pindah tab
  let isFirstController = true;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isFirstController) {
      isFirstController = false;
      return; // Skip reload pertama kali (saat halaman baru dibuka)
    }
    // JANGAN reload — biarkan user tetap di halaman yang sama
    console.log('SW: Controller changed, NOT reloading page.');
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
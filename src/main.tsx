import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Register Service Worker for Desktop App Installability & Offline Cache
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Clean dev registrations so hot module reloading is never stale
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  } else if (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA SW] Registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA SW] Registration failed:', err);
        });
    });
  }
}

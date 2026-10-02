const CACHE_NAME = 'mampfo-v0.8.3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './supabase-config.js',
  './cloud.js',
  './bls.js',
  './off.js',
  './barcode.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // v0.8.3: Externe Datenquellen niemals über den App-Cache bedienen.
  // Dazu gehören insbesondere Supabase und Open Food Facts. Sonst kann ein
  // Gerät beim Sync veraltete Cloud-Antworten aus Cache Storage erhalten.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(error => {
      // Nur echte Seitennavigationen erhalten offline die App-Shell zurück.
      // Für fehlende JS/CSS/sonstige Requests darf keine HTML-Datei als
      // Ersatzantwort eingeschleust werden.
      if (request.mode === 'navigate') return caches.match('./index.html');
      throw error;
    }))
  );
});

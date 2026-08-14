const CACHE_NAME = 'ayu-music-cache-v1';

// Static assets to cache for offline App Shell support
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/animations.css',
  './css/responsive.css',
  './js/data.js',
  './js/api.js',
  './js/player.js',
  './js/navigation.js',
  './js/home.js',
  './js/search.js',
  './js/library.js',
  './js/socials.js',
  './js/profile.js',
  './js/app.js',
  './js/interactions.js',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// Install event - Cache static app shell safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Handle requests safely
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // STRICT RULE: Completely bypass service worker for audio/video streaming, byte range requests, APIs, and external media
  if (
    req.method !== 'GET' ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.m4a') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.hostname.includes('api.music.vispark.in') ||
    url.hostname.includes('saavn') ||
    url.hostname.includes('jiosaavn') ||
    url.hostname.includes('lrclib.net') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('googlevideo') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('jsdelivr.net') ||
    req.headers.get('range') // Audio/video streaming byte range requests
  ) {
    return; // Let browser handle network request directly
  }

  // Stale-While-Revalidate pattern for local static assets
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

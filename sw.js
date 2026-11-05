// オフラインでも開けるようにする。内容を変えたら VERSION を上げる。
const VERSION = 'v1';
const CACHE = `musclelog-${VERSION}`;
const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/catalog.js',
  'js/charts.js',
  'js/logic.js',
  'js/store.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => (request.mode === 'navigate' ? caches.match('./') : Response.error()));
    }),
  );
});

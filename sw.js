const CACHE_PREFIX = 'sounds-english-';
const CACHE_NAME = CACHE_PREFIX + 'v7';
const JUNIOR_DATA = './data/junior-pairs.json';
const APP_SHELL = [
  './',
  './index.html',
  './game.html',
  './game.css',
  './js/game-engine.js',
  JUNIOR_DATA,
  './styles.css',
  './js/app.js',
  './js/audio-engine.js',
  './js/gemini-tts.js',
  './data/curriculum.js',
  './data/glossary.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

async function precache() {
  const response = await fetch(JUNIOR_DATA);
  if (!response.ok) throw new Error('Unable to load the Sound Delivery audio list');
  const { worlds } = await response.json();
  const recordings = worlds.flatMap(({ pairs }) =>
    pairs.flatMap(({ recordings }) => recordings.flatMap(({ files }) => files))
  );
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([...APP_SHELL, ...new Set(recordings.map((file) => './' + file.toUpperCase()))]);
  await self.skipWaiting();
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.registration.scope)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});


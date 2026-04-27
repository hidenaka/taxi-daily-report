const CACHE_NAME = 'taxi-daily-v50';
const STATIC_FILES = [
  './',
  './index.html',
  './input.html',
  './detail.html',
  './calendar.html',
  './review.html',
  './support.html',
  './settings.html',
  './css/style.css',
  './js/app.js',
  './js/parser.js',
  './js/payroll.js',
  './js/storage.js',
  './js/weather.js',
  './js/chart-helpers.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // GitHub APIや天候APIはキャッシュせず素通し
  if (url.hostname === 'api.github.com' || url.hostname.includes('open-meteo')) return;
  // HTMLとJSはネットワーク優先（更新を取りこぼさない）、失敗時のみキャッシュ
  const isHtmlOrJs = e.request.destination === 'document' || /\.(html|js)$/i.test(url.pathname);
  if (isHtmlOrJs) {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // それ以外（CSS、画像、manifest）はキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

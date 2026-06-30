const CACHE_PREFIX = 'taxi-daily-'; // このアプリ専用のキャッシュ接頭辞
const CACHE_NAME = CACHE_PREFIX + 'v319';
// アプリ本体（同一オリジン）。install 時に原子的にプリキャッシュする。
const STATIC_FILES = [
  './',
  './index.html',
  './input.html',
  './ocr-import.html',
  './detail.html',
  './calendar.html',
  './review.html',
  './support.html',
  './settings.html',
  './groups.html',
  './bulk-input.html',
  './guide.html',
  './subscribe.html',
  './tools.html',
  './setup-request.html',
  './tools/index.html',
  './tools/ic.html',
  './tools/arrivals.html',
  './tools/stands.html',
  './tools/airport-fare.html',
  './tools/js/airport-fare-app.js?b=acbe32f09f49',
  './tools/js/airport-fare-data.js?b=acbe32f09f49',
  './tools/js/airport-fare-map.js?b=acbe32f09f49',
  './tools/js/airport-fare-card.js?b=acbe32f09f49',
  './tools/data/airport-fixed-fares.json',
  './tools/data/tokyo-ward-shapes.json',
  './tools/js/stands-app.js?b=acbe32f09f49',
  './tools/js/stands-tab.js?b=acbe32f09f49',
  './tools/js/stands-data.js?b=acbe32f09f49',
  './tools/js/stands-map.js?b=acbe32f09f49',
  './tools/js/stands-geo.js?b=acbe32f09f49',
  './tools/js/stands-schema.js?b=acbe32f09f49',
  './tools/js/stands-editor.js?b=acbe32f09f49',
  './tools/js/stands-georef.js?b=acbe32f09f49',
  './tools/js/stands-georef-ui.js?b=acbe32f09f49',
  './tools/js/util.js?b=acbe32f09f49',
  './tools/js/geo.js?b=acbe32f09f49',
  './vendor/leaflet/leaflet.js?b=acbe32f09f49',
  './vendor/leaflet/leaflet.css',
  './css/style.css',
  './css/ocr-import.css',
  './js/app.js?b=acbe32f09f49',
  './js/app-update.js?b=acbe32f09f49',
  './js/first-run.js?b=acbe32f09f49',
  './js/parser.js?b=acbe32f09f49',
  './js/payroll.js?b=acbe32f09f49',
  './js/home-metrics.js?b=acbe32f09f49',
  './js/storage.js?b=acbe32f09f49',
  './js/cache.js?b=acbe32f09f49',
  './js/userid.js?b=acbe32f09f49',
  './js/weather.js?b=acbe32f09f49',
  './js/chart-helpers.js?b=acbe32f09f49',
  './js/rec-area.js?b=acbe32f09f49',
  './js/gps-privacy-banner.js?b=acbe32f09f49',
  './js/user-doc.js?b=acbe32f09f49',
  './js/invite-url.js?b=acbe32f09f49',
  './js/slug-gen.js?b=acbe32f09f49',
  './js/qr-code.js?b=acbe32f09f49',
  './js/aggregate-access.js?b=acbe32f09f49',
  './js/help-toggle.js?b=acbe32f09f49',
  './js/help-video.js?b=acbe32f09f49',
  './js/help-video-registry.js?b=acbe32f09f49',
  './js/legal-footer.js?b=acbe32f09f49',
  './js/subscription-state.js?b=acbe32f09f49',
  './js/signup-notify.js?b=acbe32f09f49',
  './js/access-control.js?b=acbe32f09f49',
  './js/planned-shifts.js?b=acbe32f09f49',
  './js/ocr-import.js?b=acbe32f09f49',
  './js/default-config.js?b=acbe32f09f49',
  './js/firebase-init.js?b=acbe32f09f49',
  './js/firebase-auth.js?b=acbe32f09f49',
  './js/auth-state.js?b=acbe32f09f49',
  './js/firebase-storage.js?b=acbe32f09f49',
  './js/drive-cache.js?b=acbe32f09f49',
  './js/company-config.js?b=acbe32f09f49',
  './js/admin-companies.js?b=acbe32f09f49',
  './js/admin-assign-company.js?b=acbe32f09f49',
  './js/sub-cache.js?b=acbe32f09f49',
  './js/crypto-utils.js?b=acbe32f09f49',
  './js/invite-crypto.js?b=acbe32f09f49',
  './js/vehicle-filter.js?b=acbe32f09f49',
  './js/setup-request-app.js?b=acbe32f09f49',
  './js/setup-request-validate.js?b=acbe32f09f49',
  './js/group-client.js?b=acbe32f09f49',
  './js/groups-app.js?b=acbe32f09f49',
  './tools/js/countdown.js?b=acbe32f09f49',
  './tools/js/timer-sync.js?b=acbe32f09f49',
  './tools/js/timer-cloud.js?b=acbe32f09f49',
  './tools/js/arrivals-app.js?b=acbe32f09f49',
  './tools/js/arrivals-data.js?b=acbe32f09f49',
  './tools/js/arrivals-render.js?b=acbe32f09f49',
  './tools/js/forecast-section.js?b=acbe32f09f49',
  './tools/js/pool-status-section.js?b=acbe32f09f49',
  './tools/js/airline-color.js?b=acbe32f09f49',
  './tools/js/exit-favorites.js?b=acbe32f09f49',
  './legal/tokuteishou.html',
  './legal/terms.html',
  './legal/privacy.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './coach.html',
  './js/coach/daily-goal.js?b=acbe32f09f49',
  './js/coach/fact-engine.js?b=acbe32f09f49',
  './js/coach/answer-composer.js?b=acbe32f09f49',
  './js/coach/answer-format.js?b=acbe32f09f49',
  './js/coach/place.js?b=acbe32f09f49',
  './js/coach/coach-context.js?b=acbe32f09f49',
  './js/coach/coach-run.js?b=acbe32f09f49',
  './js/coach/coach-ui.js?b=acbe32f09f49',
  './js/coach/coach-flag.js?b=acbe32f09f49'
];
// 外部依存（Firebase SDK・バージョン固定で不変）。失敗が install 全体を壊さないよう個別に追加。
const EXTERNAL_FILES = [
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_FILES); // 同一オリジン: 原子的（1つでも失敗で install 失敗）
    await Promise.allSettled(EXTERNAL_FILES.map(u => cache.add(u))); // 外部: 失敗許容
  })());
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // このアプリ自身(taxi-daily-)の旧版キャッシュのみ削除。
    // 同一オリジンの他アプリ（タイマー等）のキャッシュには絶対に触れない。
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return; // POST等（Firestore通信など）は素通し
  const url = new URL(e.request.url);
  // GitHub API・天候API・migrate/admin はキャッシュせず素通し
  if (url.hostname === 'api.github.com' || url.hostname.includes('open-meteo')) return;
  if (url.pathname.includes('/migrate.html') || url.pathname.includes('/admin.html')) return;
  // 強制アップデート(復旧)ページは絶対にキャッシュさせない＝常に最新をネットから取得。
  // （このページ自身が SW/キャッシュを消す役目なので、古い版が出ると意味がない）
  if (url.pathname.includes('/update.html')) return;
  // 使い方動画は素通し（キャッシュしない）。<video> の range/シークを壊さないため・オフライン非対応。
  if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return;
  // 使い方動画のサムネ(media/help/*.jpg)もキャッシュに溜めない（差し替え時の陳腐化防止）。
  if (url.pathname.includes('/media/help/')) return;

  // データJSON（arrivals 等、デプロイ外で随時更新される）はネットワーク優先で即反映
  if (/\.json$/i.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(async res => {
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(e.request, res.clone());
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // アプリ本体（HTML/JS/CSS/画像/Firebase SDK 等）はキャッシュ優先 = 即起動。
  // キャッシュヒット時は裏でネットワーク更新を取得し次回に備える（stale-while-revalidate）。
  // デプロイ時の更新は CACHE_NAME のbumpで新SWが全ファイルを再キャッシュして反映する。
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(e.request);
    const network = fetch(e.request).then(res => {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (cached) {
      e.waitUntil(network.catch(() => {})); // 裏で更新（起動はブロックしない）
      return cached;
    }
    return network.catch(() => caches.match(e.request));
  })());
});

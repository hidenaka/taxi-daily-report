const CACHE_PREFIX = 'taxi-daily-'; // このアプリ専用のキャッシュ接頭辞
const CACHE_NAME = CACHE_PREFIX + 'v346';
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
  './tools/noriba-trends.html',
  './tools/stands.html',
  './tools/airport-fare.html',
  './tools/js/airport-fare-app.js?b=581df6978d1f',
  './tools/js/airport-fare-data.js?b=581df6978d1f',
  './tools/js/airport-fare-map.js?b=581df6978d1f',
  './tools/js/airport-fare-card.js?b=581df6978d1f',
  './tools/data/airport-fixed-fares.json',
  './tools/data/tokyo-ward-shapes.json',
  './tools/js/stands-app.js?b=581df6978d1f',
  './tools/js/stands-tab.js?b=581df6978d1f',
  './tools/js/stands-data.js?b=581df6978d1f',
  './tools/js/stands-map.js?b=581df6978d1f',
  './tools/js/stands-geo.js?b=581df6978d1f',
  './tools/js/stands-schema.js?b=581df6978d1f',
  './tools/js/stands-editor.js?b=581df6978d1f',
  './tools/js/stands-georef.js?b=581df6978d1f',
  './tools/js/stands-georef-ui.js?b=581df6978d1f',
  './tools/js/util.js?b=581df6978d1f',
  './tools/js/geo.js?b=581df6978d1f',
  './vendor/leaflet/leaflet.js?b=581df6978d1f',
  './vendor/leaflet/leaflet.css',
  './css/style.css',
  './css/ocr-import.css',
  './js/app.js?b=581df6978d1f',
  './js/app-update.js?b=581df6978d1f',
  './js/first-run.js?b=581df6978d1f',
  './js/parser.js?b=581df6978d1f',
  './js/payroll.js?b=581df6978d1f',
  './js/home-metrics.js?b=581df6978d1f',
  './js/storage.js?b=581df6978d1f',
  './js/cache.js?b=581df6978d1f',
  './js/userid.js?b=581df6978d1f',
  './js/weather.js?b=581df6978d1f',
  './js/chart-helpers.js?b=581df6978d1f',
  './js/rec-area.js?b=581df6978d1f',
  './js/gps-privacy-banner.js?b=581df6978d1f',
  './js/user-doc.js?b=581df6978d1f',
  './js/invite-url.js?b=581df6978d1f',
  './js/slug-gen.js?b=581df6978d1f',
  './js/qr-code.js?b=581df6978d1f',
  './js/aggregate-access.js?b=581df6978d1f',
  './js/help-toggle.js?b=581df6978d1f',
  './js/help-video.js?b=581df6978d1f',
  './js/help-video-registry.js?b=581df6978d1f',
  './js/legal-footer.js?b=581df6978d1f',
  './js/subscription-state.js?b=581df6978d1f',
  './js/signup-notify.js?b=581df6978d1f',
  './js/access-control.js?b=581df6978d1f',
  './js/planned-shifts.js?b=581df6978d1f',
  './js/ocr-import.js?b=581df6978d1f',
  './js/default-config.js?b=581df6978d1f',
  './js/firebase-init.js?b=581df6978d1f',
  './js/firebase-auth.js?b=581df6978d1f',
  './js/auth-state.js?b=581df6978d1f',
  './js/firebase-storage.js?b=581df6978d1f',
  './js/drive-cache.js?b=581df6978d1f',
  './js/company-config.js?b=581df6978d1f',
  './js/admin-companies.js?b=581df6978d1f',
  './js/admin-assign-company.js?b=581df6978d1f',
  './js/admin-user-list.js?b=581df6978d1f',
  './js/sub-cache.js?b=581df6978d1f',
  './js/crypto-utils.js?b=581df6978d1f',
  './js/invite-crypto.js?b=581df6978d1f',
  './js/vehicle-filter.js?b=581df6978d1f',
  './js/setup-request-app.js?b=581df6978d1f',
  './js/setup-request-validate.js?b=581df6978d1f',
  './js/group-client.js?b=581df6978d1f',
  './js/groups-app.js?b=581df6978d1f',
  './tools/js/countdown.js?b=581df6978d1f',
  './tools/js/timer-sync.js?b=581df6978d1f',
  './tools/js/timer-cloud.js?b=581df6978d1f',
  './tools/js/arrivals-app.js?b=581df6978d1f',
  './tools/js/arrivals-data.js?b=581df6978d1f',
  './tools/js/arrivals-render.js?b=581df6978d1f',
  './tools/js/forecast-section.js?b=581df6978d1f',
  './tools/js/noriba-trends.js?b=581df6978d1f',
  './tools/js/pool-status-section.js?b=581df6978d1f',
  './tools/js/airline-color.js?b=581df6978d1f',
  './tools/js/exit-favorites.js?b=581df6978d1f',
  './legal/tokuteishou.html',
  './legal/terms.html',
  './legal/privacy.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './coach.html',
  './js/coach/daily-goal.js?b=581df6978d1f',
  './js/coach/fact-engine.js?b=581df6978d1f',
  './js/coach/answer-composer.js?b=581df6978d1f',
  './js/coach/answer-format.js?b=581df6978d1f',
  './js/coach/place.js?b=581df6978d1f',
  './js/coach/coach-context.js?b=581df6978d1f',
  './js/coach/coach-run.js?b=581df6978d1f',
  './js/coach/coach-ui.js?b=581df6978d1f',
  './js/coach/coach-flag.js?b=581df6978d1f'
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

const CACHE_PREFIX = 'taxi-daily-'; // このアプリ専用のキャッシュ接頭辞
const CACHE_NAME = CACHE_PREFIX + 'v322';
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
  './tools/js/airport-fare-app.js?b=f7ce20c806ef',
  './tools/js/airport-fare-data.js?b=f7ce20c806ef',
  './tools/js/airport-fare-map.js?b=f7ce20c806ef',
  './tools/js/airport-fare-card.js?b=f7ce20c806ef',
  './tools/data/airport-fixed-fares.json',
  './tools/data/tokyo-ward-shapes.json',
  './tools/js/stands-app.js?b=f7ce20c806ef',
  './tools/js/stands-tab.js?b=f7ce20c806ef',
  './tools/js/stands-data.js?b=f7ce20c806ef',
  './tools/js/stands-map.js?b=f7ce20c806ef',
  './tools/js/stands-geo.js?b=f7ce20c806ef',
  './tools/js/stands-schema.js?b=f7ce20c806ef',
  './tools/js/stands-editor.js?b=f7ce20c806ef',
  './tools/js/stands-georef.js?b=f7ce20c806ef',
  './tools/js/stands-georef-ui.js?b=f7ce20c806ef',
  './tools/js/util.js?b=f7ce20c806ef',
  './tools/js/geo.js?b=f7ce20c806ef',
  './vendor/leaflet/leaflet.js?b=f7ce20c806ef',
  './vendor/leaflet/leaflet.css',
  './css/style.css',
  './css/ocr-import.css',
  './js/app.js?b=f7ce20c806ef',
  './js/app-update.js?b=f7ce20c806ef',
  './js/first-run.js?b=f7ce20c806ef',
  './js/parser.js?b=f7ce20c806ef',
  './js/payroll.js?b=f7ce20c806ef',
  './js/home-metrics.js?b=f7ce20c806ef',
  './js/storage.js?b=f7ce20c806ef',
  './js/cache.js?b=f7ce20c806ef',
  './js/userid.js?b=f7ce20c806ef',
  './js/weather.js?b=f7ce20c806ef',
  './js/chart-helpers.js?b=f7ce20c806ef',
  './js/rec-area.js?b=f7ce20c806ef',
  './js/gps-privacy-banner.js?b=f7ce20c806ef',
  './js/user-doc.js?b=f7ce20c806ef',
  './js/invite-url.js?b=f7ce20c806ef',
  './js/slug-gen.js?b=f7ce20c806ef',
  './js/qr-code.js?b=f7ce20c806ef',
  './js/aggregate-access.js?b=f7ce20c806ef',
  './js/help-toggle.js?b=f7ce20c806ef',
  './js/help-video.js?b=f7ce20c806ef',
  './js/help-video-registry.js?b=f7ce20c806ef',
  './js/legal-footer.js?b=f7ce20c806ef',
  './js/subscription-state.js?b=f7ce20c806ef',
  './js/signup-notify.js?b=f7ce20c806ef',
  './js/access-control.js?b=f7ce20c806ef',
  './js/planned-shifts.js?b=f7ce20c806ef',
  './js/ocr-import.js?b=f7ce20c806ef',
  './js/default-config.js?b=f7ce20c806ef',
  './js/firebase-init.js?b=f7ce20c806ef',
  './js/firebase-auth.js?b=f7ce20c806ef',
  './js/auth-state.js?b=f7ce20c806ef',
  './js/firebase-storage.js?b=f7ce20c806ef',
  './js/drive-cache.js?b=f7ce20c806ef',
  './js/company-config.js?b=f7ce20c806ef',
  './js/admin-companies.js?b=f7ce20c806ef',
  './js/admin-assign-company.js?b=f7ce20c806ef',
  './js/sub-cache.js?b=f7ce20c806ef',
  './js/crypto-utils.js?b=f7ce20c806ef',
  './js/invite-crypto.js?b=f7ce20c806ef',
  './js/vehicle-filter.js?b=f7ce20c806ef',
  './js/setup-request-app.js?b=f7ce20c806ef',
  './js/setup-request-validate.js?b=f7ce20c806ef',
  './js/group-client.js?b=f7ce20c806ef',
  './js/groups-app.js?b=f7ce20c806ef',
  './tools/js/countdown.js?b=f7ce20c806ef',
  './tools/js/timer-sync.js?b=f7ce20c806ef',
  './tools/js/timer-cloud.js?b=f7ce20c806ef',
  './tools/js/arrivals-app.js?b=f7ce20c806ef',
  './tools/js/arrivals-data.js?b=f7ce20c806ef',
  './tools/js/arrivals-render.js?b=f7ce20c806ef',
  './tools/js/forecast-section.js?b=f7ce20c806ef',
  './tools/js/pool-status-section.js?b=f7ce20c806ef',
  './tools/js/airline-color.js?b=f7ce20c806ef',
  './tools/js/exit-favorites.js?b=f7ce20c806ef',
  './legal/tokuteishou.html',
  './legal/terms.html',
  './legal/privacy.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './coach.html',
  './js/coach/daily-goal.js?b=f7ce20c806ef',
  './js/coach/fact-engine.js?b=f7ce20c806ef',
  './js/coach/answer-composer.js?b=f7ce20c806ef',
  './js/coach/answer-format.js?b=f7ce20c806ef',
  './js/coach/place.js?b=f7ce20c806ef',
  './js/coach/coach-context.js?b=f7ce20c806ef',
  './js/coach/coach-run.js?b=f7ce20c806ef',
  './js/coach/coach-ui.js?b=f7ce20c806ef',
  './js/coach/coach-flag.js?b=f7ce20c806ef'
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

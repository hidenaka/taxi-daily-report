const CACHE_PREFIX = 'taxi-daily-'; // このアプリ専用のキャッシュ接頭辞
const CACHE_NAME = CACHE_PREFIX + 'v471';
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
  './tools/radar.html',
  './tools/js/radar-app.js?b=39110c0c48aa',
  './tools/js/radar-data.js?b=39110c0c48aa',
  './tools/js/radar-weather.js?b=39110c0c48aa',
  './vendor/maplibre/maplibre-gl.js?b=39110c0c48aa',
  './vendor/maplibre/maplibre-gl.css',
  './tools/js/koji-data.js?b=39110c0c48aa',
  './tools/js/koji-layer.js?b=39110c0c48aa',
  './tools/js/koji-ui.js?b=39110c0c48aa',
  './tools/data/koji.json',
  './tools/data/expressways.geojson',
  './tools/data/muni.json',
  './tools/airport-fare.html',
  './tools/js/airport-fare-app.js?b=39110c0c48aa',
  './tools/js/airport-fare-data.js?b=39110c0c48aa',
  './tools/js/airport-fare-map.js?b=39110c0c48aa',
  './tools/js/airport-fare-card.js?b=39110c0c48aa',
  './tools/data/airport-fixed-fares.json',
  './tools/data/tokyo-ward-shapes.json',
  './tools/js/stands-app.js?b=39110c0c48aa',
  './tools/js/stands-tab.js?b=39110c0c48aa',
  './tools/js/stands-data.js?b=39110c0c48aa',
  './tools/js/stands-map.js?b=39110c0c48aa',
  './tools/js/stands-geo.js?b=39110c0c48aa',
  './tools/js/stands-schema.js?b=39110c0c48aa',
  './tools/js/stands-editor.js?b=39110c0c48aa',
  './tools/js/stands-georef.js?b=39110c0c48aa',
  './tools/js/stands-georef-ui.js?b=39110c0c48aa',
  './tools/js/util.js?b=39110c0c48aa',
  './tools/js/geo.js?b=39110c0c48aa',
  './vendor/leaflet/leaflet.js?b=39110c0c48aa',
  './vendor/leaflet/leaflet.css',
  './css/style.css',
  './css/ocr-import.css',
  './js/app.js?b=39110c0c48aa',
  './js/app-update.js?b=39110c0c48aa',
  './js/first-run.js?b=39110c0c48aa',
  './js/parser.js?b=39110c0c48aa',
  './js/payroll.js?b=39110c0c48aa',
  './js/home-metrics.js?b=39110c0c48aa',
  './js/storage.js?b=39110c0c48aa',
  './js/cache.js?b=39110c0c48aa',
  './js/userid.js?b=39110c0c48aa',
  './js/weather.js?b=39110c0c48aa',
  './js/chart-helpers.js?b=39110c0c48aa',
  './js/rec-area.js?b=39110c0c48aa',
  './js/area-geo.js?b=39110c0c48aa',
  './js/data/area-coords.json',
  './js/gps-privacy-banner.js?b=39110c0c48aa',
  './js/user-doc.js?b=39110c0c48aa',
  './js/invite-url.js?b=39110c0c48aa',
  './js/slug-gen.js?b=39110c0c48aa',
  './js/qr-code.js?b=39110c0c48aa',
  './js/aggregate-access.js?b=39110c0c48aa',
  './js/help-toggle.js?b=39110c0c48aa',
  './js/help-video.js?b=39110c0c48aa',
  './js/help-video-registry.js?b=39110c0c48aa',
  './js/legal-footer.js?b=39110c0c48aa',
  './js/subscription-state.js?b=39110c0c48aa',
  './js/signup-notify.js?b=39110c0c48aa',
  './js/access-control.js?b=39110c0c48aa',
  './js/planned-shifts.js?b=39110c0c48aa',
  './js/ocr-import.js?b=39110c0c48aa',
  './js/default-config.js?b=39110c0c48aa',
  './js/firebase-init.js?b=39110c0c48aa',
  './js/firebase-auth.js?b=39110c0c48aa',
  './js/auth-state.js?b=39110c0c48aa',
  './js/firebase-storage.js?b=39110c0c48aa',
  './js/drive-cache.js?b=39110c0c48aa',
  './js/load-error-banner.js?b=39110c0c48aa',
  './js/company-config.js?b=39110c0c48aa',
  './js/admin-companies.js?b=39110c0c48aa',
  './js/admin-assign-company.js?b=39110c0c48aa',
  './js/admin-user-list.js?b=39110c0c48aa',
  './js/sub-cache.js?b=39110c0c48aa',
  './js/crypto-utils.js?b=39110c0c48aa',
  './js/invite-crypto.js?b=39110c0c48aa',
  './js/vehicle-filter.js?b=39110c0c48aa',
  './js/setup-request-app.js?b=39110c0c48aa',
  './js/setup-request-validate.js?b=39110c0c48aa',
  './js/group-client.js?b=39110c0c48aa',
  './js/groups-app.js?b=39110c0c48aa',
  './tools/js/countdown.js?b=39110c0c48aa',
  './tools/js/timer-sync.js?b=39110c0c48aa',
  './tools/js/timer-cloud.js?b=39110c0c48aa',
  './tools/js/arrivals-app.js?b=39110c0c48aa',
  './tools/js/arrivals-data.js?b=39110c0c48aa',
  './tools/js/arrivals-render.js?b=39110c0c48aa',
  './tools/js/forecast-section.js?b=39110c0c48aa',
  './tools/js/noriba-trends.js?b=39110c0c48aa',
  './tools/js/pool-status-section.js?b=39110c0c48aa',
  './tools/js/stand-flow.js?b=39110c0c48aa',
  './tools/js/airline-color.js?b=39110c0c48aa',
  './tools/js/exit-favorites.js?b=39110c0c48aa',
  './legal/tokuteishou.html',
  './legal/terms.html',
  './legal/privacy.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './coach.html',
  './js/coach/daily-goal.js?b=39110c0c48aa',
  './js/coach/fact-engine.js?b=39110c0c48aa',
  './js/coach/answer-composer.js?b=39110c0c48aa',
  './js/coach/answer-format.js?b=39110c0c48aa',
  './js/coach/place.js?b=39110c0c48aa',
  './js/coach/coach-context.js?b=39110c0c48aa',
  './js/coach/coach-run.js?b=39110c0c48aa',
  './js/coach/coach-ui.js?b=39110c0c48aa',
  './js/coach/coach-flag.js?b=39110c0c48aa'
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

// 画面の「今すぐ更新」からの合図。待機中のまま止まっている新SWを即座に交代させる。
// install で skipWaiting() を呼んでいても、インストール中にタップされた等で
// 待機のまま残ることがある。そのときリロードだけしても古いSWが応答し続けるため、
// 「押しても更新されない」状態になっていた(2026-09-12 本人報告)。
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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
  // 雨雲レーダーのタイルと時刻一覧は素通し。5分ごとに新しいURLが増えるので
  // キャッシュに入れると際限なく溜まり、古い雨雲が残る。
  if (url.hostname === 'www.jma.go.jp') return;
  if (url.pathname.includes('/migrate.html') || url.pathname.includes('/admin.html')) return;
  // 強制アップデート(復旧)ページは絶対にキャッシュさせない＝常に最新をネットから取得。
  // （このページ自身が SW/キャッシュを消す役目なので、古い版が出ると意味がない）
  if (url.pathname.includes('/update.html')) return;
  // 使い方動画は素通し（キャッシュしない）。<video> の range/シークを壊さないため・オフライン非対応。
  if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return;
  // 使い方動画のサムネ(media/help/*.jpg)もキャッシュに溜めない（差し替え時の陳腐化防止）。
  if (url.pathname.includes('/media/help/')) return;

  // データJSON（arrivals 等、デプロイ外で随時更新される）はネットワーク優先で即反映。
  // ただし js/data/ はアプリに同梱した静的データ（町の代表座標など）で、デプロイでしか
  // 変わらない。下のアプリ本体と同じキャッシュ優先に任せる（毎回200KB取りに行かせない）。
  if (/\.json$/i.test(url.pathname) && !url.pathname.includes('/js/data/')) {
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

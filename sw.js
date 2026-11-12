const CACHE_PREFIX = 'taxi-daily-'; // このアプリ専用のキャッシュ接頭辞
const CACHE_NAME = CACHE_PREFIX + 'v477';
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
  './tools/js/radar-app.js?b=c8da54effdaf',
  './tools/js/radar-data.js?b=c8da54effdaf',
  './tools/js/radar-weather.js?b=c8da54effdaf',
  './vendor/maplibre/maplibre-gl.js?b=c8da54effdaf',
  './vendor/maplibre/maplibre-gl.css',
  './tools/js/koji-data.js?b=c8da54effdaf',
  './tools/js/koji-layer.js?b=c8da54effdaf',
  './tools/js/koji-ui.js?b=c8da54effdaf',
  './tools/js/koji-lane-scene.js?b=c8da54effdaf',
  './tools/js/koji-lane-anim.js?b=c8da54effdaf',
  './tools/js/jartic-data.js?b=c8da54effdaf',
  './tools/js/jartic-layer.js?b=c8da54effdaf',
  './tools/img/koji/car-taxi-black.png',
  './tools/img/koji/car-white.png',
  './tools/img/koji/car-blue.png',
  './tools/img/koji/car-silver.png',
  './tools/img/koji/car-truck.png',
  './tools/img/koji/car-red.png',
  './tools/img/koji/car-taxi-yellow.png',
  './tools/img/koji/car-gray.png',
  './tools/img/koji/cone.png',
  './tools/img/koji/barrier.png',
  './tools/img/koji/worker.png',
  './tools/js/traffic-count-data.js?b=c8da54effdaf',
  './tools/js/traffic-count-layer.js?b=c8da54effdaf',
  './tools/data/koji.json',
  './tools/data/expressways.geojson',
  './tools/data/muni.json',
  './tools/airport-fare.html',
  './tools/js/airport-fare-app.js?b=c8da54effdaf',
  './tools/js/airport-fare-data.js?b=c8da54effdaf',
  './tools/js/airport-fare-map.js?b=c8da54effdaf',
  './tools/js/airport-fare-card.js?b=c8da54effdaf',
  './tools/data/airport-fixed-fares.json',
  './tools/data/tokyo-ward-shapes.json',
  './tools/js/stands-app.js?b=c8da54effdaf',
  './tools/js/stands-tab.js?b=c8da54effdaf',
  './tools/js/stands-data.js?b=c8da54effdaf',
  './tools/js/stands-map.js?b=c8da54effdaf',
  './tools/js/stands-geo.js?b=c8da54effdaf',
  './tools/js/stands-schema.js?b=c8da54effdaf',
  './tools/js/stands-editor.js?b=c8da54effdaf',
  './tools/js/stands-georef.js?b=c8da54effdaf',
  './tools/js/stands-georef-ui.js?b=c8da54effdaf',
  './tools/js/util.js?b=c8da54effdaf',
  './tools/js/geo.js?b=c8da54effdaf',
  './vendor/leaflet/leaflet.js?b=c8da54effdaf',
  './vendor/leaflet/leaflet.css',
  './css/style.css',
  './css/ocr-import.css',
  './js/app.js?b=c8da54effdaf',
  './js/app-update.js?b=c8da54effdaf',
  './js/first-run.js?b=c8da54effdaf',
  './js/parser.js?b=c8da54effdaf',
  './js/payroll.js?b=c8da54effdaf',
  './js/home-metrics.js?b=c8da54effdaf',
  './js/storage.js?b=c8da54effdaf',
  './js/cache.js?b=c8da54effdaf',
  './js/userid.js?b=c8da54effdaf',
  './js/weather.js?b=c8da54effdaf',
  './js/chart-helpers.js?b=c8da54effdaf',
  './js/jp-holidays.js?b=c8da54effdaf',
  './js/rec-area.js?b=c8da54effdaf',
  './js/area-geo.js?b=c8da54effdaf',
  './js/data/area-coords.json',
  './js/gps-privacy-banner.js?b=c8da54effdaf',
  './js/user-doc.js?b=c8da54effdaf',
  './js/invite-url.js?b=c8da54effdaf',
  './js/slug-gen.js?b=c8da54effdaf',
  './js/qr-code.js?b=c8da54effdaf',
  './js/aggregate-access.js?b=c8da54effdaf',
  './js/help-toggle.js?b=c8da54effdaf',
  './js/help-video.js?b=c8da54effdaf',
  './js/help-video-registry.js?b=c8da54effdaf',
  './js/legal-footer.js?b=c8da54effdaf',
  './js/subscription-state.js?b=c8da54effdaf',
  './js/signup-notify.js?b=c8da54effdaf',
  './js/access-control.js?b=c8da54effdaf',
  './js/planned-shifts.js?b=c8da54effdaf',
  './js/ocr-import.js?b=c8da54effdaf',
  './js/default-config.js?b=c8da54effdaf',
  './js/firebase-init.js?b=c8da54effdaf',
  './js/firebase-auth.js?b=c8da54effdaf',
  './js/auth-state.js?b=c8da54effdaf',
  './js/firebase-storage.js?b=c8da54effdaf',
  './js/drive-cache.js?b=c8da54effdaf',
  './js/load-error-banner.js?b=c8da54effdaf',
  './js/company-config.js?b=c8da54effdaf',
  './js/admin-companies.js?b=c8da54effdaf',
  './js/admin-assign-company.js?b=c8da54effdaf',
  './js/admin-user-list.js?b=c8da54effdaf',
  './js/sub-cache.js?b=c8da54effdaf',
  './js/crypto-utils.js?b=c8da54effdaf',
  './js/invite-crypto.js?b=c8da54effdaf',
  './js/vehicle-filter.js?b=c8da54effdaf',
  './js/setup-request-app.js?b=c8da54effdaf',
  './js/setup-request-validate.js?b=c8da54effdaf',
  './js/group-client.js?b=c8da54effdaf',
  './js/groups-app.js?b=c8da54effdaf',
  './tools/js/countdown.js?b=c8da54effdaf',
  './tools/js/timer-sync.js?b=c8da54effdaf',
  './tools/js/timer-cloud.js?b=c8da54effdaf',
  './tools/js/arrivals-app.js?b=c8da54effdaf',
  './tools/js/arrivals-data.js?b=c8da54effdaf',
  './tools/js/arrivals-render.js?b=c8da54effdaf',
  './tools/js/forecast-section.js?b=c8da54effdaf',
  './tools/js/noriba-trends.js?b=c8da54effdaf',
  './tools/js/pool-status-section.js?b=c8da54effdaf',
  './tools/js/stand-flow.js?b=c8da54effdaf',
  './tools/js/airline-color.js?b=c8da54effdaf',
  './tools/js/exit-favorites.js?b=c8da54effdaf',
  './legal/tokuteishou.html',
  './legal/terms.html',
  './legal/privacy.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './coach.html',
  './js/coach/daily-goal.js?b=c8da54effdaf',
  './js/coach/fact-engine.js?b=c8da54effdaf',
  './js/coach/answer-composer.js?b=c8da54effdaf',
  './js/coach/answer-format.js?b=c8da54effdaf',
  './js/coach/place.js?b=c8da54effdaf',
  './js/coach/coach-context.js?b=c8da54effdaf',
  './js/coach/coach-run.js?b=c8da54effdaf',
  './js/coach/coach-ui.js?b=c8da54effdaf',
  './js/coach/coach-flag.js?b=c8da54effdaf'
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
  if (/\.(geo)?json$/i.test(url.pathname) && !url.pathname.includes('/js/data/')) {
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

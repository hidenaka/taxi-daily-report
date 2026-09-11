const CACHE_PREFIX = 'taxi-daily-'; // このアプリ専用のキャッシュ接頭辞
const CACHE_NAME = CACHE_PREFIX + 'v389';
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
  './tools/js/radar-app.js?b=b940b666852a',
  './tools/js/radar-data.js?b=b940b666852a',
  './tools/js/radar-weather.js?b=b940b666852a',
  './tools/airport-fare.html',
  './tools/js/airport-fare-app.js?b=b940b666852a',
  './tools/js/airport-fare-data.js?b=b940b666852a',
  './tools/js/airport-fare-map.js?b=b940b666852a',
  './tools/js/airport-fare-card.js?b=b940b666852a',
  './tools/data/airport-fixed-fares.json',
  './tools/data/tokyo-ward-shapes.json',
  './tools/js/stands-app.js?b=b940b666852a',
  './tools/js/stands-tab.js?b=b940b666852a',
  './tools/js/stands-data.js?b=b940b666852a',
  './tools/js/stands-map.js?b=b940b666852a',
  './tools/js/stands-geo.js?b=b940b666852a',
  './tools/js/stands-schema.js?b=b940b666852a',
  './tools/js/stands-editor.js?b=b940b666852a',
  './tools/js/stands-georef.js?b=b940b666852a',
  './tools/js/stands-georef-ui.js?b=b940b666852a',
  './tools/js/util.js?b=b940b666852a',
  './tools/js/geo.js?b=b940b666852a',
  './vendor/leaflet/leaflet.js?b=b940b666852a',
  './vendor/leaflet/leaflet.css',
  './css/style.css',
  './css/ocr-import.css',
  './js/app.js?b=b940b666852a',
  './js/app-update.js?b=b940b666852a',
  './js/first-run.js?b=b940b666852a',
  './js/parser.js?b=b940b666852a',
  './js/payroll.js?b=b940b666852a',
  './js/home-metrics.js?b=b940b666852a',
  './js/storage.js?b=b940b666852a',
  './js/cache.js?b=b940b666852a',
  './js/userid.js?b=b940b666852a',
  './js/weather.js?b=b940b666852a',
  './js/chart-helpers.js?b=b940b666852a',
  './js/rec-area.js?b=b940b666852a',
  './js/area-geo.js?b=b940b666852a',
  './js/data/area-coords.json',
  './js/gps-privacy-banner.js?b=b940b666852a',
  './js/user-doc.js?b=b940b666852a',
  './js/invite-url.js?b=b940b666852a',
  './js/slug-gen.js?b=b940b666852a',
  './js/qr-code.js?b=b940b666852a',
  './js/aggregate-access.js?b=b940b666852a',
  './js/help-toggle.js?b=b940b666852a',
  './js/help-video.js?b=b940b666852a',
  './js/help-video-registry.js?b=b940b666852a',
  './js/legal-footer.js?b=b940b666852a',
  './js/subscription-state.js?b=b940b666852a',
  './js/signup-notify.js?b=b940b666852a',
  './js/access-control.js?b=b940b666852a',
  './js/planned-shifts.js?b=b940b666852a',
  './js/ocr-import.js?b=b940b666852a',
  './js/default-config.js?b=b940b666852a',
  './js/firebase-init.js?b=b940b666852a',
  './js/firebase-auth.js?b=b940b666852a',
  './js/auth-state.js?b=b940b666852a',
  './js/firebase-storage.js?b=b940b666852a',
  './js/drive-cache.js?b=b940b666852a',
  './js/company-config.js?b=b940b666852a',
  './js/admin-companies.js?b=b940b666852a',
  './js/admin-assign-company.js?b=b940b666852a',
  './js/admin-user-list.js?b=b940b666852a',
  './js/sub-cache.js?b=b940b666852a',
  './js/crypto-utils.js?b=b940b666852a',
  './js/invite-crypto.js?b=b940b666852a',
  './js/vehicle-filter.js?b=b940b666852a',
  './js/setup-request-app.js?b=b940b666852a',
  './js/setup-request-validate.js?b=b940b666852a',
  './js/group-client.js?b=b940b666852a',
  './js/groups-app.js?b=b940b666852a',
  './tools/js/countdown.js?b=b940b666852a',
  './tools/js/timer-sync.js?b=b940b666852a',
  './tools/js/timer-cloud.js?b=b940b666852a',
  './tools/js/arrivals-app.js?b=b940b666852a',
  './tools/js/arrivals-data.js?b=b940b666852a',
  './tools/js/arrivals-render.js?b=b940b666852a',
  './tools/js/forecast-section.js?b=b940b666852a',
  './tools/js/noriba-trends.js?b=b940b666852a',
  './tools/js/pool-status-section.js?b=b940b666852a',
  './tools/js/airline-color.js?b=b940b666852a',
  './tools/js/exit-favorites.js?b=b940b666852a',
  './legal/tokuteishou.html',
  './legal/terms.html',
  './legal/privacy.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './coach.html',
  './js/coach/daily-goal.js?b=b940b666852a',
  './js/coach/fact-engine.js?b=b940b666852a',
  './js/coach/answer-composer.js?b=b940b666852a',
  './js/coach/answer-format.js?b=b940b666852a',
  './js/coach/place.js?b=b940b666852a',
  './js/coach/coach-context.js?b=b940b666852a',
  './js/coach/coach-run.js?b=b940b666852a',
  './js/coach/coach-ui.js?b=b940b666852a',
  './js/coach/coach-flag.js?b=b940b666852a'
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

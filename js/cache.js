// LocalStorage cache with stale-while-revalidate.
// キーは GitHub API path（例: "data/drives/foo/2026-04-15.json"）。
// list 系は "list:data/drives/foo" のようにプレフィックス付き。
//
// レコード形式:
//   { v: <value>, t: <epoch ms>, s: <sha?> }
//
// 容量対策: 5MB近づいたら古いものから自動削除。

const NS = 'taxi_cache_v1:';
const FRESH_MS = 30 * 60 * 1000; // 30分以内ならfresh
const MAX_BYTES = 4 * 1024 * 1024; // ~4MB上限

function key(k) { return NS + k; }

export function getCached(k) {
  try {
    const raw = localStorage.getItem(key(k));
    if (!raw) return null;
    const rec = JSON.parse(raw);
    const age = Date.now() - rec.t;
    return { value: rec.v, age, sha: rec.s, stale: age > FRESH_MS };
  } catch { return null; }
}

export function setCached(k, value, sha = null) {
  const rec = { v: value, t: Date.now(), s: sha };
  try {
    localStorage.setItem(key(k), JSON.stringify(rec));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || /quota/i.test(e.message)) {
      evictOldest(0.5);
      try { localStorage.setItem(key(k), JSON.stringify(rec)); } catch {}
    }
  }
}

export function delCached(k) {
  try { localStorage.removeItem(key(k)); } catch {}
}

// ストレージ上限近接時に古いキャッシュをまとめて削除
function evictOldest(ratio = 0.3) {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(NS)) continue;
    try {
      const rec = JSON.parse(localStorage.getItem(k));
      entries.push({ k, t: rec.t || 0, size: (localStorage.getItem(k) || '').length });
    } catch { entries.push({ k, t: 0, size: 0 }); }
  }
  entries.sort((a, b) => a.t - b.t);
  const toDrop = Math.max(1, Math.floor(entries.length * ratio));
  for (let i = 0; i < toDrop; i++) localStorage.removeItem(entries[i].k);
}

// 簡易サイズチェック（書き込み前に呼ばなくても、QuotaExceeded で fallback する）
export function cacheBytesApprox() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(NS)) total += (localStorage.getItem(k) || '').length;
  }
  return total;
}

// pub/sub: 同じキャッシュキーが背景更新された時に通知
const subs = new Map(); // key -> Set<fn>
export function subscribe(k, fn) {
  if (!subs.has(k)) subs.set(k, new Set());
  subs.get(k).add(fn);
  return () => subs.get(k)?.delete(fn);
}
export function notifyChanged(k) {
  const set = subs.get(k);
  if (set) for (const fn of set) { try { fn(); } catch {} }
}

// 単発の "全部更新したよ" シグナル（ページ全体の再描画用）
const globalSubs = new Set();
export function onAnyRefresh(fn) { globalSubs.add(fn); return () => globalSubs.delete(fn); }
export function notifyRefresh() {
  for (const fn of globalSubs) { try { fn(); } catch {} }
}

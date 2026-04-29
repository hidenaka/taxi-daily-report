# support.html UI改善 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** support.html の営業サポート画面において、他マーカーの管理者/メンバー分離、GPS連動表示改善、分析期間と出庫ペースの統合、時間帯ゾーン連動表示を実装する。

**Architecture:** 全変更は support.html 内のJavaScriptとDOM構造に閉じる。chart-helpers.js/storage.js は既存APIをそのまま利用。users.json の `role` フィールドをオプショナル読み取りに対応。

**Tech Stack:** HTML / JavaScript ES Modules / 既存CSS変数

---

## Task 1: 他マーカーの管理者/メンバー分離対応

**Files:**
- Modify: `js/storage.js:198-207`
- Modify: `support.html:528-531`
- Modify: `support.html:148-155`（import追加）

**確認結果:** 現状の `userBadge` は自分以外すべて「他」バッジ。`users.json` に `role` フィールドがないため分離不可。

**対応方針:**
- `getUserDisplayMap` を拡張して `role` も返すようにする（存在すれば）
- `userBadge` を修正：role='admin' なら「管」、role='member' または不明なら「他」
- roleがない既存データには影響なし

- [ ] **Step 1: storage.js の getUserDisplayMap を拡張**

```javascript
// getUserDisplayMap の戻り値に role を含める
export async function getUserRoleMap() {
  const result = await getFile('data/users.json');
  const map = {};
  if (!result?.content?.users) return map;
  for (const u of result.content.users) {
    if (u.active === true && isValidUserId(u.userId)) {
      map[u.userId] = u.role || 'member';
    }
  }
  return map;
}
```

- [ ] **Step 2: support.html の import に getUserRoleMap を追加**

```javascript
import { getDrivesForMonth, getAllUsersDrivesForMonth, listActiveUserIds, getMyUserId, getUserDisplayMap, getUserRoleMap } from './js/storage.js';
```

- [ ] **Step 3: support.html に userRoleMap 変数と userBadge 修正**

```javascript
let userRoleMap = {}; // 追加

function userBadge(userId) {
  if (!userId || userId === myUserId) return '';
  const role = userRoleMap[userId];
  const label = role === 'admin' ? '管' : '他';
  const bg = role === 'admin' ? '#fff3e0' : '#eceff1';
  const color = role === 'admin' ? '#e65100' : '#546e7a';
  return `<span style="display:inline-block;padding:1px 4px;background:${bg};color:${color};border-radius:3px;font-size:9px;font-weight:700;margin-right:3px;vertical-align:middle;">${label}</span>`;
}
```

- [ ] **Step 4: load() 内で userRoleMap を取得**

```javascript
const [myParts, allParts, userIds, displayMap, roleMap] = await Promise.all([
  Promise.all(periods.map(ym => getDrivesForMonth(ym))),
  Promise.all(periods.map(ym => getAllUsersDrivesForMonth(ym))),
  listActiveUserIds(),
  getUserDisplayMap(),
  getUserRoleMap() // 追加
]);
userRoleMap = roleMap; // 追加
```

---

## Task 2: 次の営業先推奨検索のGPS連動表示改善

**Files:**
- Modify: `support.html:72-98`
- Modify: `support.html:443-525`

**確認結果:** GPS自動入力後、手動選択かGPS自動入力かが視覚的に区別できない。

**対応方針:**
- GPSで自動入力された場合、recAreaセレクトボックスの横に「📍GPS」バッジを表示
- 手動でrecAreaを変更した場合、GPSバッジをクリア
- 検索結果ヘッダーに「GPS推定範囲」か「手動選択」かを明記

- [ ] **Step 1: recAreaラベル横にGPS状態表示要素を追加**

```html
<!-- recArea select の上の label を修正 -->
<label style="font-size:10px;color:var(--muted);">降ろした場所 <span id="recGpsBadge" style="display:none;font-size:9px;background:#e3f2fd;color:#1565c0;padding:1px 5px;border-radius:3px;font-weight:600;">📍GPS</span></label>
```

- [ ] **Step 2: GPSクリック時にバッジ表示 + 検索結果ラベル用変数**

```javascript
// recGps クリック内でマッチ成功時
if (matched) {
  sel.value = matched;
  updateNeighborInfo();
  showRecGpsBadge(true); // 追加
  document.getElementById('recSearch').click();
} else if (detected) {
  // ... gpsWideAreas 設定後
  showRecGpsBadge(true, '範囲'); // 追加（広域モード）
  document.getElementById('recSearch').click();
}

function showRecGpsBadge(show, mode = '確定') {
  const badge = document.getElementById('recGpsBadge');
  badge.textContent = mode === '範囲' ? '📍GPS範囲' : '📍GPS';
  badge.style.display = show ? 'inline' : 'none';
}
```

- [ ] **Step 3: 手動変更時にバッジクリア**

```javascript
document.getElementById('recArea').addEventListener('change', () => { 
  gpsWideAreas = null; 
  showRecGpsBadge(false); // 追加
  updateNeighborInfo(); 
});
```

- [ ] **Step 4: 検索結果ヘッダーにGPS/手動を明記**

```javascript
// document.getElementById('recSearch').onclick 内
const sourceLabel = gpsWideAreas ? '📍GPS推定' : '手動選択';
// ... html組み立て時に area の横に sourceLabel を追加
html = `<div class="muted" style="font-size:11px;margin-bottom:6px;">${sourceLabel}: <strong>${area}</strong>...`;
```

---

## Task 3: 分析期間と出庫ペースの統合

**Files:**
- Modify: `support.html:163-273`
- Modify: `support.html:309-338`

**確認結果:** 出庫ペース参考カード（`#paceCard`）は独自の `monthsRange`（3/6/12/全）を持っており、ページ上部の分析期間（3/6/12ヶ月）と独立している。

**対応方針:**
- 出庫ペース参考カード内のrangeTabs（3/6/12/全ヶ月）を削除
- 出庫ペース参考もページ上部の `monthsRange` と連動させる
- `renderPaceCard` は `monthsRange` を引数に取るが、ページ初期化時に同じ値を使う

- [ ] **Step 1: paceState から monthsRange を削除しグローバルを参照**

```javascript
// 変更前
let paceState = { allDrives: null, dowFilter: null, manualElapsedMin: null, monthsRange: 12, todayDepHour: 7 };

// 変更後
let paceState = { allDrives: null, dowFilter: null, manualElapsedMin: null, todayDepHour: 7 };
// monthsRange はグローバル変数を参照
```

- [ ] **Step 2: renderPaceBody から rangeTabs 生成を削除**

```javascript
// renderPaceBody 内の以下を削除
const rangeItems = [{r: 3, l: '3ヶ月'}, {r: 6, l: '6ヶ月'}, {r: 12, l: '12ヶ月'}, {r: 36, l: '全'}];
const rangeTabs = rangeItems.map(...).join('');
// card.innerHTML 内の ${rangeTabs} も削除
```

- [ ] **Step 3: renderPaceBody 内の months 参照をグローバル monthsRange に変更**

```javascript
// renderPaceBody 内
const { allDrives: drives, dowFilter, manualElapsedMin, todayDepHour } = paceState;
const months = monthsRange; // グローバル変数を参照
```

- [ ] **Step 4: renderPaceCard から months 引数を削除・連動**

```javascript
// 変更前
async function renderPaceCard(months = 12) { ... }

// 変更後
async function renderPaceCard() {
  const months = monthsRange;
  // ... 残りは同じ
}
```

- [ ] **Step 5: load() 内で monthsRange 変更時に出庫ペースも再レンダリング**

```javascript
// load() の最後に追加
renderPaceCard();
```

- [ ] **Step 6: ページ初期化時の renderPaceCard(12) を renderPaceCard() に変更**

```javascript
// 最下部
renderPaceCard(); // load() 内で呼ばれるので不要だが、トークン未設定時のため残す場合は注意
```

---

## Task 4: 出庫ペース参考に時間帯ゾーン連動表示

**Files:**
- Modify: `support.html:163-273`

**確認結果:** 経過時間タブ（今/1h/2h...）と時間帯（朝・昼・夜・深夜）の連動がない。

**対応方針:**
- 2種類のゾーンプリセットを定義
  - `human`: 人の動き別 [(0,5), (5,12), (12,18), (18,22), (22,24)]
  - `shift`: シフト別 [(7,12), (12,17), (17,22), (22,3)]
- ゾーン切り替えタブを追加
- 現在の経過時間から到達時刻（出庫時刻+経過時間）を計算し、どのゾーンに入るかをハイライト
- 経過時間タブにゾーン境界を示す目印を追加

- [ ] **Step 1: ゾーン定数と状態変数を追加**

```javascript
const ZONE_PRESETS = {
  human: {
    label: '人の動き別',
    zones: [
      { label: '深夜', start: 0, end: 5, color: '#37474f' },
      { label: '早朝〜午前', start: 5, end: 12, color: '#1565c0' },
      { label: '昼', start: 12, end: 18, color: '#2e7d32' },
      { label: '夕方〜夜', start: 18, end: 22, color: '#e65100' },
      { label: '深夜', start: 22, end: 24, color: '#37474f' },
    ]
  },
  shift: {
    label: 'シフト別',
    zones: [
      { label: '早朝', start: 7, end: 12, color: '#1565c0' },
      { label: '昼', start: 12, end: 17, color: '#2e7d32' },
      { label: '夕方〜夜', start: 17, end: 22, color: '#e65100' },
      { label: '深夜', start: 22, end: 3, color: '#37474f' },
    ]
  }
};
let paceZonePreset = 'human'; // 'human' | 'shift'
```

- [ ] **Step 2: ゾーン判定関数を追加**

```javascript
function getZoneAt(hour, preset = paceZonePreset) {
  const zones = ZONE_PRESETS[preset].zones;
  for (const z of zones) {
    if (z.start < z.end) {
      if (hour >= z.start && hour < z.end) return z;
    } else {
      // 跨ぎ（例: 22-3）
      if (hour >= z.start || hour < z.end) return z;
    }
  }
  return zones[zones.length - 1];
}

function getZoneForElapsed(elapsedMin, depHour, preset = paceZonePreset) {
  const totalMin = depHour * 60 + elapsedMin;
  const h = Math.floor(totalMin / 60) % 24;
  return getZoneAt(h, preset);
}
```

- [ ] **Step 3: renderPaceBody にゾーン切り替えタブとゾーン表示を追加**

```javascript
// elapsedTabs の上にゾーン切り替えと現在ゾーン表示を追加
const presetTabs = Object.entries(ZONE_PRESETS).map(([key, p]) => {
  const active = key === paceZonePreset;
  const style = active ? 'background:var(--primary);color:#fff;font-weight:600;' : 'background:#f0f0f0;color:#333;';
  return `<button data-preset="${key}" class="pace-preset" style="${style}border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">${p.label}</button>`;
}).join('');

const currentZone = getZoneForElapsed(elapsedMin, todayDepHour);
const zoneDisplay = `<div style="margin-top:6px;font-size:11px;font-weight:600;color:${currentZone.color};">⏱ ${targetTime} → ${currentZone.label} (${currentZone.start}〜${currentZone.end}${currentZone.end <= currentZone.start ? '(翌)' : ''}時)</div>`;
```

- [ ] **Step 4: elapsedTabs にゾーン境界目印を追加**

```javascript
// elapsedItems の各要素に zoneHint を付与
const elapsedItems = [{m: null, l: '今', h: elapsedMin / 60}];
for (let h = 1; h <= 20; h++) elapsedItems.push({m: h * 60, l: `${h}h`, h});

// 各タブの前にゾーン開始目印を挿入
let lastZone = null;
const elapsedTabs = elapsedItems.map(e => {
  const eh = e.m != null ? e.h : elapsedMin / 60;
  const z = getZoneAt(Math.floor((todayDepHour + eh) % 24));
  const zoneHint = (lastZone && lastZone.label !== z.label) 
    ? `<span style="font-size:9px;color:${z.color};font-weight:600;margin-right:2px;">${z.label}</span>` 
    : '';
  lastZone = z;
  const active = (e.m == null && !isManual) || (e.m != null && manualElapsedMin === e.m);
  const style = active ? 'background:var(--orange,#ff9800);color:#fff;font-weight:600;' : 'background:#f0f0f0;color:#333;';
  return `${zoneHint}<button data-em="${e.m == null ? '' : e.m}" class="pace-etab" style="${style}border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;min-width:28px;">${e.l}</button>`;
}).join('');
```

- [ ] **Step 5: ゾーン切り替えイベントを追加**

```javascript
card.querySelectorAll('.pace-preset').forEach(b => {
  b.onclick = () => { paceZonePreset = b.dataset.preset; renderPaceBody(); };
});
```

---

## Task 5: テストと検証

**Files:**
- Run: `npm test`
- Verify: ブラウザで support.html を開き各機能を確認

- [ ] **Step 1: 既存テスト実行**

```bash
cd ~/taxi-daily-report && npm test
```

- [ ] **Step 2: ブラウザ確認項目**
  - 他マーカー：role='admin' のユーザーに「管」バッジ、roleなし/ member に「他」バッジ
  - GPS連動：GPSボタン押下後、recArea横に📍GPSバッジ、検索結果に「📍GPS推定」表示
  - 分析期間統合：出庫ペース参考カードに独自の期間タブがなく、上部の分析期間変更で連動
  - 時間帯ゾーン：ゾーン切り替えタブで「人の動き別」「シフト別」切替、経過時間に応じたゾーンハイライト

---

## Self-Review

**1. Spec coverage:**
- ✅ 他マーカー管理者/メンバー分離 → Task 1
- ✅ GPS連動表示改善 → Task 2
- ✅ 分析期間と出庫ペース統合 → Task 3
- ✅ 時間帯ゾーン連動（人の動き別） → Task 4
- ✅ 別区切り（シフト別）選択 → Task 4

**2. Placeholder scan:**
- コード例はすべて実際の support.html に近い形で記述

**3. Type consistency:**
- `monthsRange` はグローバル変数として一貫して使用
- `paceZonePreset` は文字列リテラルで一貫

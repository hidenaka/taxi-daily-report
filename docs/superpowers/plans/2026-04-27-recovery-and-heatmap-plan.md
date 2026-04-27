# マルチユーザー実装の修復 + 効率ヒートマップ再設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 本人データの user_self/ 移行・users.json 形式修復・効率ヒートマップの ¥/h(休憩除外) 一本化と自分/全員タブ切替・管理者向け bulk push スクリプトの汎用化を行い、マルチユーザー対応を完成させる。

**Architecture:** 既存の `js/storage.js` / `js/chart-helpers.js` / `support.html` / `scripts/migrate-to-userid.mjs` / `scripts/push-from-paste.mjs` を最小限改修。新規スクリプトは1本(repair-users-json.mjs)+rename1本(admin-bulk-push.mjs)。テストは `node --test tests/*.test.js` で実行。

**Tech Stack:** Vanilla JS ES modules, Node test runner, GitHub Contents API, GitHub CLI (gh) for token, PWA Service Worker

**Note:** 作業ディレクトリは git リポジトリではない(iCloud同期管理)。Plan内の commit step は `npm test` 通過確認に置き換える。

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `scripts/repair-users-json.mjs` | Create | 既存users.jsonの形式を `{users:[...]}` に修正、user_self+user_mm を含める |
| `scripts/admin-bulk-push.mjs` | Rename from `scripts/push-from-paste.mjs` | --user / --display / --override / --paste 引数化、users.json append式 |
| `js/chart-helpers.js` | Modify | hourlyDowEfficiency に休憩除外ロジック追加、hourlyB 削除 |
| `support.html` | Modify | タブを自分のみ/全員統合に変更、tip表示文言更新 |
| `tests/chart-helpers.test.js` | Create | hourlyDowEfficiency の休憩除外テスト |
| `tests/admin-bulk-push.test.js` | Create | 引数parse・override parse・users.json append のテスト |
| `docs/admin-bulk-import.md` | Create | 管理者向け bulk 投入手順書 |
| `README.md` | Modify | 該当セクションを admin-bulk-import.md へリンク差し替え |
| `sw.js` | Modify | CACHE_NAME を v69 へ |

---

## Task 1: 本人データ migration 実行(§A)

**Files:**
- Run only: `scripts/migrate-to-userid.mjs`(既存、変更なし)

**前提**: GitHub data repo は `hidenaka/taxi-daily-report-data`、tokenは `gh auth token` で取得可能。

- [ ] **Step 1: dry-run で対象件数確認**

```bash
cd "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報"
GITHUB_TOKEN=$(gh auth token) DATA_REPO=hidenaka/taxi-daily-report-data \
  node scripts/migrate-to-userid.mjs --dry-run 2>&1 | tail -20
```

期待: WOULD COPY が約270件出る、ERROR が0、`data/users.json` SKIP(既に存在)が表示される

- [ ] **Step 2: 本実行**

```bash
GITHUB_TOKEN=$(gh auth token) DATA_REPO=hidenaka/taxi-daily-report-data \
  node scripts/migrate-to-userid.mjs 2>&1 | tail -10
```

期待: copied 約270、errors 0

- [ ] **Step 3: GitHub上で user_self/ フォルダ確認**

```bash
gh api 'repos/hidenaka/taxi-daily-report-data/contents/data/drives/user_self' --jq '. | length'
```

期待: 約270 (元 root level の `data/drives/*.json` 件数と一致)

- [ ] **Step 4: PWA で振り返りに本人データ表示確認(手動)**

ブラウザで PWA を開き、`review.html` で本人の過去データが見えることを目視確認。

---

## Task 2: users.json 修復スクリプト作成 + 実行(§B)

**Files:**
- Create: `scripts/repair-users-json.mjs`

- [ ] **Step 1: スクリプト作成**

```javascript
#!/usr/bin/env node
// users.json を {users: [...]} 形式に修復する。
// user_self(displayName: "自分") と user_mm(displayName: "mm") を含めて active: true で書く。
// 既存のflat array形式・破損形式どれでも上書き対応。

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DATA_REPO = process.env.DATA_REPO;
if (!GITHUB_TOKEN || !DATA_REPO) {
  console.error('GITHUB_TOKEN と DATA_REPO 環境変数が必要です');
  process.exit(1);
}

const REQUIRED_USERS = [
  { userId: 'user_self', displayName: '自分', active: true },
  { userId: 'user_mm', displayName: 'mm', active: true }
];

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'repair-users' }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function ghPut(path, obj, message, sha) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(obj, null, 2)).toString('base64'),
    ...(sha ? { sha } : {})
  };
  const res = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'repair-users',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const path = 'data/users.json';
const existing = await ghGet(path);
const sha = existing?.sha || null;
let priorJson = null;
if (existing) {
  try {
    priorJson = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf-8'));
  } catch {
    priorJson = null;
  }
}
const newObj = { users: REQUIRED_USERS };
console.log('修復前:', JSON.stringify(priorJson));
console.log('修復後:', JSON.stringify(newObj));
await ghPut(path, newObj, 'repair: users.json to {users:[...]} format', sha);
console.log('✓ users.json 上書き完了');
```

- [ ] **Step 2: 実行**

```bash
GITHUB_TOKEN=$(gh auth token) DATA_REPO=hidenaka/taxi-daily-report-data \
  node scripts/repair-users-json.mjs
```

期待出力:
```
修復前: [{"userId":"user_mm","displayName":"mm","active":true}]
修復後: {"users":[{"userId":"user_self","displayName":"自分","active":true},{"userId":"user_mm","displayName":"mm","active":true}]}
✓ users.json 上書き完了
```

- [ ] **Step 3: GitHub 上で形式確認**

```bash
gh api repos/hidenaka/taxi-daily-report-data/contents/data/users.json --jq '.content' | base64 -d
```

期待: `{users:[...]}` 形式で user_self / user_mm 両方が `active: true`

---

## Task 3: hourlyDowEfficiency に休憩除外ロジック追加(§D)

**Files:**
- Modify: `js/chart-helpers.js:380-433`
- Test: `tests/chart-helpers.test.js`(新規)

- [ ] **Step 1: 失敗テスト作成**

`tests/chart-helpers.test.js` を新規作成:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { hourlyDowEfficiency } from '../js/chart-helpers.js';

test('hourlyDowEfficiency: 休憩中の時間は実稼働時間 (workingMin) から除外される', () => {
  // 木曜 (2026-04-23 は木曜)
  // 出庫 18:00、帰庫 20:00、休憩 18:00-19:30 → 18時セルの実稼働は 30分(=18:30-19:00 の30分が休憩除外後)
  // ※実際は18時セルは60分のうち休憩60分→稼働0分、19時セルは60分のうち休憩30分→稼働30分
  const drives = [{
    date: '2026-04-23',
    departureTime: '18:00',
    returnTime: '20:00',
    trips: [],
    rests: [{ startTime: '18:00', endTime: '19:30', place: 'X' }]
  }];
  const m = hourlyDowEfficiency(drives);
  const dow = 4; // 木曜
  assert.equal(m[dow][18].workingMin, 0, '18時セルは休憩で全埋め');
  assert.equal(m[dow][19].workingMin, 30, '19時セルは19:30まで休憩、30分間稼働');
});

test('hourlyDowEfficiency: hourlyA は workingMin ベース(売上÷実稼働時間)', () => {
  const drives = [{
    date: '2026-04-23',
    departureTime: '18:00',
    returnTime: '20:00',
    trips: [{ no: 1, boardTime: '19:30', alightTime: '19:50', boardPlace: 'A', alightPlace: 'B', km: 5, amount: 3000, isPickup: true, isCancel: false, waitTime: '' }],
    rests: [{ startTime: '18:00', endTime: '19:30', place: 'X' }]
  }];
  const m = hourlyDowEfficiency(drives);
  const dow = 4;
  // 19時セル: workingMin=30, sales=3000, hourlyA = 3000 / (30/60) = 6000
  assert.equal(m[dow][19].sales, 3000);
  assert.equal(m[dow][19].workingMin, 30);
  assert.equal(m[dow][19].hourlyA, 6000);
});

test('hourlyDowEfficiency: hourlyB は削除されている', () => {
  const drives = [{
    date: '2026-04-23',
    departureTime: '18:00',
    returnTime: '20:00',
    trips: [],
    rests: []
  }];
  const m = hourlyDowEfficiency(drives);
  assert.equal(m[4][18].hourlyB, undefined, 'hourlyB プロパティは削除済み');
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
cd "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報"
node --test tests/chart-helpers.test.js
```

期待: 3 失敗 (workingMin プロパティが存在しないため)

- [ ] **Step 3: hourlyDowEfficiency 改修**

`js/chart-helpers.js:380-433` を以下に置換:

```javascript
export function hourlyDowEfficiency(drives) {
  const matrix = Array.from({length: 7}, () =>
    Array.from({length: 24}, () => ({ sales: 0, activeMin: 0, presentMin: 0, restMin: 0, workingMin: 0, count: 0, days: 0 }))
  );
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    if (!d.date) continue;
    const dow = dowOf(d.date);
    if (d.departureTime && d.returnTime) {
      const dep = timeToMinutes(d.departureTime);
      let ret = timeToMinutes(d.returnTime);
      if (ret < dep) ret += 24 * 60;
      // 各時間バケットに乗務範囲が重なる分数を集計
      const startBucket = Math.floor(dep / 60);
      const endBucket = Math.floor((ret - 1) / 60);
      const seen = new Set();
      for (let bi = startBucket; bi <= endBucket; bi++) {
        const bucketStart = bi * 60;
        const bucketEnd = bucketStart + 60;
        const overlap = Math.max(0, Math.min(bucketEnd, ret) - Math.max(bucketStart, dep));
        if (overlap <= 0) continue;
        const h = bi % 24;
        matrix[dow][h].presentMin += overlap;
        if (!seen.has(h)) { seen.add(h); matrix[dow][h].days++; }
      }
      // 休憩区間を各時間バケットから引く
      for (const r of (d.rests || [])) {
        let rs = timeToMinutes(r.startTime);
        let re = timeToMinutes(r.endTime);
        if (re < rs) re += 24 * 60;
        // 出庫前または帰庫後の休憩は対象外
        if (re <= dep || rs >= ret) continue;
        rs = Math.max(rs, dep);
        re = Math.min(re, ret);
        const rStartBucket = Math.floor(rs / 60);
        const rEndBucket = Math.floor((re - 1) / 60);
        for (let bi = rStartBucket; bi <= rEndBucket; bi++) {
          const bucketStart = bi * 60;
          const bucketEnd = bucketStart + 60;
          const overlap = Math.max(0, Math.min(bucketEnd, re) - Math.max(bucketStart, rs));
          if (overlap <= 0) continue;
          const h = bi % 24;
          matrix[dow][h].restMin += overlap;
        }
      }
    }
    for (const t of (d.trips || [])) {
      if (t.isCancel) continue;
      const start = timeToMinutes(t.boardTime);
      let end = timeToMinutes(t.alightTime);
      if (end < start) end += 24 * 60;
      const dur = Math.max(1, end - start);
      let cur = start;
      while (cur < end) {
        const h = Math.floor(cur / 60) % 24;
        const next = Math.min(end, (Math.floor(cur / 60) + 1) * 60);
        const slice = next - cur;
        matrix[dow][h].activeMin += slice;
        matrix[dow][h].sales += (t.amount || 0) * (slice / dur);
        cur = next;
      }
      const bh = Math.floor(start / 60) % 24;
      matrix[dow][bh].count++;
    }
  }
  for (let dow = 0; dow < 7; dow++) {
    for (let h = 0; h < 24; h++) {
      const c = matrix[dow][h];
      c.workingMin = Math.max(0, c.presentMin - c.restMin);
      c.hourlyA = c.workingMin > 0 ? c.sales / (c.workingMin / 60) : 0;
    }
  }
  return matrix;
}
```

主な変更:
- セル要素に `restMin`, `workingMin` を追加
- 出庫〜帰庫範囲内の休憩区間をセルごとに集計
- `hourlyA = sales / (workingMin / 60)` (workingMin = presentMin - restMin)
- `hourlyB` 削除

- [ ] **Step 4: テスト全通過確認**

```bash
node --test tests/chart-helpers.test.js
```

期待: 3 PASS

- [ ] **Step 5: 全体テスト**

```bash
npm test 2>&1 | tail -10
```

期待: 全テスト PASS (44+件)

---

## Task 4: support.html ヒートマップ UI 改修(§D)

**Files:**
- Modify: `support.html:103, 106-109, 710-765`

- [ ] **Step 1: タブUI を「自分のみ / 全員統合」に置換**

`support.html:101-113` 周辺を以下に変更:

```html
  <section class="card" id="hourEffCard">
    <div class="section-h">
      <strong>曜日 × 時間 ¥/h <span style="font-size:10px;color:var(--muted);font-weight:normal;" id="hourEffScopeLabel">(自分のデータ)</span></strong>
      <span class="desc">休憩を除いた実稼働時間あたり売上</span>
    </div>
    <div class="sort-tabs" id="hourScopeTabs">
      <button data-scope="self" class="active">自分のみ</button>
      <button data-scope="all">全員統合</button>
    </div>
    <div id="hourEffBody"></div>
    <div class="detail-tip" id="hourEffTip"></div>
    <p class="muted" style="font-size:10px;margin-top:6px;">¥/h = 売上 ÷ 実稼働時間(休憩除外)。サンプル少(&lt;3件)はグレー、タップで詳細</p>
  </section>
```

- [ ] **Step 2: タブ切替ロジック差し替え**

`support.html:289` 周辺の `#hourMetricTabs` ハンドラを `#hourScopeTabs` に置換:

```javascript
let hourScope = 'self'; // 'self' | 'all'
document.querySelectorAll('#hourScopeTabs button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('#hourScopeTabs button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    hourScope = b.dataset.scope;
    document.getElementById('hourEffScopeLabel').textContent =
      hourScope === 'self' ? '(自分のデータ)' : '(全員統合)';
    renderHourEff();
  };
});
```

(既存の `let hourMetric = 'A';` と `#hourMetricTabs` 関連コードは削除)

- [ ] **Step 3: renderHourEff を新仕様に置換**

`support.html` の `function renderHourEff() { ... }` (710行付近)を以下に置換:

```javascript
function renderHourEff() {
  const sourceDrives = hourScope === 'all' ? allDrives : myDrives;
  const matrix = hourlyDowEfficiency(sourceDrives);
  let max = 0;
  for (let dow = 0; dow < 7; dow++) for (const h of HOUR_ORDER) {
    if (matrix[dow][h].days >= 3 && matrix[dow][h].hourlyA > max) max = matrix[dow][h].hourlyA;
  }
  if (max === 0) max = 1;
  let html = '<div style="overflow-x:auto;"><div class="heatgrid" style="min-width:560px;">';
  html += '<div></div>';
  for (const h of HOUR_ORDER) html += `<div class="hh">${h}</div>`;
  for (let dow = 0; dow < 7; dow++) {
    const dowColor = dow === 0 ? '#d32f2f' : dow === 6 ? '#1976d2' : '#333';
    html += `<div class="dlbl" style="color:${dowColor};">${DOW_LABELS[dow]}</div>`;
    for (const h of HOUR_ORDER) {
      const c = matrix[dow][h];
      if (c.days === 0) {
        html += `<div class="cell empty" data-dow="${dow}" data-h="${h}">·</div>`;
        continue;
      }
      const v = c.hourlyA;
      const ratio = Math.min(1, v / max);
      let r, g, b;
      if (ratio < 0.5) {
        const t = ratio * 2;
        r = 244; g = Math.round(67 + t * (193 - 67)); b = Math.round(54 + t * (7 - 54));
      } else {
        const t = (ratio - 0.5) * 2;
        r = Math.round(244 - t * (244 - 76)); g = Math.round(193 + t * (175 - 193)); b = Math.round(7 + t * (80 - 7));
      }
      const lowSample = c.days < 3 ? ' low-sample' : '';
      const display = v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v);
      html += `<div class="cell${lowSample}" style="background:rgb(${r},${g},${b});" data-dow="${dow}" data-h="${h}">${display}</div>`;
    }
  }
  html += '</div></div>';
  document.getElementById('hourEffBody').innerHTML = html;
  document.querySelectorAll('#hourEffBody .cell').forEach(el => {
    el.onclick = () => {
      const dow = parseInt(el.dataset.dow);
      const h = parseInt(el.dataset.h);
      const c = matrix[dow][h];
      const tip = document.getElementById('hourEffTip');
      tip.classList.add('show');
      if (c.days === 0) {
        tip.innerHTML = `<strong>${DOW_LABELS[dow]} ${h}時</strong>: 乗務データなし`;
        return;
      }
      const scopeLabel = hourScope === 'all' ? '全員統合' : '自分';
      tip.innerHTML = `
        <strong>${DOW_LABELS[dow]} ${h}時台</strong> (${scopeLabel}・乗務した日数 ${c.days}日)<br>
        ¥/h <strong>${formatYen(c.hourlyA)}</strong> (=売上÷実稼働時間)<br>
        <span style="font-size:11px;color:var(--muted);">trip${c.count}件 ・ 売上計${formatYen(c.sales)} ・ 乗務計${formatMin(c.presentMin)} ・ 休憩計${formatMin(c.restMin)} ・ 実稼働${formatMin(c.workingMin)}</span>
      `;
    };
  });
}
```

- [ ] **Step 4: PWA で動作確認(手動)**

ブラウザで `support.html` を開き:
1. タブが「自分のみ / 全員統合」になっている
2. 「自分のみ」タブで自分のデータヒートマップが表示される
3. 「全員統合」タブで user_self + user_mm 統合のヒートマップに切り替わる
4. セルtap で「¥/h」「実稼働」「休憩計」が表示される

---

## Task 5: scripts/admin-bulk-push.mjs 汎用化(§C)

**Files:**
- Rename: `scripts/push-from-paste.mjs` → `scripts/admin-bulk-push.mjs`(同時に内容書き換え)
- Test: `tests/admin-bulk-push.test.js`(新規)

- [ ] **Step 1: 失敗テスト作成**

`tests/admin-bulk-push.test.js` を新規作成:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { parseArgs, parseOverrides, mergeUsers } from '../scripts/admin-bulk-push.mjs';

test('parseArgs: --user / --display 必須、--paste/--override 任意', () => {
  const r = parseArgs(['--user', 'user_a', '--display', 'Aさん']);
  assert.equal(r.userId, 'user_a');
  assert.equal(r.displayName, 'Aさん');
  assert.equal(r.pastePath, 'data/paste-here.txt');
  assert.deepEqual(r.overrides, {});
  assert.equal(r.dryRun, false);
});

test('parseArgs: --user 不足はエラー', () => {
  assert.throws(() => parseArgs(['--display', 'X']), /--user/);
});

test('parseArgs: --display 不足はエラー', () => {
  assert.throws(() => parseArgs(['--user', 'user_a']), /--display/);
});

test('parseArgs: --user に invalid な ID はエラー', () => {
  assert.throws(() => parseArgs(['--user', 'User_A', '--display', 'X']), /invalid/i);
});

test('parseArgs: --override をJSON-likeに分解', () => {
  const r = parseArgs(['--user', 'user_a', '--display', 'A', '--override', '2026-01-20:premium,2025-10-08:regular']);
  assert.deepEqual(r.overrides, { '2026-01-20': 'premium', '2025-10-08': 'regular' });
});

test('parseOverrides: 単独関数として動作', () => {
  assert.deepEqual(parseOverrides(''), {});
  assert.deepEqual(parseOverrides('2026-01-20:premium'), { '2026-01-20': 'premium' });
  assert.deepEqual(parseOverrides('2026-01-20:premium,2025-10-08:regular'),
    { '2026-01-20': 'premium', '2025-10-08': 'regular' });
});

test('mergeUsers: {users:[...]} 形式に新規 user を append', () => {
  const existing = { users: [{ userId: 'user_self', displayName: '自分', active: true }] };
  const merged = mergeUsers(existing, { userId: 'user_a', displayName: 'A', active: true });
  assert.equal(merged.users.length, 2);
  assert.equal(merged.users[1].userId, 'user_a');
});

test('mergeUsers: 既存 userId は updateで displayName 更新', () => {
  const existing = { users: [{ userId: 'user_a', displayName: '旧名', active: true }] };
  const merged = mergeUsers(existing, { userId: 'user_a', displayName: '新名', active: true });
  assert.equal(merged.users.length, 1);
  assert.equal(merged.users[0].displayName, '新名');
});

test('mergeUsers: flat array(壊れた形式) も受け取って正しい形式で返す', () => {
  const existing = [{ userId: 'user_mm', displayName: 'mm', active: true }];
  const merged = mergeUsers(existing, { userId: 'user_a', displayName: 'A', active: true });
  assert.equal(Array.isArray(merged.users), true);
  assert.equal(merged.users.length, 2);
});

test('mergeUsers: existing が null(=ファイルなし)も対応', () => {
  const merged = mergeUsers(null, { userId: 'user_a', displayName: 'A', active: true });
  assert.deepEqual(merged, { users: [{ userId: 'user_a', displayName: 'A', active: true }] });
});
```

- [ ] **Step 2: テスト失敗確認**

```bash
node --test tests/admin-bulk-push.test.js
```

期待: 失敗(モジュールが存在しないか、export がない)

- [ ] **Step 3: 既存ファイルをrename + 新仕様に書き換え**

```bash
mv "scripts/push-from-paste.mjs" "scripts/admin-bulk-push.mjs"
```

その後、`scripts/admin-bulk-push.mjs` の中身を以下に全置換:

```javascript
#!/usr/bin/env node
// 管理者向け 知人データ bulk push スクリプト
// 環境変数: GITHUB_TOKEN, DATA_REPO (owner/repo)
// 使用例:
//   node scripts/admin-bulk-push.mjs --user user_a --display "Aさん"
//   node scripts/admin-bulk-push.mjs --user user_a --display "Aさん" --override 2026-01-20:premium

import { readFileSync } from 'fs';
import { parseFormattedReport } from '../js/parser.js';
import { isValidUserId } from '../js/userid.js';

export function parseOverrides(s) {
  if (!s) return {};
  const o = {};
  for (const seg of s.split(',')) {
    const [date, vehicle] = seg.split(':');
    if (!date || !vehicle) continue;
    o[date.trim()] = vehicle.trim();
  }
  return o;
}

export function parseArgs(argv) {
  const r = { userId: null, displayName: null, pastePath: 'data/paste-here.txt', overrides: {}, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user') r.userId = argv[++i];
    else if (a === '--display') r.displayName = argv[++i];
    else if (a === '--paste') r.pastePath = argv[++i];
    else if (a === '--override') r.overrides = parseOverrides(argv[++i]);
    else if (a === '--dry-run') r.dryRun = true;
  }
  if (!r.userId) throw new Error('--user is required');
  if (!r.displayName) throw new Error('--display is required');
  if (!isValidUserId(r.userId)) throw new Error(`invalid userId: ${r.userId}`);
  return r;
}

export function mergeUsers(existing, newUser) {
  let users = [];
  if (existing == null) users = [];
  else if (Array.isArray(existing)) users = existing.slice();
  else if (Array.isArray(existing.users)) users = existing.users.slice();
  const idx = users.findIndex(u => u.userId === newUser.userId);
  if (idx >= 0) users[idx] = { ...users[idx], ...newUser };
  else users.push(newUser);
  return { users };
}

function splitReports(t) {
  const lines = t.split('\n');
  const sections = [];
  let cur = [];
  for (const line of lines) {
    if (/^日付:\s*\d{4}-\d{2}-\d{2}/.test(line) && cur.length > 0) {
      sections.push(cur.join('\n').trim());
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) sections.push(cur.join('\n').trim());
  return sections.filter(s => s);
}

function normalizeSection(s) {
  const lines = s.split('\n');
  const m = lines[0].match(/^日付:\s*(\S*)\s+車種:\s*(\S*)?\s+出庫:\s*(\S*)\s+帰庫:\s*(\S*)\s*$/);
  if (!m) return s;
  const [, date, vehicle, dep, ret] = m;
  const head = `日付: ${date}\n車種: ${vehicle || ''}\n出庫: ${dep}\n帰庫: ${ret}\n---`;
  return [head, ...lines.slice(1)].join('\n');
}

function inferVehicleType(trips) {
  if (!trips || trips.length === 0) return 'regular';
  const pickupCount = trips.filter(t => t.isPickup).length;
  return (pickupCount / trips.length) >= 0.7 ? 'premium' : 'regular';
}

const DATA_REPO = process.env.DATA_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'admin-bulk-push' }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function ghPut(path, obj, message, sha) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(obj, null, 2)).toString('base64'),
    ...(sha ? { sha } : {})
  };
  const res = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'admin-bulk-push', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ensureUser(userId, displayName, dryRun) {
  const path = 'data/users.json';
  const existing = await ghGet(path);
  let priorObj = null;
  let sha = null;
  if (existing) {
    sha = existing.sha;
    try { priorObj = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf-8')); } catch { priorObj = null; }
  }
  const merged = mergeUsers(priorObj, { userId, displayName, active: true });
  if (dryRun) {
    console.log(`[dry-run] users.json -> ${JSON.stringify(merged)}`);
    return;
  }
  await ghPut(path, merged, `add/update ${userId} in users.json`, sha);
  console.log(`✓ users.json に ${userId} を登録/更新`);
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts.dryRun && (!GITHUB_TOKEN || !DATA_REPO)) {
    throw new Error('GITHUB_TOKEN と DATA_REPO 環境変数が必要です(--dry-run でスキップ可能)');
  }
  const text = readFileSync(opts.pastePath, 'utf-8');
  const sections = splitReports(text);
  console.log(`[1/4] ${sections.length} セクション読み込み (paste=${opts.pastePath})`);

  const drives = [];
  for (const sec of sections) {
    const parsed = parseFormattedReport(normalizeSection(sec));
    let vehicleType = parsed.vehicleType || inferVehicleType(parsed.trips);
    if (opts.overrides[parsed.date]) vehicleType = opts.overrides[parsed.date];
    drives.push({
      date: parsed.date,
      vehicleType,
      departureTime: parsed.departureTime,
      returnTime: parsed.returnTime,
      trips: parsed.trips,
      rests: parsed.rests
    });
  }

  // 重複排除 (完全一致のみ片方捨てる、相違は中止)
  const byDate = {};
  for (const d of drives) { (byDate[d.date] ||= []).push(d); }
  const finalDrives = [];
  const conflicts = [];
  for (const [date, arr] of Object.entries(byDate)) {
    if (arr.length === 1) { finalDrives.push(arr[0]); continue; }
    const same = arr.every(x =>
      JSON.stringify(x.trips) === JSON.stringify(arr[0].trips) &&
      x.departureTime === arr[0].departureTime &&
      x.returnTime === arr[0].returnTime
    );
    if (same) { finalDrives.push(arr[0]); console.log(`  ↪ ${date}: 完全一致重複→1つに統合`); }
    else { conflicts.push(date); }
  }
  if (conflicts.length) {
    console.error(`★ 相違ある重複: ${conflicts.join(', ')} → push中止`);
    process.exit(1);
  }
  console.log(`[2/4] ${finalDrives.length} 日に集約 (premium=${finalDrives.filter(d => d.vehicleType === 'premium').length}, regular=${finalDrives.filter(d => d.vehicleType === 'regular').length})`);

  if (opts.dryRun) console.log('[dry-run] users.json チェックスキップ予定');
  else await ensureUser(opts.userId, opts.displayName, false);
  console.log(`[3/4] users.json チェック完了`);

  console.log(`[4/4] push 開始 (${opts.dryRun ? 'DRY-RUN' : 'LIVE'})`);
  let ok = 0, fail = 0;
  for (const d of finalDrives) {
    const path = `data/drives/${opts.userId}/${d.date}.json`;
    if (opts.dryRun) {
      console.log(`[dry-run] PUT ${path} (vehicleType=${d.vehicleType}, trips=${d.trips.length})`);
      ok++;
      continue;
    }
    try {
      const existing = await ghGet(path);
      const sha = existing?.sha || null;
      const msg = sha ? `update drive ${opts.userId}/${d.date}` : `add drive ${opts.userId}/${d.date}`;
      await ghPut(path, d, msg, sha);
      console.log(`✓ ${d.date} (${d.vehicleType}, ${d.trips.length}件)`);
      ok++;
    } catch (e) {
      console.error(`✗ ${d.date}: ${e.message}`);
      fail++;
    }
  }
  console.log('');
  console.log(`完了: 成功 ${ok} / 失敗 ${fail}`);
}

// CLI 直接呼び出し時のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });
}
```

- [ ] **Step 4: テスト全通過確認**

```bash
node --test tests/admin-bulk-push.test.js
```

期待: 9 PASS

- [ ] **Step 5: dry-run 動作確認**

```bash
node scripts/admin-bulk-push.mjs --user user_mm --display "mm" --dry-run --override 2026-01-20:premium 2>&1 | head -10
```

期待: `[dry-run] users.json -> {"users":...}` などが表示される

- [ ] **Step 6: 全体テスト**

```bash
npm test 2>&1 | tail -5
```

期待: 全件 PASS

---

## Task 6: docs/admin-bulk-import.md 作成(§C)

**Files:**
- Create: `docs/admin-bulk-import.md`

- [ ] **Step 1: ドキュメント作成**

```markdown
# 管理者向け bulk 投入手順

## 用途

知人の **過去分(初期データ)** を写真からまとめて取り込む手順。
**知人の日次運用は別経路** — `setup-for-collaborator.md` を参照(知人本人がアプリの input.html ペーストモードから自分で push)。

---

## 前提

- データリポジトリへの write 権限がある GitHub PAT または `gh auth login` 済み
- 環境変数 or インライン:
  - `GITHUB_TOKEN`(あれば。なければ `gh auth token` を流用)
  - `DATA_REPO`(例: `hidenaka/taxi-daily-report-data`)

---

## 手順

### 1. 写真を Gemini Web に投げてテキスト化

1. Gemini Web を開く(別ブラウザ・別アカウント推奨)
2. 写真を全部添付
3. プロンプトをペースト(`docs/ai-prompt-template.md` 参照)。要点:
   - 4行ヘッダー: 日付/車種/出庫/帰庫
   - 区切り行 `---`
   - CSV: `No,乗車,降車,時間,迎,乗車地,降車地,営Km,男,女,合計`
   - 休憩行: `休` で開始
   - キャンセル行: `キ` で開始
   - 料金: カンマ+クォート `"3,600"`
4. Gemini の出力テキストをコピー

### 2. paste-here.txt にペースト

```
data/paste-here.txt
```

このファイルにペースト&保存(macOSなら `open data/paste-here.txt` で TextEdit)。

### 3. 検証

```bash
node scripts/validate-pasted-bulk.mjs
```

確認すべき出力:
- 総セクション数 = 写真枚数と一致
- パース失敗 0
- 重複日付がある場合は完全一致 or 相違の判定
- キャンセル統計(¥400無条件・¥500/¥1000+0km・「キ」明示)
- 車種推論結果(premium / regular の日数)

問題あれば paste-here.txt を編集してリトライ。

### 4. push

```bash
GITHUB_TOKEN=$(gh auth token) DATA_REPO=hidenaka/taxi-daily-report-data \
  node scripts/admin-bulk-push.mjs --user user_X --display "Xさん"
```

**車種を上書きしたい日があれば:**
```bash
... --override 2026-01-20:premium,2025-10-08:regular
```

**dry-run で予定確認:**
```bash
node scripts/admin-bulk-push.mjs --user user_X --display "Xさん" --dry-run
```

### 5. PWA で確認

- `support.html` → 「曜日 × 時間 ¥/h」 → 「全員統合」タブで日数増加を確認
- `data/users.json` に `user_X` が含まれていることを確認:
  ```bash
  gh api repos/hidenaka/taxi-daily-report-data/contents/data/users.json --jq '.content' | base64 -d
  ```

---

## トラブル

| 症状 | 対処 |
|---|---|
| 「★ 相違ある重複: ... → push中止」 | paste-here.txt の同じ日付の片方を消すか、相違原因(OCRミス等)を解決 |
| `--user invalid` エラー | userId は `^[a-z][a-z0-9_]*$` のみ |
| 401 / 403 | tokenの権限不足。Personal Access Token に該当repoの write 権限を付ける or `gh auth refresh -s repo` |
```

- [ ] **Step 2: 内容を画面確認**

```bash
cat docs/admin-bulk-import.md
```

期待: 上記内容が表示される

---

## Task 7: README.md セクション差し替え(§C)

**Files:**
- Modify: `README.md`(「知人の写真をまとめて取込む(運営者向けスクリプト)」セクション)

- [ ] **Step 1: 該当セクション置換**

`README.md` の「### 知人の写真をまとめて取込む(運営者向けスクリプト)」 セクション全体を以下に置換:

```markdown
### 知人の写真をまとめて取込む(運営者向け)

過去分(初期データ)を Gemini Web 経由でテキスト化 → bulk push する手順は `docs/admin-bulk-import.md` を参照。

`scripts/admin-bulk-push.mjs` 一発で users.json 登録 + 全日 push まで完結する。

```bash
GITHUB_TOKEN=$(gh auth token) DATA_REPO=owner/taxi-daily-report-data \
  node scripts/admin-bulk-push.mjs --user user_X --display "Xさん"
```

知人本人の **日次運用** は別経路: `docs/setup-for-collaborator.md`(本人がアプリの入力画面ペーストモードから push)。
```

- [ ] **Step 2: 内容確認**

```bash
grep -A 12 "知人の写真をまとめて取込む" README.md
```

期待: 上記内容が表示される

---

## Task 8: SW cache version bump

**Files:**
- Modify: `sw.js:1`

- [ ] **Step 1: バージョン更新**

```javascript
const CACHE_NAME = 'taxi-daily-v69';
```

(現在は v68)

- [ ] **Step 2: 確認**

```bash
grep "CACHE_NAME" sw.js
```

期待: `const CACHE_NAME = 'taxi-daily-v69';`

---

## Task 9: 全体テスト + 統合動作確認

**Files:**
- 動作確認のみ

- [ ] **Step 1: 全テストpass**

```bash
cd "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報"
npm test 2>&1 | tail -8
```

期待: 全件 PASS

- [ ] **Step 2: PWA 統合動作確認(手動チェックリスト)**

ブラウザで PWA を開き SW を更新(リロード or DevTools → Application → SW unregister&reload):

1. `index.html` (ホーム) で本人の月次データが表示される
2. `review.html` (振り返り) で過去6か月の本人データが表示される
3. `calendar.html` で本人カレンダーが正しく描画される
4. `support.html`:
   - 「曜日 × 時間 ¥/h」カードに「自分のみ / 全員統合」タブがある
   - 「自分のみ」タブ: 18時前後(本人休憩多い時間)が薄い色 or データ少
   - 「全員統合」タブ: 18時セルにも数字が出る(知人が走っていれば)
   - セルtap: ¥/h、実稼働、休憩計が表示される
5. `settings.html` で userId=user_self が表示される(変更不要)

問題あればこの段階で fix を追加。

---

## Self-Review (実装計画作成後にコントローラ自身がチェック)

- ✅ Spec coverage: §1.1 ギャップ → Task 1, 2 / §1.2 追加要件(ヒートマップ) → Task 3, 4 / §1.2 追加要件(bulk push 汎用化) → Task 5 / §6 ドキュメント → Task 6, 7 / SW更新 → Task 8 / 統合確認 → Task 9
- ✅ Placeholders なし: TBD/TODO/「適切な〜」「同様に〜」なし
- ✅ Type consistency: matrix の cell プロパティ(presentMin, restMin, workingMin, hourlyA)、関数名(parseArgs, parseOverrides, mergeUsers)、引数仕様 全タスク間で一貫

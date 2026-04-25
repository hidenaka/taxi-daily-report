# タクシー日報アプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OCR済み日報テキストを貼り付けるだけで売上集計・歩率計算・推定支給額・天候記録を自動化する個人用PWAをGitHub Pages上に構築する。

**Architecture:** vanilla JS + ES modules（フレームワーク無し）の単一ページ複数HTML構成。**コードはパブリック GitHub Pages（`hidenaka/taxi-daily-report`）**、**データは別の private リポ（`hidenaka/taxi-daily-report-data`）** に分離。データはブラウザから GitHub APIで直接読み書き。Service WorkerでPWA化、iPhone Safariでホーム画面追加可能。

**Tech Stack:** vanilla JS（ES modules）、HTML/CSS、GitHub REST API（contents endpoint）、Open-Meteo API、Chart.js（CDN）、Service Worker、`node --test` ベースのユニットテスト

**設計ドキュメント:** `docs/superpowers/specs/2026-04-25-taxi-daily-report-design.md`（必読）

**プロジェクトルート:** `/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報/`

---

## Phase 1: Foundation

### Task 1: プロジェクト初期化

**Files:**
- Create: `タクシー日報/.gitignore`
- Create: `タクシー日報/README.md`
- Create: `タクシー日報/package.json`

- [ ] **Step 1: ディレクトリでgit初期化**

```bash
cd "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報"
git init
git branch -M main
```

- [ ] **Step 2: .gitignore作成**

```
.DS_Store
node_modules/
.env
.env.local
.superpowers/
*.log
```

- [ ] **Step 3: README.md作成**

```markdown
# タクシー日報

個人タクシー乗務員のための日報管理PWA。OCR済みテキストから売上集計・歩率計算・天候記録を自動化。

## セットアップ
1. GitHub Personal Access Token を発行（`repo` 権限）
2. `settings.html` を開いてトークンを設定
3. `data/config.json` のレートテーブルとデフォルト値を確認

## 開発
- ユニットテスト: `node --test tests/`
- ローカル起動: `python3 -m http.server 8000` または `npx serve`

詳細は `docs/superpowers/specs/` を参照。
```

- [ ] **Step 4: package.json作成（Node test実行用）**

```json
{
  "name": "taxi-daily-report",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test tests/",
    "serve": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 5: 初回コミット**

```bash
git add .gitignore README.md package.json docs/
git commit -m "chore: initial project structure with spec and plan"
```

---

### Task 2: テストfixturesを配置

**Files:**
- Create: `タクシー日報/tests/fixtures/sample-claude.txt`
- Create: `タクシー日報/tests/fixtures/sample-gemini.csv`

- [ ] **Step 1: ディレクトリ作成**

```bash
mkdir -p tests/fixtures
```

- [ ] **Step 2: Claude形式サンプル配置**

`tests/fixtures/sample-claude.txt` に以下を保存（タブ区切り、設計時にユーザーが提供したテキスト）：

```
No	乗車	降車	時間	迎	乗車地	降車地	営Km	合計	待機
1	07:17	07:22	0:05	迎	品川区中延5	品川区二葉4	0.8	1,000	
2	07:31	07:57	0:26	迎	品川区中延6	千代田区丸の内1	13.0	6,300	0:09
休	08:09	08:21	0:11		千代田区内幸町1			
3	08:26	08:34	0:08	迎	中央区銀座8	中央区八重洲1	1.9	1,400	0:05
4	08:42	08:50	0:08	迎	中央区日本橋人形町1	港区東新橋1	3.3	2,000	0:08
5	08:55	09:10	0:15	迎	港区東新橋2	目黒区青葉台2	8.6	4,100	0:05
6	09:14	09:32	0:18	迎	渋谷区鶯谷町	新宿区西新宿7	6.0	3,300	0:04
7	09:46	09:54	0:08	迎	新宿区上落合1	新宿区北新宿1	1.9	1,500	0:14
8	10:06	10:17	0:11	迎	渋谷区本町4	新宿区歌舞伎町2	2.9	2,000	0:12
9	10:30	10:42	0:12	迎	新宿区西新宿3	渋谷区神宮前1	3.5	2,100	0:13
10	10:51	11:20	0:29	迎	渋谷区宇田川町	台東区浅草2	17.5	7,800	0:09
11	11:34	11:42	0:08	迎	台東区浅草橋5	台東区花川戸1	2.3	1,700	0:14
12	11:51	12:02	0:11	迎	墨田区東向島1	台東区浅草1	2.5	1,800	0:09
13	12:10	12:24	0:14	迎	台東区寿2	中央区銀座3	6.6	3,400	0:08
14	12:33	13:35	1:02	迎	千代田区有楽町2	成田市木の根	77.9	29,110	0:09
休	13:49	14:13	0:24		印旛郡酒々井町墨			
15	15:09	15:39	0:30	迎	大田区羽田空港3	渋谷区渋谷3	20.2	8,900	0:56
16	15:52	16:02	0:10	迎	世田谷区池尻2	渋谷区神宮前6	3.2	2,000	0:13
17	16:24	16:32	0:08	迎	港区南青山2	港区南麻布4	2.8	1,800	0:22
18	16:42	16:47	0:05	迎	港区白金台3	港区白金台1	1.1	1,000	0:10
19	16:54	17:01	0:07	迎	港区白金1	港区芝5	1.7	1,400	0:07
20	17:12	17:32	0:20	迎	港区高輪2	大田区南馬込6	7.5	3,900	0:11
21	17:40	17:50	0:10	迎	大田区南馬込3	品川区戸越6	3.4	2,100	0:08
休	18:00	18:18	0:17		大田区北馬込1			
22	18:26	18:33	0:07	迎	大田区東馬込1	品川区中延6	1.9	1,300	0:08
23	18:43	18:52	0:09	迎	大田区上池台2	品川区小山6	2.1	1,600	0:10
24	19:00	19:16	0:16	迎	品川区小山6	目黒区上目黒1	4.8	2,800	0:08
25	19:21	19:35	0:14	迎	渋谷区代官山町	港区白金2	3.8	2,400	0:05
26	19:43	20:00	0:17	迎	品川区西五反田8	世田谷区奥沢3	6.1	3,200	0:08
休	20:31	22:43	2:12		大田区北馬込1			
```

- [ ] **Step 3: Gemini形式サンプル配置**

`tests/fixtures/sample-gemini.csv` に以下を保存（CSV、引用符付き）：

```
No,乗車,降車,時間,迎,乗車地,降車地,営Km,男,女,合計
1,07:17,07:38,0:21,迎,大田区上池台4,港区港南2,6.7,1,,"3,600"
2,07:57,08:20,0:23,迎,港区白金台2,港区六本木5,4.9,1,,"3,100"
3,08:31,08:42,0:11,迎,港区赤坂2,新宿区南元町,2.9,1,,"1,900"
4,08:50,09:04,0:14,迎,新宿区左門町,千代田区飯田橋3,4.3,1,,"2,600"
5,09:13,09:31,0:18,迎,千代田区飯田橋2,中央区日本橋茅場町2,3.8,1,,"2,600"
6,09:42,10:11,0:29,迎,中央区日本橋茅場町3,渋谷区神宮前4,10.4,1,,"5,200"
7,10:28,10:46,0:18,迎,港区赤坂2,江東区青海2,9.8,1,,"4,600"
休,10:47,11:36,0:49,,江東区青海2,,,,,
8,11:40,12:00,0:20,迎,江東区青海4,渋谷区東4,12.1,1,,"5,500"
9,12:19,12:48,0:29,迎,渋谷区恵比寿1,中央区日本橋浜町2,11.5,1,,"5,400"
休,12:49,13:01,0:12,,中央区日本橋人形町2,,,,,
10,13:16,13:30,0:14,迎,千代田区丸の内1,中央区銀座3,2.3,1,,"1,900"
11,13:36,13:52,0:16,迎,中央区八重洲1,台東区上野2,4.3,1,,"2,700"
12,14:02,14:21,0:19,迎,千代田区外神田1,墨田区押上1,5.2,1,,"3,000"
休,14:27,14:54,0:27,,墨田区本所4,,,,,
13,15:12,15:44,0:32,迎,台東区浅草7,渋谷区渋谷2,18.5,1,,"8,400"
14,15:51,16:04,0:13,迎,渋谷区神宮前6,港区元麻布2,3.6,1,,"2,200"
15,16:17,16:31,0:14,迎,港区三田2,中央区銀座7,4.4,1,,"2,400"
16,16:41,16:56,0:15,迎,千代田区丸の内2,中央区晴海1,4.2,1,,"2,600"
17,17:07,17:18,0:11,迎,中央区月島4,中央区銀座6,2.7,1,,"1,800"
18,17:30,17:41,0:11,迎,千代田区内幸町2,中央区銀座6,1.6,1,,"1,500"
休,17:49,18:55,1:05,,中央区築地4,,,,,
19,19:03,19:08,0:05,迎,中央区京橋1,千代田区有楽町1,1.9,1,,"1,400"
20,19:14,19:30,0:16,迎,千代田区丸の内3,台東区浅草橋2,4.0,1,,"2,600"
21,19:38,20:02,0:24,迎,千代田区岩本町3,江東区大島6,6.0,1,,"3,500"
22,20:29,21:23,0:54,迎,千代田区神田練塀町,杉並区松庵1,22.4,1,,"10,840"
23,21:53,22:13,0:20,,大田区羽田空港3,渋谷区広尾2,20.2,1,,"7,800"
24,22:21,22:42,0:21,迎,渋谷区広尾3,千代田区一番町,7.1,1,,"4,500"
休,22:45,22:57,0:12,,千代田区一番町,,,,,
25,23:02,23:48,0:46,迎,千代田区九段北3,大和市鶴間2,42.3,1,,"19,570"
休,00:38,01:13,0:35,,大田区北馬込1,,,,,
```

- [ ] **Step 4: コミット**

```bash
git add tests/fixtures/
git commit -m "test: add OCR text fixtures (Claude tab format + Gemini CSV format)"
```

---

### Task 3: GitHubリポジトリ作成は Phase 5 に移動

ユーザーの希望により、リポジトリ作成（コード用パブリック + データ用プライベート）はアプリ完成後の Phase 5 でまとめて実施する。

ローカル開発は git init 済みのローカルリポジトリで進め、最終的に push する。

---

## Phase 2: Pure Logic（パーサーと給与計算）

### Task 4: テストランナー作成

**Files:**
- Create: `タクシー日報/tests/run.js`

- [ ] **Step 1: シンプルなテストランナー作成**

`tests/run.js` を作る（vanilla JSをnode上で動かすため、最低限のテストヘルパー）：

```javascript
// node --test を使うシンプルなランナー
// 各 *.test.js ファイルは import.meta.main 直下で test() を呼ぶ
import { test } from 'node:test';
import assert from 'node:assert/strict';

export { test, assert };
```

- [ ] **Step 2: 動作確認用のダミーテスト**

`tests/sanity.test.js`:

```javascript
import { test, assert } from './run.js';

test('sanity: 1+1=2', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: テスト実行**

```bash
node --test tests/sanity.test.js
```

Expected: `# pass 1` 表示

- [ ] **Step 4: コミット**

```bash
git add tests/run.js tests/sanity.test.js
git commit -m "test: add minimal test runner using node --test"
```

---

### Task 5: parser.js — 形式判別 + Claude形式パース

**Files:**
- Create: `タクシー日報/js/parser.js`
- Create: `タクシー日報/tests/parser.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`tests/parser.test.js`:

```javascript
import { test, assert } from './run.js';
import { parseReport, detectFormat } from '../js/parser.js';
import { readFileSync } from 'node:fs';

test('detectFormat: Claude形式（タブ）を判別', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  assert.equal(detectFormat(text), 'claude');
});

test('detectFormat: Gemini形式（CSV）を判別', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  assert.equal(detectFormat(text), 'gemini');
});

test('parseReport: Claude形式から trips 26件、rests 5件を抽出', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  const result = parseReport(text);
  assert.equal(result.trips.length, 26);
  assert.equal(result.rests.length, 5);
});

test('parseReport: Claude形式の最初のtripが正しい', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  const result = parseReport(text);
  const t = result.trips[0];
  assert.equal(t.no, 1);
  assert.equal(t.boardTime, '07:17');
  assert.equal(t.alightTime, '07:22');
  assert.equal(t.boardPlace, '品川区中延5');
  assert.equal(t.alightPlace, '品川区二葉4');
  assert.equal(t.km, 0.8);
  assert.equal(t.amount, 1000);
  assert.equal(t.isPickup, true);
  assert.equal(t.isCancel, false);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/parser.test.js
```

Expected: `Cannot find module '../js/parser.js'` エラー

- [ ] **Step 3: parser.js の最小実装（Claude形式のみ）**

`js/parser.js`:

```javascript
// 形式判別: 1行目（ヘッダー）にカンマがあれば CSV (Gemini)、それ以外はタブ (Claude)
export function detectFormat(text) {
  const firstLine = text.split('\n')[0] || '';
  return firstLine.includes(',') ? 'gemini' : 'claude';
}

// 「合計」列のような "1,000" や "29,110" を数値化（カンマ除去）
function parseAmount(s) {
  if (!s || s.trim() === '') return 0;
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}

function parseKm(s) {
  if (!s || s.trim() === '') return 0;
  return parseFloat(s) || 0;
}

function parseClaudeRow(cells) {
  // [No, 乗車, 降車, 時間, 迎, 乗車地, 降車地, 営Km, 合計, 待機]
  const [no, board, alight, dur, pickup, bp, ap, km, amt, wait] = cells;
  if (no === '休') {
    return { type: 'rest', startTime: board, endTime: alight, place: bp };
  }
  return {
    type: 'trip',
    no: parseInt(no, 10),
    boardTime: board,
    alightTime: alight,
    boardPlace: bp,
    alightPlace: ap,
    km: parseKm(km),
    amount: parseAmount(amt),
    isPickup: pickup === '迎',
    isCancel: false,
    waitTime: wait || ''
  };
}

export function parseReport(text) {
  const format = detectFormat(text);
  const lines = text.split('\n').filter(l => l.trim() !== '');
  // ヘッダー行をスキップ
  const dataLines = lines.slice(1);

  const trips = [];
  const rests = [];

  for (const line of dataLines) {
    const cells = format === 'claude' ? line.split('\t') : []; // Geminiは次のタスクで
    if (cells.length === 0) continue;

    const parsed = parseClaudeRow(cells);
    if (parsed.type === 'rest') rests.push({ startTime: parsed.startTime, endTime: parsed.endTime, place: parsed.place });
    else { delete parsed.type; trips.push(parsed); }
  }

  return { trips, rests, format };
}
```

- [ ] **Step 4: テスト実行（Claude形式の4テストがpassするはず）**

```bash
node --test tests/parser.test.js
```

Expected: 4 pass, Geminiパースのテストはまだない

- [ ] **Step 5: コミット**

```bash
git add js/parser.js tests/parser.test.js
git commit -m "feat(parser): detect format and parse Claude tab-separated text"
```

---

### Task 6: parser.js — Gemini形式（CSV）パース対応

**Files:**
- Modify: `タクシー日報/js/parser.js`
- Modify: `タクシー日報/tests/parser.test.js`

- [ ] **Step 1: 失敗するテストを追加**

`tests/parser.test.js` に追記：

```javascript
test('parseReport: Gemini形式から trips 25件、rests 5件を抽出', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  const result = parseReport(text);
  assert.equal(result.trips.length, 25);
  assert.equal(result.rests.length, 5);
});

test('parseReport: Gemini形式の最初のtripが正しい（引用符付き金額）', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  const result = parseReport(text);
  const t = result.trips[0];
  assert.equal(t.no, 1);
  assert.equal(t.boardTime, '07:17');
  assert.equal(t.alightTime, '07:38');
  assert.equal(t.boardPlace, '大田区上池台4');
  assert.equal(t.alightPlace, '港区港南2');
  assert.equal(t.km, 6.7);
  assert.equal(t.amount, 3600);  // "3,600" → 3600
});

test('parseReport: Gemini形式で「迎」フィールドが空の場合 isPickup=false', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  const result = parseReport(text);
  // 23番（22:13到着）は「迎」が空（流し営業）
  const trip23 = result.trips.find(t => t.no === 23);
  assert.equal(trip23.isPickup, false);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/parser.test.js
```

Expected: 3 fail（trips=0など）、4 pass

- [ ] **Step 3: CSV行パース関数を追加**

`js/parser.js` に追記：

```javascript
// CSV1行を引用符を考慮してセルに分解
function splitCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { cells.push(cur); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function parseGeminiRow(cells) {
  // [No, 乗車, 降車, 時間, 迎, 乗車地, 降車地, 営Km, 男, 女, 合計]
  const [no, board, alight, dur, pickup, bp, ap, km, _m, _f, amt] = cells;
  if (no === '休') {
    return { type: 'rest', startTime: board, endTime: alight, place: bp };
  }
  return {
    type: 'trip',
    no: parseInt(no, 10),
    boardTime: board,
    alightTime: alight,
    boardPlace: bp,
    alightPlace: ap,
    km: parseKm(km),
    amount: parseAmount(amt),
    isPickup: pickup === '迎',
    isCancel: false,
    waitTime: ''
  };
}
```

- [ ] **Step 4: parseReport を更新して両形式に対応**

`js/parser.js` の parseReport を以下に置き換え：

```javascript
export function parseReport(text) {
  const format = detectFormat(text);
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const dataLines = lines.slice(1);

  const trips = [];
  const rests = [];

  for (const line of dataLines) {
    const cells = format === 'claude' ? line.split('\t') : splitCsvLine(line);
    if (cells.length === 0 || (cells.length === 1 && cells[0].trim() === '')) continue;

    const parsed = format === 'claude' ? parseClaudeRow(cells) : parseGeminiRow(cells);
    if (parsed.type === 'rest') {
      rests.push({ startTime: parsed.startTime, endTime: parsed.endTime, place: parsed.place });
    } else {
      delete parsed.type;
      trips.push(parsed);
    }
  }

  return { trips, rests, format };
}
```

- [ ] **Step 5: テスト実行**

```bash
node --test tests/parser.test.js
```

Expected: 7 pass

- [ ] **Step 6: コミット**

```bash
git add js/parser.js tests/parser.test.js
git commit -m "feat(parser): parse Gemini CSV format with quoted amounts"
```

---

### Task 7: parser.js — キャンセル判定

**Files:**
- Modify: `タクシー日報/js/parser.js`
- Modify: `タクシー日報/tests/parser.test.js`

- [ ] **Step 1: 失敗するテストを追加**

`tests/parser.test.js` に追記：

```javascript
test('parseReport: km=0 & amount=500 はキャンセル扱い、amount=0 に上書き', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
1\t10:00\t10:05\t0:05\t迎\t品川区A\t品川区A\t0\t500\t`;
  const result = parseReport(text);
  assert.equal(result.trips.length, 1);
  assert.equal(result.trips[0].isCancel, true);
  assert.equal(result.trips[0].amount, 0);
});

test('parseReport: km=0 & 乗車地==降車地 もキャンセル扱い（500円以外でも）', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
2\t11:00\t11:00\t0:00\t迎\t大田区西蒲田5\t大田区西蒲田5\t0\t0\t`;
  const result = parseReport(text);
  assert.equal(result.trips[0].isCancel, true);
  assert.equal(result.trips[0].amount, 0);
});

test('parseReport: 通常乗車（km>0）はキャンセル扱いにならない', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
3\t12:00\t12:10\t0:10\t迎\t品川区A\t品川区B\t2.0\t1500\t`;
  const result = parseReport(text);
  assert.equal(result.trips[0].isCancel, false);
  assert.equal(result.trips[0].amount, 1500);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/parser.test.js
```

Expected: 3 fail

- [ ] **Step 3: parseClaudeRow と parseGeminiRow にキャンセル判定を追加**

`js/parser.js` の各 parse*Row 関数の return 直前に以下を追加：

```javascript
// キャンセル判定: km=0 で (amount=500 or 乗車地==降車地)
const isCancel = parseKm(km) === 0 && (parseAmount(amt) === 500 || bp === ap);
const finalAmount = isCancel ? 0 : parseAmount(amt);
```

そして trip オブジェクトの `amount: parseAmount(amt)` を `amount: finalAmount`、`isCancel: false` を `isCancel` に置き換える。

完成後の parseClaudeRow:

```javascript
function parseClaudeRow(cells) {
  const [no, board, alight, dur, pickup, bp, ap, km, amt, wait] = cells;
  if (no === '休') {
    return { type: 'rest', startTime: board, endTime: alight, place: bp };
  }
  const isCancel = parseKm(km) === 0 && (parseAmount(amt) === 500 || bp === ap);
  return {
    type: 'trip',
    no: parseInt(no, 10),
    boardTime: board,
    alightTime: alight,
    boardPlace: bp,
    alightPlace: ap,
    km: parseKm(km),
    amount: isCancel ? 0 : parseAmount(amt),
    isPickup: pickup === '迎',
    isCancel,
    waitTime: wait || ''
  };
}
```

parseGeminiRow も同様に変更。

- [ ] **Step 4: テスト実行**

```bash
node --test tests/parser.test.js
```

Expected: 10 pass

- [ ] **Step 5: コミット**

```bash
git add js/parser.js tests/parser.test.js
git commit -m "feat(parser): detect cancellations (km=0 & amount=500 or same boarding/alighting)"
```

---

### Task 8: parser.js — 帰庫時刻自動抽出

**Files:**
- Modify: `タクシー日報/js/parser.js`
- Modify: `タクシー日報/tests/parser.test.js`

- [ ] **Step 1: 失敗するテストを追加**

```javascript
test('parseReport: 末尾が「休」行なら returnTime をその endTime にする', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  const result = parseReport(text);
  // 末尾は「休 20:31 22:43」
  assert.equal(result.returnTime, '22:43');
});

test('parseReport: 末尾が乗車行なら returnTime は null', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
1\t12:00\t12:10\t0:10\t迎\t品川区A\t品川区B\t2.0\t1500\t`;
  const result = parseReport(text);
  assert.equal(result.returnTime, null);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/parser.test.js
```

Expected: 2 fail

- [ ] **Step 3: parseReport の最後に returnTime 判定を追加**

`js/parser.js` の parseReport 末尾、return前に以下を追加：

```javascript
  // 末尾の行が rests の最後の要素と一致するかで判定
  // 簡略化: 全lines（filter後）の最終要素を再パースして「休」かを見る
  const allDataCells = dataLines.length > 0
    ? (format === 'claude' ? dataLines[dataLines.length - 1].split('\t') : splitCsvLine(dataLines[dataLines.length - 1]))
    : [];
  const lastNo = allDataCells[0];
  const returnTime = lastNo === '休' && rests.length > 0 ? rests[rests.length - 1].endTime : null;

  return { trips, rests, returnTime, format };
```

- [ ] **Step 4: テスト実行**

```bash
node --test tests/parser.test.js
```

Expected: 12 pass

- [ ] **Step 5: コミット**

```bash
git add js/parser.js tests/parser.test.js
git commit -m "feat(parser): auto-extract returnTime from trailing rest row"
```

---

### Task 9: payroll.js — 月累計集計

**Files:**
- Create: `タクシー日報/js/payroll.js`
- Create: `タクシー日報/tests/payroll.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`tests/payroll.test.js`:

```javascript
import { test, assert } from './run.js';
import { calcDailySales, calcMonthlySales } from '../js/payroll.js';

test('calcDailySales: trips のキャンセル除いた合計（税込）', () => {
  const drive = {
    trips: [
      { amount: 1000, isCancel: false },
      { amount: 6300, isCancel: false },
      { amount: 0, isCancel: true },     // キャンセルは除外
      { amount: 2000, isCancel: false }
    ]
  };
  assert.equal(calcDailySales(drive).inclTax, 9300);
  assert.equal(calcDailySales(drive).exclTax, 9300 / 1.1);
});

test('calcMonthlySales: drives全体の合計', () => {
  const drives = [
    { trips: [{ amount: 50000, isCancel: false }] },
    { trips: [{ amount: 60000, isCancel: false }, { amount: 500, isCancel: true }] }
  ];
  const result = calcMonthlySales(drives);
  assert.equal(result.inclTax, 110000);
  assert.equal(result.exclTax, 110000 / 1.1);
  assert.equal(result.shiftCount, 2);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/payroll.test.js
```

Expected: `Cannot find module` エラー

- [ ] **Step 3: payroll.js の最小実装**

`js/payroll.js`:

```javascript
const TAX_RATE = 1.1;

export function calcDailySales(drive) {
  const inclTax = (drive.trips || [])
    .filter(t => !t.isCancel)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  return {
    inclTax,
    exclTax: inclTax / TAX_RATE
  };
}

export function calcMonthlySales(drives) {
  let inclTax = 0;
  for (const drive of drives) {
    inclTax += calcDailySales(drive).inclTax;
  }
  return {
    inclTax,
    exclTax: inclTax / TAX_RATE,
    shiftCount: drives.length
  };
}
```

- [ ] **Step 4: テスト実行**

```bash
node --test tests/payroll.test.js
```

Expected: 2 pass

- [ ] **Step 5: コミット**

```bash
git add js/payroll.js tests/payroll.test.js
git commit -m "feat(payroll): calculate daily and monthly sales (excluding cancellations)"
```

---

### Task 10: payroll.js — 11乗務以下の歩率引き

**Files:**
- Modify: `タクシー日報/js/payroll.js`
- Modify: `タクシー日報/tests/payroll.test.js`

- [ ] **Step 1: 失敗するテストを書く**

```javascript
import { findRate, calcBasePay } from '../js/payroll.js';

test('findRate: 売上ティアからrateを引く', () => {
  const tiers = [
    { salesMin: 0, salesMax: 500000, rate: 0.55 },
    { salesMin: 500000, salesMax: 1000000, rate: 0.62 },
    { salesMin: 1000000, salesMax: 2000000, rate: 0.687 }
  ];
  assert.equal(findRate(tiers, 300000), 0.55);
  assert.equal(findRate(tiers, 700000), 0.62);
  assert.equal(findRate(tiers, 1100000), 0.687);
});

test('findRate: テーブル外（最大超）→最大ティアの率', () => {
  const tiers = [
    { salesMin: 0, salesMax: 500000, rate: 0.55 },
    { salesMin: 500000, salesMax: 1000000, rate: 0.62 }
  ];
  assert.equal(findRate(tiers, 2000000), 0.62);
});

test('calcBasePay: 11乗務、売上1,100,000(税抜) → 歩率68.7% → 755,700', () => {
  const drives = Array(11).fill({ trips: [{ amount: 110000, isCancel: false }] });
  // 11乗務×110,000(税込) = 1,210,000(税込) = 1,100,000(税抜)
  const config = {
    rateTable: {
      "11": [
        { salesMin: 0, salesMax: 500000, rate: 0.55 },
        { salesMin: 500000, salesMax: 1000000, rate: 0.62 },
        { salesMin: 1000000, salesMax: 2000000, rate: 0.687 }
      ],
      "12_13rate": 0.62
    }
  };
  const result = calcBasePay(drives, config);
  // 1,100,000 × 0.687 = 755,700
  assert.equal(Math.round(result.basePay), 755700);
  assert.equal(result.rate, 0.687);
  assert.equal(result.shiftCount, 11);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/payroll.test.js
```

Expected: 3 fail

- [ ] **Step 3: findRate と calcBasePay を実装**

`js/payroll.js` に追記：

```javascript
export function findRate(tiers, salesExclTax) {
  for (const tier of tiers) {
    if (salesExclTax >= tier.salesMin && salesExclTax < tier.salesMax) {
      return tier.rate;
    }
  }
  // 範囲外（最大超）→最大ティアの率
  return tiers[tiers.length - 1].rate;
}

export function calcBasePay(drives, config) {
  const monthly = calcMonthlySales(drives);
  const shiftCount = monthly.shiftCount;
  const salesExclTax = monthly.exclTax;

  if (shiftCount <= 11) {
    const tiers = config.rateTable[String(shiftCount)] || config.rateTable["11"];
    const rate = findRate(tiers, salesExclTax);
    return { basePay: salesExclTax * rate, rate, shiftCount };
  }
  // 12乗務以上は次のタスクで実装
  return { basePay: 0, rate: 0, shiftCount };
}
```

- [ ] **Step 4: テスト実行**

```bash
node --test tests/payroll.test.js
```

Expected: 5 pass

- [ ] **Step 5: コミット**

```bash
git add js/payroll.js tests/payroll.test.js
git commit -m "feat(payroll): lookup rate from tier table for shifts 1-11"
```

---

### Task 11: payroll.js — 12-13乗務目の特別計算

**Files:**
- Modify: `タクシー日報/js/payroll.js`
- Modify: `タクシー日報/tests/payroll.test.js`

- [ ] **Step 1: 失敗するテストを書く**

```javascript
test('calcBasePay: 13乗務、11乗務までで1,100,000(税抜)+12-13回各110,000(税抜) → basePay = 755,700 + 110,000×2×0.62 = 892,100', () => {
  const drives = Array(13).fill({ trips: [{ amount: 121000, isCancel: false }] });
  // 各日 121,000(税込) = 110,000(税抜)、13乗務
  const config = {
    rateTable: {
      "11": [
        { salesMin: 0, salesMax: 500000, rate: 0.55 },
        { salesMin: 500000, salesMax: 1000000, rate: 0.62 },
        { salesMin: 1000000, salesMax: 2000000, rate: 0.687 }
      ],
      "12_13rate": 0.62
    }
  };
  const result = calcBasePay(drives, config);
  // 11乗務まで: 1,210,000税込 → 1,100,000税抜 × 0.687 = 755,700
  // 12-13乗務: 110,000 × 2 × 0.62 = 136,400
  // 合計: 892,100
  assert.equal(Math.round(result.basePay), 892100);
  assert.equal(result.shiftCount, 13);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/payroll.test.js
```

Expected: 1 fail (basePay=0)

- [ ] **Step 3: calcBasePay の 12乗務以上分岐を実装**

`js/payroll.js` の calcBasePay を以下に置き換え：

```javascript
export function calcBasePay(drives, config) {
  const shiftCount = drives.length;

  if (shiftCount <= 11) {
    const monthly = calcMonthlySales(drives);
    const tiers = config.rateTable[String(shiftCount)] || config.rateTable["11"];
    const rate = findRate(tiers, monthly.exclTax);
    return { basePay: monthly.exclTax * rate, rate, shiftCount };
  }

  // 12乗務以上: 11乗務目までで歩率算出 + 12乗務目以降は固定率
  const drives11 = drives.slice(0, 11);
  const monthly11 = calcMonthlySales(drives11);
  const rate11 = findRate(config.rateTable["11"], monthly11.exclTax);
  let basePay = monthly11.exclTax * rate11;

  const extraRate = config.rateTable["12_13rate"];
  for (const drive of drives.slice(11)) {
    const daily = calcDailySales(drive);
    basePay += daily.exclTax * extraRate;
  }

  return { basePay, rate: rate11, shiftCount, extraRate };
}
```

- [ ] **Step 4: テスト実行**

```bash
node --test tests/payroll.test.js
```

Expected: 6 pass

- [ ] **Step 5: コミット**

```bash
git add js/payroll.js tests/payroll.test.js
git commit -m "feat(payroll): apply 62% rate for shifts 12+"
```

---

### Task 12: payroll.js — プレミアムインセンティブ

**Files:**
- Modify: `タクシー日報/js/payroll.js`
- Modify: `タクシー日報/tests/payroll.test.js`

- [ ] **Step 1: 失敗するテストを書く**

```javascript
import { calcIncentive, calcTotalPay } from '../js/payroll.js';

test('calcIncentive: プレミアム車両で税抜80,000円超の日 → 1乗務2,000円', () => {
  const drives = [
    { vehicleType: 'premium', trips: [{ amount: 99000, isCancel: false }] },  // 90,000税抜 > 80,000 → 加算
    { vehicleType: 'premium', trips: [{ amount: 80000, isCancel: false }] },  // 約72,727税抜 → 加算なし
    { vehicleType: 'regular', trips: [{ amount: 110000, isCancel: false }] }  // 普通車 → 加算なし
  ];
  const config = {
    premiumIncentive: { thresholdSalesExclTax: 80000, amountPerShift: 2000 }
  };
  assert.equal(calcIncentive(drives, config), 2000);
});

test('calcTotalPay: basePay + incentive', () => {
  const drives = Array(11).fill({ vehicleType: 'regular', trips: [{ amount: 110000, isCancel: false }] });
  const config = {
    rateTable: {
      "11": [
        { salesMin: 0, salesMax: 500000, rate: 0.55 },
        { salesMin: 500000, salesMax: 1000000, rate: 0.62 },
        { salesMin: 1000000, salesMax: 2000000, rate: 0.687 }
      ],
      "12_13rate": 0.62
    },
    premiumIncentive: { thresholdSalesExclTax: 80000, amountPerShift: 2000 }
  };
  const result = calcTotalPay(drives, config);
  assert.equal(Math.round(result.basePay), 755700);
  assert.equal(result.incentive, 0);
  assert.equal(Math.round(result.total), 755700);
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
node --test tests/payroll.test.js
```

Expected: 2 fail

- [ ] **Step 3: calcIncentive と calcTotalPay を実装**

`js/payroll.js` に追記：

```javascript
export function calcIncentive(drives, config) {
  const { thresholdSalesExclTax, amountPerShift } = config.premiumIncentive;
  let total = 0;
  for (const drive of drives) {
    if (drive.vehicleType !== 'premium') continue;
    const daily = calcDailySales(drive);
    if (daily.exclTax > thresholdSalesExclTax) total += amountPerShift;
  }
  return total;
}

export function calcTotalPay(drives, config) {
  const base = calcBasePay(drives, config);
  const incentive = calcIncentive(drives, config);
  return {
    ...base,
    incentive,
    total: base.basePay + incentive
  };
}
```

- [ ] **Step 4: テスト実行**

```bash
node --test tests/payroll.test.js
```

Expected: 8 pass

- [ ] **Step 5: コミット**

```bash
git add js/payroll.js tests/payroll.test.js
git commit -m "feat(payroll): add premium vehicle incentive (2000 yen per shift over 80k)"
```

---

### Task 13: rateTable を IMG_5676 から推定 → config.json 作成

**Files:**
- Create: `タクシー日報/data/config.json`
- Create: `タクシー日報/data/drives/.gitkeep`

- [ ] **Step 1: ディレクトリ作成**

```bash
mkdir -p data/drives
touch data/drives/.gitkeep
```

- [ ] **Step 2: IMG_5676 を高解像度で読み取り、rateTable を JSON 化**

`/Users/hideakimacbookair/Downloads/IMG_5676.JPG` を Read ツールで開いて、各乗務数（11/10/9/8/7/6/5/4）の売上ティアと歩率を全て抽出。

実装エンジニア（または Claude）は画像を Read して、各セクション（11乗務、10乗務、…）の表を読む。読み取り結果を以下のフォーマットで `data/config.json` に保存：

```json
{
  "shifts": {
    "patterns": ["sun", "tue", "thu"],
    "exceptions": { "added": [], "removed": [], "swapped": [] },
    "expandedDates": []
  },
  "defaults": {
    "vehicleType": "regular",
    "departureTime": "07:00"
  },
  "weatherLocation": {
    "lat": 35.6938,
    "lon": 139.7036,
    "name": "千代田区"
  },
  "premiumIncentive": {
    "thresholdSalesExclTax": 80000,
    "amountPerShift": 2000
  },
  "responsibilityShifts": 11,
  "rateTable": {
    "11": [
      { "salesMin": 0,       "salesMax": 50000,   "rate": 0.50 },
      { "salesMin": 50000,   "salesMax": 100000,  "rate": 0.52 }
    ],
    "10": [],
    "9": [],
    "8": [],
    "7": [],
    "6": [],
    "5": [],
    "4": [],
    "12_13rate": 0.62
  },
  "lastUpdated": "2026-04-25T12:00:00+09:00"
}
```

**画像読み取りの手順:**
1. `Read` ツールで画像を表示
2. 表が3セクション（上段: 11/10乗務、中段: 9/8/7/6乗務、下段: 5/4/3/2/1乗務）に分かれている
3. 各セクションで「乗務数 × 売上額 × 歩率 × 支給額」のマトリクスを読み取る
4. salesMin / salesMax / rate のJSON配列に変換
5. 不明瞭な数字は給与明細（IMG_7252等）と突き合わせて検算

- [ ] **Step 3: config.json をコミット**

```bash
git add data/config.json data/drives/.gitkeep
git commit -m "feat(config): add initial rate table extracted from IMG_5676"
```

---

### Task 14: payroll.js を過去給与明細で検算

**Files:**
- Create: `タクシー日報/tests/payroll-verification.test.js`
- Create: `タクシー日報/tests/fixtures/payslip-2026-04-drives.json`（既知の月の入力データ）

- [ ] **Step 1: 過去明細データを準備**

`/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/給与データ/IMG_7252.jpg` (2026年4月) を Read で開き、以下の値をメモ：
- 営収合計（税込）: 1,041,610
- 歩合対象（税抜）: 776,508
- インセンティブ: 22,000
- 想定乗務数: 11（責任出番）

過去明細だけでは「日別の売上配分」と「乗務種別」が不明な場合、ユーザーに以下を確認：
- 4月は何乗務だった？
- そのうち何日がプレミアム車両？

`tests/fixtures/payslip-2026-04-drives.json`:

```json
{
  "expectedTotalSalesInclTax": 1041610,
  "expectedTotalSalesExclTax": 947009,
  "expectedShiftCount": 11,
  "expectedBasePay": 776508,
  "expectedIncentive": 22000,
  "drives": [
    { "date": "2026-04-XX", "vehicleType": "premium", "trips": [{ "amount": NN, "isCancel": false }] }
  ]
}
```

実データ詳細はユーザーから取得する必要あり。代替策として「合計値だけ検証」する妥協テストも可：

- [ ] **Step 2: 検算テストを書く（簡易版）**

`tests/payroll-verification.test.js`:

```javascript
import { test, assert } from './run.js';
import { calcTotalPay, findRate } from '../js/payroll.js';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('data/config.json', 'utf-8'));

test('検算: 11乗務・税抜947,009 (2026年4月実績) → basePay ≈ 776,508 (±1000)', () => {
  // 1乗務あたりの均等配分で近似（厳密な日別データがなければこれで充分）
  const dailySalesInclTax = 1041610 / 11;
  const drives = Array(11).fill(null).map(() => ({
    vehicleType: 'regular',
    trips: [{ amount: dailySalesInclTax, isCancel: false }]
  }));
  const result = calcTotalPay(drives, config);
  const diff = Math.abs(result.basePay - 776508);
  assert.ok(diff <= 1000, `差額 ${diff}円 (basePay=${Math.round(result.basePay)})`);
});
```

- [ ] **Step 3: テスト実行**

```bash
node --test tests/payroll-verification.test.js
```

Expected: パスする。**失敗したら** rateTable の値を調整して再実行。

- [ ] **Step 4: 他の月（IMG_7167=3月、IMG_7109=2月、IMG_7074=1月）も同じ手順で検算テスト追加**

各月分のテストを追加して、3-4ヶ月の検算が全て ±1,000円以内に収まることを確認。

- [ ] **Step 5: コミット**

```bash
git add tests/payroll-verification.test.js tests/fixtures/payslip-*.json data/config.json
git commit -m "test(payroll): verify calculations against historical pay slips"
```

---

## Phase 3: External I/O

### Task 15: storage.js — GitHub API GET

**Files:**
- Create: `タクシー日報/js/storage.js`

- [ ] **Step 1: storage.js の GET 関数を実装**

ブラウザ環境前提（fetch・atob・btoaが使える）。`js/storage.js`:

```javascript
const API_BASE = 'https://api.github.com';

function getToken() {
  return localStorage.getItem('github_token');
}

function getRepo() {
  // データリポ（"username/taxi-daily-report-data"）。コードリポではない点注意。
  return localStorage.getItem('github_data_repo');
}

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error('GitHub token未設定');
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

// 単一ファイルを取得 → JSONパース済みで返す
export async function getFile(path) {
  const repo = getRepo();
  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
    headers: authHeaders()
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  // base64デコード → UTF-8 → JSON
  const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  return { content: JSON.parse(decoded), sha: data.sha };
}

// ディレクトリ内のファイル一覧
export async function listFiles(dir) {
  const repo = getRepo();
  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${dir}`, {
    headers: authHeaders()
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json(); // [{ name, path, sha, ... }]
}

export async function getConfig() {
  const result = await getFile('data/config.json');
  return result?.content || null;
}

export async function getDrive(date) {
  const result = await getFile(`data/drives/${date}.json`);
  return result?.content || null;
}

// 当月の全drive並列取得
export async function getDrivesForMonth(yearMonth) {
  const files = await listFiles('data/drives');
  const monthFiles = files.filter(f => f.name.startsWith(yearMonth) && f.name.endsWith('.json'));
  const drives = await Promise.all(
    monthFiles.map(f => getFile(f.path).then(r => r?.content))
  );
  return drives.filter(d => d !== null);
}
```

- [ ] **Step 2: 動作確認**

ユニットテスト不要（ブラウザのfetchを叩くため）。次のタスク完了後、ブラウザで実動作確認する。

- [ ] **Step 3: コミット**

```bash
git add js/storage.js
git commit -m "feat(storage): GitHub API GET helpers (config, drive, month-drives)"
```

---

### Task 16: storage.js — GitHub API PUT

**Files:**
- Modify: `タクシー日報/js/storage.js`

- [ ] **Step 1: PUT 関数を追加**

`js/storage.js` に追記：

```javascript
// UTF-8文字列を base64 エンコード
function encodeContent(jsonObject) {
  const text = JSON.stringify(jsonObject, null, 2);
  return btoa(unescape(encodeURIComponent(text)));
}

// ファイルを作成 or 更新（コンフリクト時は409返す）
export async function putFile(path, jsonObject, message, sha = null) {
  const repo = getRepo();
  const body = {
    message,
    content: encodeContent(jsonObject)
  };
  if (sha) body.sha = sha; // 更新時は必須

  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.status === 409 || (res.status === 422 && (await res.clone().json()).message?.includes('sha'))) {
    const err = new Error('Conflict');
    err.code = 'CONFLICT';
    throw err;
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function saveDrive(drive) {
  const path = `data/drives/${drive.date}.json`;
  // 既存shaを取得（更新の場合）
  const existing = await getFile(path);
  const sha = existing?.sha || null;
  const message = sha ? `update drive ${drive.date}` : `add drive ${drive.date}`;
  return putFile(path, drive, message, sha);
}

export async function saveConfig(config) {
  const existing = await getFile('data/config.json');
  const sha = existing?.sha || null;
  return putFile('data/config.json', config, 'update config', sha);
}
```

- [ ] **Step 2: コミット**

```bash
git add js/storage.js
git commit -m "feat(storage): GitHub API PUT helpers (saveDrive, saveConfig)"
```

---

### Task 17: storage.js — エラーハンドリング + 保存待ちキュー

**Files:**
- Modify: `タクシー日報/js/storage.js`

- [ ] **Step 1: ネットワーク失敗時のキュー機能を追加**

`js/storage.js` に追記：

```javascript
const PENDING_QUEUE_KEY = 'pending_saves';

function getPendingQueue() {
  return JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
}

function setPendingQueue(queue) {
  localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
}

// saveDriveをラップ: 失敗時はキューに退避
export async function saveDriveSafe(drive) {
  try {
    return await saveDrive(drive);
  } catch (err) {
    if (err.code === 'CONFLICT') throw err; // コンフリクトは呼び元で処理
    // ネットワーク or その他失敗 → キューに退避
    const queue = getPendingQueue();
    queue.push({ type: 'drive', data: drive, queuedAt: Date.now() });
    setPendingQueue(queue);
    throw new Error(`保存失敗: ${err.message} (キューに退避済、復帰時に再送します)`);
  }
}

// 起動時に呼ぶ：キュー内の保存待ちを再送
export async function flushPendingQueue() {
  const queue = getPendingQueue();
  const remaining = [];
  for (const item of queue) {
    try {
      if (item.type === 'drive') await saveDrive(item.data);
    } catch (err) {
      remaining.push(item);
    }
  }
  setPendingQueue(remaining);
  return { sent: queue.length - remaining.length, remaining: remaining.length };
}
```

- [ ] **Step 2: コミット**

```bash
git add js/storage.js
git commit -m "feat(storage): pending save queue for offline/network failure recovery"
```

---

### Task 18: weather.js — Open-Meteo呼び出し

**Files:**
- Create: `タクシー日報/js/weather.js`

- [ ] **Step 1: weather.js を実装**

`js/weather.js`:

```javascript
const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';

// WMO weather codes → 日本語ラベル
const WMO_LABELS = {
  0: '快晴', 1: '晴', 2: '一部曇', 3: '曇',
  45: '霧', 48: '霧',
  51: '霧雨', 53: '霧雨', 55: '霧雨',
  61: '小雨', 63: '雨', 65: '強雨',
  71: '小雪', 73: '雪', 75: '大雪',
  80: 'にわか雨', 81: 'にわか雨', 82: '激しいにわか雨',
  95: '雷雨', 96: '雷雨', 99: '激しい雷雨'
};

export function weatherLabel(code) {
  return WMO_LABELS[code] || '不明';
}

// 1日分の天候を時間別で取得 → 4区分に集計
export async function fetchWeatherForDate(date, location) {
  const today = new Date().toISOString().slice(0, 10);
  const isPast = date < today;
  const url = new URL(isPast ? ARCHIVE_API : FORECAST_API);
  url.searchParams.set('latitude', location.lat);
  url.searchParams.set('longitude', location.lon);
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  url.searchParams.set('hourly', 'weather_code,temperature_2m,precipitation');
  url.searchParams.set('timezone', 'Asia/Tokyo');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();

  return aggregateByPeriod(data.hourly);
}

function mostFrequent(arr) {
  const count = {};
  arr.forEach(v => count[v] = (count[v] || 0) + 1);
  let max = 0, best = arr[0];
  for (const k in count) if (count[k] > max) { max = count[k]; best = parseInt(k); }
  return best;
}

function average(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function sum(arr) {
  return arr.reduce((s, v) => s + v, 0);
}

function aggregateByPeriod(hourly) {
  const periods = {
    morning: [6, 7, 8, 9, 10, 11],
    noon: [12, 13, 14, 15, 16, 17],
    evening: [18, 19, 20, 21, 22, 23],
    night: [0, 1, 2, 3, 4, 5]
  };
  const result = {};
  for (const [name, hours] of Object.entries(periods)) {
    const codes = [], temps = [], precs = [];
    for (const h of hours) {
      if (hourly.weather_code[h] != null) codes.push(hourly.weather_code[h]);
      if (hourly.temperature_2m[h] != null) temps.push(hourly.temperature_2m[h]);
      if (hourly.precipitation[h] != null) precs.push(hourly.precipitation[h]);
    }
    const code = mostFrequent(codes);
    result[name] = {
      code,
      label: weatherLabel(code),
      tempAvg: Math.round(average(temps) * 10) / 10,
      precipMm: Math.round(sum(precs) * 10) / 10
    };
  }
  return result;
}
```

- [ ] **Step 2: コミット**

```bash
git add js/weather.js
git commit -m "feat(weather): fetch weather from Open-Meteo and aggregate to 4 day periods"
```

---

## Phase 4: UI Screens

### Task 19: 共通CSS + app.js（ボトムナビ、テーマ）

**Files:**
- Create: `タクシー日報/css/style.css`
- Create: `タクシー日報/js/app.js`

- [ ] **Step 1: 共通CSS作成**

`css/style.css`:

```css
:root {
  --primary: #0066cc;
  --bg: #f5f5f5;
  --surface: #ffffff;
  --text: #1a1a1a;
  --muted: #888;
  --border: #ddd;
  --green: #4caf50;
  --gray: #9e9e9e;
  --orange: #ff9800;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body { margin: 0; padding: 0 0 64px 0; font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; background: var(--bg); color: var(--text); }
h1, h2, h3 { margin: 0 0 8px; }
.card { background: var(--surface); border-radius: 8px; padding: 14px; margin-bottom: 10px; border: 1px solid var(--border); }
.muted { color: var(--muted); font-size: 12px; }
.btn { display: inline-block; padding: 10px 16px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
.btn-block { width: 100%; }
.input, .select, textarea { width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 14px; background: var(--surface); }
nav.bottom { position: fixed; bottom: 0; left: 0; right: 0; height: 56px; background: #fff; border-top: 1px solid var(--border); display: flex; }
nav.bottom a { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-decoration: none; color: var(--muted); font-size: 11px; }
nav.bottom a.active { color: var(--primary); }
```

- [ ] **Step 2: app.js（共通ナビレンダリング、ヘルパー）**

`js/app.js`:

```javascript
export function renderBottomNav(activePage) {
  const items = [
    { id: 'home', label: 'ホーム', href: 'index.html' },
    { id: 'input', label: '入力', href: 'input.html' },
    { id: 'calendar', label: 'カレンダー', href: 'calendar.html' },
    { id: 'settings', label: '設定', href: 'settings.html' }
  ];
  return `
    <nav class="bottom">
      ${items.map(it => `<a href="${it.href}" class="${it.id === activePage ? 'active' : ''}">${it.label}</a>`).join('')}
    </nav>`;
}

export function formatYen(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

export function formatDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00+09:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}
```

- [ ] **Step 3: コミット**

```bash
git add css/style.css js/app.js
git commit -m "feat(ui): common styles and bottom navigation"
```

---

### Task 20: settings.html — 設定画面

**Files:**
- Create: `タクシー日報/settings.html`

- [ ] **Step 1: settings.html を作成**

レートテーブル編集・トークン入力・デフォルト値・天候地点・データエクスポートを含む。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>設定 — タクシー日報</title>
<link rel="stylesheet" href="css/style.css">
<link rel="manifest" href="manifest.webmanifest">
</head>
<body>
<main style="padding:14px;">
  <h1>設定</h1>

  <section class="card">
    <h3>GitHub（データリポジトリ）</h3>
    <label class="muted">データリポジトリ (username/repo-data)</label>
    <input class="input" id="repoInput" placeholder="hidenaka/taxi-daily-report-data">
    <label class="muted" style="margin-top:8px;display:block;">Personal Access Token (repo権限)</label>
    <input class="input" id="tokenInput" type="password">
    <button class="btn btn-block" id="saveGhBtn" style="margin-top:8px;">保存</button>
    <div id="ghStatus" class="muted" style="margin-top:6px;"></div>
  </section>

  <section class="card">
    <h3>デフォルト</h3>
    <label class="muted">乗務種別</label>
    <select class="select" id="vehicleTypeSel">
      <option value="regular">普通車</option>
      <option value="premium">プレミアム</option>
    </select>
    <label class="muted" style="margin-top:8px;display:block;">出庫時刻</label>
    <input class="input" id="departureInput" type="time" value="07:00">
  </section>

  <section class="card">
    <h3>天候地点</h3>
    <label class="muted">緯度</label>
    <input class="input" id="latInput" type="number" step="0.0001" value="35.6938">
    <label class="muted" style="margin-top:8px;display:block;">経度</label>
    <input class="input" id="lonInput" type="number" step="0.0001" value="139.7036">
    <label class="muted" style="margin-top:8px;display:block;">表示名</label>
    <input class="input" id="locNameInput" value="千代田区">
  </section>

  <section class="card">
    <h3>レートテーブル</h3>
    <p class="muted">乗務数別の売上ティアと歩率。編集は慎重に。</p>
    <div id="rateTableEditor"></div>
    <button class="btn" id="saveConfigBtn" style="margin-top:10px;">設定全体を保存</button>
  </section>

  <section class="card">
    <h3>データ</h3>
    <button class="btn" id="exportBtn">全データをエクスポート</button>
    <button class="btn" id="recalcBtn" style="margin-left:8px;background:var(--gray);">全drives再計算（ドライラン）</button>
  </section>
</main>
<div id="navHost"></div>
<script type="module">
import { renderBottomNav } from './js/app.js';
import { getConfig, saveConfig, getDrivesForMonth } from './js/storage.js';
import { calcTotalPay } from './js/payroll.js';

document.getElementById('navHost').innerHTML = renderBottomNav('settings');

// GitHub設定 復元
document.getElementById('repoInput').value = localStorage.getItem('github_data_repo') || '';
document.getElementById('tokenInput').value = localStorage.getItem('github_token') || '';

document.getElementById('saveGhBtn').onclick = () => {
  localStorage.setItem('github_data_repo', document.getElementById('repoInput').value);
  localStorage.setItem('github_token', document.getElementById('tokenInput').value);
  document.getElementById('ghStatus').textContent = '保存しました。設定を読み込みます…';
  loadConfig();
};

let currentConfig = null;

async function loadConfig() {
  try {
    currentConfig = await getConfig();
    if (!currentConfig) { document.getElementById('ghStatus').textContent = 'config.json が見つかりません'; return; }
    document.getElementById('vehicleTypeSel').value = currentConfig.defaults.vehicleType;
    document.getElementById('departureInput').value = currentConfig.defaults.departureTime;
    document.getElementById('latInput').value = currentConfig.weatherLocation.lat;
    document.getElementById('lonInput').value = currentConfig.weatherLocation.lon;
    document.getElementById('locNameInput').value = currentConfig.weatherLocation.name;
    renderRateTable(currentConfig.rateTable);
    document.getElementById('ghStatus').textContent = '読み込み成功';
  } catch (e) {
    document.getElementById('ghStatus').textContent = 'エラー: ' + e.message;
  }
}

function renderRateTable(rt) {
  const host = document.getElementById('rateTableEditor');
  host.innerHTML = '';
  for (const shifts of ['11','10','9','8','7','6','5','4']) {
    const tiers = rt[shifts] || [];
    const div = document.createElement('div');
    div.style.marginBottom = '12px';
    div.innerHTML = `<strong>${shifts}乗務</strong>` +
      tiers.map((t, i) =>
        `<div style="display:flex;gap:4px;margin-top:4px;">
          <input class="input" style="flex:1;" type="number" data-shifts="${shifts}" data-idx="${i}" data-key="salesMin" value="${t.salesMin}">
          <input class="input" style="flex:1;" type="number" data-shifts="${shifts}" data-idx="${i}" data-key="salesMax" value="${t.salesMax}">
          <input class="input" style="flex:1;" type="number" step="0.001" data-shifts="${shifts}" data-idx="${i}" data-key="rate" value="${t.rate}">
        </div>`
      ).join('');
    host.appendChild(div);
  }
  // 12-13率
  const rateDiv = document.createElement('div');
  rateDiv.innerHTML = `<strong>12-13乗務率</strong> <input class="input" id="rate1213" type="number" step="0.01" value="${rt['12_13rate']}" style="width:100px;">`;
  host.appendChild(rateDiv);
}

document.getElementById('saveConfigBtn').onclick = async () => {
  if (!currentConfig) return;
  // フォームから currentConfig を更新
  currentConfig.defaults.vehicleType = document.getElementById('vehicleTypeSel').value;
  currentConfig.defaults.departureTime = document.getElementById('departureInput').value;
  currentConfig.weatherLocation = {
    lat: parseFloat(document.getElementById('latInput').value),
    lon: parseFloat(document.getElementById('lonInput').value),
    name: document.getElementById('locNameInput').value
  };
  // レートテーブル
  document.querySelectorAll('#rateTableEditor input[data-shifts]').forEach(inp => {
    const s = inp.dataset.shifts; const i = parseInt(inp.dataset.idx); const k = inp.dataset.key;
    if (!currentConfig.rateTable[s][i]) currentConfig.rateTable[s][i] = {};
    currentConfig.rateTable[s][i][k] = parseFloat(inp.value);
  });
  currentConfig.rateTable['12_13rate'] = parseFloat(document.getElementById('rate1213').value);
  currentConfig.lastUpdated = new Date().toISOString();
  await saveConfig(currentConfig);
  alert('保存しました');
};

document.getElementById('exportBtn').onclick = async () => {
  // 当月だけでなく全月を取得（簡略化のため過去12ヶ月）
  const all = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now); d.setMonth(now.getMonth() - i);
    const ym = d.toISOString().slice(0, 7);
    const drives = await getDrivesForMonth(ym);
    all.push(...drives);
  }
  const blob = new Blob([JSON.stringify({ config: currentConfig, drives: all }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'taxi-export.json'; a.click();
};

document.getElementById('recalcBtn').onclick = async () => {
  const ym = new Date().toISOString().slice(0, 7);
  const drives = await getDrivesForMonth(ym);
  const result = calcTotalPay(drives, currentConfig);
  alert(`当月再計算結果: 乗務${result.shiftCount} 推定¥${Math.round(result.total).toLocaleString()}`);
};

if (localStorage.getItem('github_token') && localStorage.getItem('github_data_repo')) loadConfig();
</script>
</body>
</html>
```

- [ ] **Step 2: コミット**

```bash
git add settings.html
git commit -m "feat(ui): settings page with rate table editor and data export"
```

---

### Task 21: calendar.html — シフトカレンダー

**Files:**
- Create: `タクシー日報/calendar.html`

- [ ] **Step 1: カレンダー画面を作成**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>カレンダー — タクシー日報</title>
<link rel="stylesheet" href="css/style.css">
<style>
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 6px; }
.cal-cell { padding: 12px 0; text-align: center; background: #fff; border-radius: 4px; font-size: 14px; cursor: pointer; user-select: none; }
.cal-cell.planned { background: var(--green); color: #fff; font-weight: 600; }
.cal-cell.actual { background: var(--primary); color: #fff; font-weight: 600; }
.cal-cell.today { border: 2px solid #f57f17; background: #ffeb3b; }
.cal-cell.dim { color: #ccc; }
.dow-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; font-size: 11px; color: var(--muted); text-align: center; }
.dow-toggle { display: inline-block; padding: 4px 10px; margin: 2px; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; background: #fff; }
.dow-toggle.on { background: var(--green); color: #fff; border-color: var(--green); }
</style>
</head>
<body>
<main style="padding:14px;">
  <h1>シフトカレンダー</h1>

  <section class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <button class="btn" id="prevBtn" style="background:var(--gray);">‹ 前月</button>
      <strong id="monthLabel"></strong>
      <button class="btn" id="nextBtn" style="background:var(--gray);">翌月 ›</button>
    </div>
    <div class="dow-row" style="margin-top:10px;">
      <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
    </div>
    <div class="cal-grid" id="calGrid"></div>
    <div style="margin-top:12px;font-size:11px;display:flex;gap:8px;flex-wrap:wrap;">
      <span><span style="display:inline-block;width:10px;height:10px;background:var(--primary);border-radius:2px;"></span> 実績</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px;"></span> 予定</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:#ffeb3b;border:1px solid #f57f17;border-radius:2px;"></span> 今日</span>
    </div>
  </section>

  <section class="card">
    <h3>曜日一括選択</h3>
    <div id="dowToggles"></div>
    <p class="muted">タップで月内の該当曜日を一括予定追加</p>
  </section>

  <section class="card">
    <h3>月サマリー</h3>
    <div id="summary"></div>
  </section>
</main>
<div id="navHost"></div>
<script type="module">
import { renderBottomNav, formatYen, todayIso } from './js/app.js';
import { getConfig, saveConfig, getDrivesForMonth } from './js/storage.js';

document.getElementById('navHost').innerHTML = renderBottomNav('calendar');

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-indexed
let config = null;
let drivesThisMonth = [];

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

async function load() {
  config = await getConfig();
  if (!config) return alert('config.json未取得');
  await render();
}

async function render() {
  document.getElementById('monthLabel').textContent = `${viewYear}年 ${viewMonth + 1}月`;
  drivesThisMonth = await getDrivesForMonth(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`);
  renderGrid();
  renderDowToggles();
  renderSummary();
}

function isPlanned(date) {
  return config.shifts.expandedDates.includes(date);
}

function isActual(date) {
  return drivesThisMonth.some(d => d.date === date);
}

function renderGrid() {
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const first = new Date(viewYear, viewMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // 前月の埋め
  const prevDays = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = document.createElement('div');
    d.className = 'cal-cell dim';
    d.textContent = prevDays - i;
    grid.appendChild(d);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (isActual(iso)) cell.classList.add('actual');
    else if (isPlanned(iso)) cell.classList.add('planned');
    if (iso === todayIso()) cell.classList.add('today');
    cell.textContent = d;
    cell.onclick = () => togglePlanned(iso);
    grid.appendChild(cell);
  }
}

async function togglePlanned(iso) {
  if (isActual(iso)) return alert('実績入力済の日は変更できません');
  const list = config.shifts.expandedDates;
  const idx = list.indexOf(iso);
  if (idx >= 0) list.splice(idx, 1); else { list.push(iso); list.sort(); }
  await saveConfig(config);
  await render();
}

function renderDowToggles() {
  const host = document.getElementById('dowToggles');
  host.innerHTML = '';
  ['日','月','火','水','木','金','土'].forEach((label, i) => {
    const dow = DOW[i];
    const isOn = config.shifts.patterns.includes(dow);
    const btn = document.createElement('span');
    btn.className = 'dow-toggle' + (isOn ? ' on' : '');
    btn.textContent = label;
    btn.onclick = async () => {
      const idx = config.shifts.patterns.indexOf(dow);
      if (idx >= 0) config.shifts.patterns.splice(idx, 1); else config.shifts.patterns.push(dow);
      // 当月の expandedDates に該当曜日を全展開（既存はそのまま）
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(viewYear, viewMonth, d);
        const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dowName = DOW[dt.getDay()];
        if (config.shifts.patterns.includes(dowName) && !config.shifts.expandedDates.includes(iso) && !isActual(iso)) {
          config.shifts.expandedDates.push(iso);
        }
      }
      config.shifts.expandedDates.sort();
      await saveConfig(config);
      await render();
    };
    host.appendChild(btn);
  });
}

function renderSummary() {
  const ym = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const planned = config.shifts.expandedDates.filter(d => d.startsWith(ym)).length;
  const actual = drivesThisMonth.length;
  const remaining = Math.max(0, planned - actual);
  const willMakeResp = (actual + (config.shifts.expandedDates.filter(d => d.startsWith(ym) && d >= todayIso()).length)) >= config.responsibilityShifts;
  document.getElementById('summary').innerHTML = `
    <div>予定: <strong>${planned}乗務</strong></div>
    <div>実績: <strong>${actual}乗務</strong></div>
    <div>残り: <strong>${remaining}乗務</strong></div>
    <div style="color:${willMakeResp ? 'var(--primary)' : 'var(--orange)'}">責任出番達成見込み: <strong>${willMakeResp ? '○' : '△'} (${actual + remaining}/${config.responsibilityShifts})</strong></div>
  `;
}

document.getElementById('prevBtn').onclick = () => {
  viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  render();
};
document.getElementById('nextBtn').onclick = () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
};

if (localStorage.getItem('github_token') && localStorage.getItem('github_data_repo')) load();
else alert('先に設定画面でGitHubトークンを設定してください');
</script>
</body>
</html>
```

- [ ] **Step 2: コミット**

```bash
git add calendar.html
git commit -m "feat(ui): calendar with day-of-week pattern + monthly summary"
```

---

### Task 22: input.html — 日報入力フォーム

**Files:**
- Create: `タクシー日報/input.html`

- [ ] **Step 1: 入力画面を作成**

1画面スクロール型。テキスト貼付→自動パース→プレビュー→メタ情報→保存。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>入力 — タクシー日報</title>
<link rel="stylesheet" href="css/style.css">
<style>
.preview-table { width: 100%; font-size: 12px; border-collapse: collapse; }
.preview-table th, .preview-table td { padding: 4px 6px; border-bottom: 1px solid #eee; text-align: left; }
.preview-table tr.cancel { color: var(--orange); }
.preview-table tr.rest { color: var(--muted); background: #fafafa; }
.preview-table input { width: 100%; border: none; padding: 2px; font-size: 12px; }
</style>
</head>
<body>
<main style="padding:14px;">
  <h1>日報入力</h1>

  <section class="card">
    <label class="muted">乗務日</label>
    <input class="input" id="dateInput" type="date">
    <div class="muted" id="dateHint" style="margin-top:4px;"></div>
  </section>

  <section class="card">
    <label class="muted">日報テキストを貼付（Claude/Gemini自動判別）</label>
    <textarea id="rawTextInput" rows="6" style="width:100%;padding:8px;font-family:monospace;font-size:11px;"></textarea>
    <button class="btn" id="parseBtn" style="margin-top:6px;">パース</button>
  </section>

  <section class="card" id="previewSection" style="display:none;">
    <div id="previewSummary" style="margin-bottom:8px;"></div>
    <table class="preview-table" id="previewTable"></table>
  </section>

  <section class="card">
    <div style="display:flex;gap:8px;">
      <div style="flex:1;">
        <label class="muted">乗務種別</label>
        <select class="select" id="vehicleTypeSel">
          <option value="regular">普通車</option>
          <option value="premium">プレミアム</option>
        </select>
      </div>
      <div style="flex:1;">
        <label class="muted">帰庫時刻</label>
        <input class="input" id="returnTimeInput" type="time">
      </div>
    </div>
    <label class="muted" style="margin-top:8px;display:block;">メモ</label>
    <textarea id="memoInput" rows="2" class="input"></textarea>
  </section>

  <button class="btn btn-block" id="saveBtn" style="font-size:16px;padding:14px;">保存</button>
  <div id="saveStatus" class="muted" style="margin-top:6px;text-align:center;"></div>
</main>
<div id="navHost"></div>
<script type="module">
import { renderBottomNav, todayIso } from './js/app.js';
import { parseReport } from './js/parser.js';
import { getConfig, getDrive, saveDriveSafe } from './js/storage.js';
import { fetchWeatherForDate } from './js/weather.js';

document.getElementById('navHost').innerHTML = renderBottomNav('input');

let config = null;
let parsed = null;
let editMode = false;

async function init() {
  config = await getConfig();
  if (!config) return alert('config.json未取得');
  document.getElementById('vehicleTypeSel').value = config.defaults.vehicleType;

  // ?date=YYYY-MM-DD があれば編集モード、既存データを復元
  const editDate = new URLSearchParams(location.search).get('date');
  if (editDate) {
    const existing = await getDrive(editDate);
    if (existing) {
      editMode = true;
      document.querySelector('h1').textContent = '日報を編集';
      document.getElementById('dateInput').value = existing.date;
      document.getElementById('dateHint').textContent = `編集モード`;
      document.getElementById('rawTextInput').value = existing.rawText || '';
      document.getElementById('vehicleTypeSel').value = existing.vehicleType;
      document.getElementById('returnTimeInput').value = existing.returnTime || '';
      document.getElementById('memoInput').value = existing.memo || '';
      // 既存trips/restsをparsedに直接セットしてプレビュー描画
      parsed = { trips: existing.trips, rests: existing.rests, returnTime: existing.returnTime, format: 'edit' };
      renderPreview();
      return;
    }
  }

  // 新規入力時: 日付自動判定 (過去48hにシフト予定日があればそれ、なければ今日)
  const now = new Date();
  let candidate = todayIso();
  for (let h = 0; h < 48; h++) {
    const d = new Date(now); d.setHours(d.getHours() - h);
    const iso = d.toISOString().slice(0, 10);
    if (config.shifts.expandedDates.includes(iso)) { candidate = iso; break; }
  }
  document.getElementById('dateInput').value = candidate;
  document.getElementById('dateHint').textContent = `自動判定: ${candidate}（変更可）`;
}

document.getElementById('parseBtn').onclick = () => {
  const text = document.getElementById('rawTextInput').value;
  if (!text.trim()) return;
  try {
    parsed = parseReport(text);
    renderPreview();
    if (parsed.returnTime) document.getElementById('returnTimeInput').value = parsed.returnTime;
  } catch (e) {
    alert('パース失敗: ' + e.message);
  }
};

function renderPreview() {
  const sec = document.getElementById('previewSection');
  sec.style.display = 'block';
  const cancelCount = parsed.trips.filter(t => t.isCancel).length;
  const validCount = parsed.trips.length - cancelCount;
  const totalSales = parsed.trips.filter(t => !t.isCancel).reduce((s, t) => s + t.amount, 0);
  document.getElementById('previewSummary').innerHTML =
    `<strong>${validCount}件</strong> ・ キャンセル ${cancelCount}件 ・ 売上 ¥${totalSales.toLocaleString()}（税込）`;

  const tbl = document.getElementById('previewTable');
  tbl.innerHTML = '<tr><th>No</th><th>時間</th><th>区間</th><th>km</th><th>金額</th></tr>';
  // 簡略化: trips のみ表示（rest は省略）
  parsed.trips.forEach((t, i) => {
    const tr = document.createElement('tr');
    if (t.isCancel) tr.classList.add('cancel');
    tr.innerHTML = `
      <td>${t.no}</td>
      <td><input data-idx="${i}" data-key="boardTime" value="${t.boardTime}"></td>
      <td>${t.boardPlace} → ${t.alightPlace}</td>
      <td><input data-idx="${i}" data-key="km" type="number" step="0.1" value="${t.km}"></td>
      <td><input data-idx="${i}" data-key="amount" type="number" value="${t.amount}"></td>
    `;
    tbl.appendChild(tr);
  });
  // インライン編集の反映
  tbl.querySelectorAll('input[data-idx]').forEach(inp => {
    inp.onchange = () => {
      const i = parseInt(inp.dataset.idx); const k = inp.dataset.key;
      const v = inp.type === 'number' ? parseFloat(inp.value) : inp.value;
      parsed.trips[i][k] = v;
    };
  });
}

document.getElementById('saveBtn').onclick = async () => {
  if (!parsed) return alert('先にテキストをパースしてください');
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  document.getElementById('saveStatus').textContent = '天候取得中…';

  const date = document.getElementById('dateInput').value;
  let weather = null;
  try { weather = await fetchWeatherForDate(date, config.weatherLocation); }
  catch (e) { console.warn('天候取得失敗:', e); }

  const drive = {
    date,
    vehicleType: document.getElementById('vehicleTypeSel').value,
    departureTime: config.defaults.departureTime,
    returnTime: document.getElementById('returnTimeInput').value || null,
    memo: document.getElementById('memoInput').value,
    rawText: document.getElementById('rawTextInput').value,
    trips: parsed.trips,
    rests: parsed.rests,
    weather,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  document.getElementById('saveStatus').textContent = 'GitHubに保存中…';
  try {
    await saveDriveSafe(drive);
    document.getElementById('saveStatus').textContent = '保存完了';
    setTimeout(() => location.href = 'index.html', 800);
  } catch (e) {
    document.getElementById('saveStatus').textContent = 'エラー: ' + e.message;
    btn.disabled = false;
  }
};

if (localStorage.getItem('github_token') && localStorage.getItem('github_data_repo')) init();
else alert('先に設定画面でGitHubトークンを設定してください');
</script>
</body>
</html>
```

- [ ] **Step 2: コミット**

```bash
git add input.html
git commit -m "feat(ui): input form with auto-parse, inline edit, and save to GitHub"
```

---

### Task 23: detail.html — 詳細画面（KPI + 3色帯 + ヒートマップ + 明細）

**Files:**
- Create: `タクシー日報/detail.html`
- Create: `タクシー日報/js/chart-helpers.js`

- [ ] **Step 1: 時間配分・ヒートマップ用ヘルパー作成**

`js/chart-helpers.js`:

```javascript
// "HH:MM" → 分
export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// 1乗務の時間配分を分単位で返す（実車/休憩/空車）
export function calcTimeBreakdown(drive) {
  const dep = timeToMinutes(drive.departureTime);
  let ret = timeToMinutes(drive.returnTime);
  if (ret < dep) ret += 24 * 60; // 翌日にまたがる
  const totalMin = ret - dep;

  const tripMin = (drive.trips || [])
    .filter(t => !t.isCancel)
    .reduce((s, t) => {
      let dur = timeToMinutes(t.alightTime) - timeToMinutes(t.boardTime);
      if (dur < 0) dur += 24 * 60;
      return s + dur;
    }, 0);

  const restMin = (drive.rests || []).reduce((s, r) => {
    let dur = timeToMinutes(r.endTime) - timeToMinutes(r.startTime);
    if (dur < 0) dur += 24 * 60;
    return s + dur;
  }, 0);

  const idleMin = Math.max(0, totalMin - tripMin - restMin);
  return { totalMin, tripMin, restMin, idleMin };
}

// 1時間ごとの売上配列（24要素、000-2300）
export function salesByHour(drive) {
  const hours = Array(24).fill(0);
  for (const t of (drive.trips || [])) {
    if (t.isCancel) continue;
    const start = timeToMinutes(t.boardTime);
    const h = Math.floor(start / 60);
    if (h >= 0 && h < 24) hours[h] += t.amount;
  }
  return hours;
}

export function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
```

- [ ] **Step 2: detail.html を作成**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>詳細 — タクシー日報</title>
<link rel="stylesheet" href="css/style.css">
<style>
.kpi-row { display: flex; gap: 8px; }
.kpi-row > div { flex: 1; text-align: center; }
.kpi-row .num { font-size: 18px; font-weight: 700; }
.kpi-row .lbl { font-size: 10px; color: var(--muted); }
.alloc-bar { display: flex; height: 22px; border-radius: 4px; overflow: hidden; margin-top: 6px; }
.alloc-bar > div { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; }
.heatmap { display: grid; grid-template-columns: repeat(24, 1fr); gap: 1px; margin-top: 6px; }
.heatmap > div { height: 14px; border-radius: 2px; }
.trip-row { display: flex; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 12px; }
.trip-row .no { width: 24px; color: var(--muted); }
.trip-row .time { width: 80px; }
.trip-row .place { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trip-row .yen { text-align: right; font-weight: 600; }
</style>
</head>
<body>
<main style="padding:14px;">
  <h1 id="title">乗務詳細</h1>

  <section class="card" id="kpiCard"></section>
  <section class="card" id="allocCard"></section>
  <section class="card" id="heatCard"></section>
  <section class="card" id="weatherCard"></section>
  <section class="card" id="tripsCard"></section>

  <button class="btn btn-block" id="editBtn" style="margin-top:8px;">この乗務を編集</button>
</main>
<div id="navHost"></div>
<script type="module">
import { renderBottomNav, formatYen, formatDate } from './js/app.js';
import { getDrive } from './js/storage.js';
import { calcDailySales } from './js/payroll.js';
import { calcTimeBreakdown, salesByHour, formatMin } from './js/chart-helpers.js';

document.getElementById('navHost').innerHTML = renderBottomNav('home');

const params = new URLSearchParams(location.search);
const date = params.get('date');

async function load() {
  const drive = await getDrive(date);
  if (!drive) { document.getElementById('title').textContent = '見つかりません'; return; }
  document.getElementById('title').textContent = `${formatDate(drive.date)} 詳細`;

  // KPI
  const sales = calcDailySales(drive);
  const validCount = drive.trips.filter(t => !t.isCancel).length;
  const breakdown = calcTimeBreakdown(drive);
  const tripHours = breakdown.tripMin / 60;
  const hourlyRate = tripHours > 0 ? sales.inclTax / tripHours : 0;

  document.getElementById('kpiCard').innerHTML = `
    <div class="kpi-row">
      <div><div class="lbl">売上(税込)</div><div class="num">${formatYen(sales.inclTax)}</div></div>
      <div><div class="lbl">件数</div><div class="num">${validCount}</div></div>
      <div><div class="lbl">実車時間単価</div><div class="num">${formatYen(hourlyRate)}</div></div>
    </div>
  `;

  // 時間配分3色帯
  const total = Math.max(1, breakdown.totalMin);
  document.getElementById('allocCard').innerHTML = `
    <div class="muted">時間配分（${formatMin(total)}）</div>
    <div class="alloc-bar">
      <div style="background:var(--green);flex:${breakdown.tripMin}">実車 ${formatMin(breakdown.tripMin)}</div>
      <div style="background:var(--gray);flex:${breakdown.restMin}">休 ${formatMin(breakdown.restMin)}</div>
      <div style="background:var(--orange);flex:${breakdown.idleMin}">空車 ${formatMin(breakdown.idleMin)}</div>
    </div>
  `;

  // ヒートマップ
  const hours = salesByHour(drive);
  const max = Math.max(...hours, 1);
  const cells = hours.map((y, h) => {
    const ratio = y / max;
    const color = y === 0 ? '#fff' : `rgba(76, 175, 80, ${0.2 + 0.8 * ratio})`;
    const border = y === 0 ? '1px solid #eee' : 'none';
    return `<div title="${h}時 ¥${y}" style="background:${color};border:${border};"></div>`;
  }).join('');
  document.getElementById('heatCard').innerHTML = `
    <div class="muted">時間別売上ヒートマップ（00-23時）</div>
    <div class="heatmap">${cells}</div>
  `;

  // 天候
  if (drive.weather) {
    const w = drive.weather;
    document.getElementById('weatherCard').innerHTML = `
      <div class="muted">天候</div>
      <div style="display:flex;gap:8px;font-size:12px;margin-top:4px;">
        <div>朝 ${w.morning?.label || '-'} ${w.morning?.tempAvg ?? ''}℃</div>
        <div>昼 ${w.noon?.label || '-'} ${w.noon?.tempAvg ?? ''}℃</div>
        <div>夕夜 ${w.evening?.label || '-'} ${w.evening?.tempAvg ?? ''}℃</div>
        <div>深夜 ${w.night?.label || '-'} ${w.night?.tempAvg ?? ''}℃</div>
      </div>
    `;
  } else {
    document.getElementById('weatherCard').innerHTML = `<div class="muted">天候未取得</div>`;
  }

  // 日報明細
  const tripsHtml = drive.trips.map(t => `
    <div class="trip-row" style="${t.isCancel ? 'color:var(--orange);' : ''}">
      <div class="no">${t.no}</div>
      <div class="time">${t.boardTime}</div>
      <div class="place">${t.boardPlace}→${t.alightPlace}${t.isCancel ? ' [×]' : ''}</div>
      <div class="yen">${t.isCancel ? '—' : formatYen(t.amount)}</div>
    </div>
  `).join('');
  document.getElementById('tripsCard').innerHTML = `<div class="muted">日報明細</div>${tripsHtml}`;

  document.getElementById('editBtn').onclick = () => location.href = `input.html?date=${date}`;
}

if (localStorage.getItem('github_token') && localStorage.getItem('github_data_repo')) load();
</script>
</body>
</html>
```

- [ ] **Step 3: コミット**

```bash
git add detail.html js/chart-helpers.js
git commit -m "feat(ui): detail page with KPI, time allocation bar, heatmap, trip list"
```

---

### Task 24: index.html — ホーム画面

**Files:**
- Create: `タクシー日報/index.html`

- [ ] **Step 1: ホーム画面を作成**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>タクシー日報</title>
<link rel="stylesheet" href="css/style.css">
<link rel="manifest" href="manifest.webmanifest">
<style>
.fab { position: fixed; right: 18px; bottom: 76px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: #fff; border: none; font-size: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.drive-row { display: flex; padding: 12px; border-bottom: 1px solid #eee; align-items: center; cursor: pointer; }
.drive-row .date { font-weight: 600; flex: 0 0 80px; }
.drive-row .meta { flex: 1; font-size: 12px; color: var(--muted); }
.drive-row .yen { font-weight: 600; }
</style>
</head>
<body>
<main style="padding:14px;">
  <section class="card" id="summaryCard">読み込み中…</section>
  <section class="card" style="padding:0;" id="listCard"></section>
</main>
<button class="fab" onclick="location.href='input.html'">＋</button>
<div id="navHost"></div>
<script type="module">
import { renderBottomNav, formatYen, formatDate, currentYearMonth } from './js/app.js';
import { getConfig, getDrivesForMonth, flushPendingQueue } from './js/storage.js';
import { calcTotalPay, calcDailySales } from './js/payroll.js';

document.getElementById('navHost').innerHTML = renderBottomNav('home');

async function load() {
  if (!localStorage.getItem('github_token')) {
    document.getElementById('summaryCard').innerHTML = '<a href="settings.html">設定からGitHubトークンを設定</a>';
    return;
  }
  await flushPendingQueue();
  const config = await getConfig();
  if (!config) { document.getElementById('summaryCard').innerHTML = 'config未取得'; return; }
  const ym = currentYearMonth();
  const drives = await getDrivesForMonth(ym);
  drives.sort((a, b) => b.date.localeCompare(a.date));

  // サマリー（責任出番達成前提）
  const result = calcTotalPay(drives, config);
  const monthLabel = ym.split('-')[1].replace(/^0/, '') + '月';
  document.getElementById('summaryCard').innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;">
      <div><strong>${monthLabel}</strong> ${result.shiftCount}/${config.responsibilityShifts}乗務</div>
      <div>暫定 <strong>${formatYen(result.total)}</strong></div>
    </div>
  `;

  // 直近乗務リスト
  const list = document.getElementById('listCard');
  list.innerHTML = drives.length === 0
    ? '<div style="padding:14px;color:var(--muted);">乗務記録なし</div>'
    : drives.map(d => {
        const sales = calcDailySales(d);
        const validCount = d.trips.filter(t => !t.isCancel).length;
        const wIcon = pickWeatherIcon(d.weather);
        return `<div class="drive-row" onclick="location.href='detail.html?date=${d.date}'">
          <div class="date">${formatDate(d.date)}</div>
          <div class="meta">${wIcon} ${validCount}件</div>
          <div class="yen">${formatYen(sales.inclTax)}</div>
        </div>`;
      }).join('');
}

function pickWeatherIcon(w) {
  if (!w) return '';
  // 朝/昼/夕で雨があれば☂、それ以外は☀（簡易）
  for (const p of [w.morning, w.noon, w.evening]) {
    if (!p) continue;
    if (p.code >= 51 && p.code <= 67) return '☂';
    if (p.code >= 71 && p.code <= 77) return '❄';
    if (p.code >= 80) return '☂';
  }
  return '☀';
}

load();
</script>
</body>
</html>
```

- [ ] **Step 2: コミット**

```bash
git add index.html
git commit -m "feat(ui): home page with monthly summary and recent drives list"
```

---

## Phase 5: PWA + Deploy

### Task 25: PWA manifest と Service Worker

**Files:**
- Create: `タクシー日報/manifest.webmanifest`
- Create: `タクシー日報/sw.js`
- Create: `タクシー日報/icon-180.png`（既存「タクシー乗務タイマー」から流用）

- [ ] **Step 1: manifest.webmanifest を作成**

```json
{
  "name": "タクシー日報",
  "short_name": "タクシー日報",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#f5f5f5",
  "theme_color": "#0066cc",
  "icons": [
    { "src": "icon-180.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: sw.js を作成（読み取りのみキャッシュ）**

```javascript
const CACHE_NAME = 'taxi-daily-v1';
const STATIC_FILES = [
  './',
  './index.html',
  './input.html',
  './detail.html',
  './calendar.html',
  './settings.html',
  './css/style.css',
  './js/app.js',
  './js/parser.js',
  './js/payroll.js',
  './js/storage.js',
  './js/weather.js',
  './js/chart-helpers.js',
  './manifest.webmanifest'
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
  // 静的ファイルはキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

- [ ] **Step 3: アイコンを既存プロジェクトから流用**

```bash
cp "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー乗務タイマー/icon-180.png" ./icon-180.png
```

（あるいは新規作成。既存をそのまま使うのが最速）

- [ ] **Step 4: 全HTMLにService Worker登録を追加**

`index.html` の `<script type="module">` 直後（または手前）に以下を追加：

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
</script>
```

同じものを `input.html`, `detail.html`, `calendar.html`, `settings.html` にも追加。

- [ ] **Step 5: コミット**

```bash
git add manifest.webmanifest sw.js icon-180.png index.html input.html detail.html calendar.html settings.html
git commit -m "feat(pwa): add manifest, service worker, and icon"
```

---

### Task 26: GitHubリポジトリ作成 + デプロイ（コード/データ分離）

**Files:** なし（GitHub設定 + ユーザー作業）

#### コードリポジトリ（パブリック）

- [ ] **Step 1: GitHub上で `taxi-daily-report` パブリックリポを作成**

ユーザー作業：
1. https://github.com/new を開く
2. Owner: hidenaka、Repository name: `taxi-daily-report`
3. Visibility: **Public**
4. Initialize with README: チェック外す
5. Create

- [ ] **Step 2: ローカルにリモート登録 + 初回push**

```bash
cd "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報"
git remote add origin https://github.com/hidenaka/taxi-daily-report.git
git push -u origin main
```

- [ ] **Step 3: data/ ディレクトリをコードリポから除外（push後に削除）**

設計上、data/ はコードリポではなくデータリポに置く。Phase 2 Task 13 で作った `data/config.json` と `data/drives/.gitkeep` をコードリポからは除外する。

```bash
git rm -r --cached data/
echo "data/" >> .gitignore
git add .gitignore
git commit -m "chore: exclude data/ from code repo (moved to data repo)"
git push
```

- [ ] **Step 4: GitHub Web UI で Pages 設定**

1. https://github.com/hidenaka/taxi-daily-report → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / `/` (root)
4. Save
5. 数分待つと `https://hidenaka.github.io/taxi-daily-report/` でアクセス可能に

#### データリポジトリ（プライベート）

- [ ] **Step 5: GitHub上で `taxi-daily-report-data` プライベートリポを作成**

ユーザー作業：
1. https://github.com/new
2. Owner: hidenaka、Repository name: `taxi-daily-report-data`
3. Visibility: **Private**
4. Initialize with README: チェック入れる（最初のコミットを作るため）
5. Create

- [ ] **Step 6: 初期データを Web UI で配置**

ユーザー作業（GitHub Web UI 上で）：
1. リポを開く → Add file → Create new file
2. ファイル名: `data/config.json`
3. 内容: ローカルの `data/config.json`（Task 13 で作った内容）をコピペ
4. Commit new file

または、ローカルでクローンしてpushしてもOK：

```bash
cd /tmp
git clone https://github.com/hidenaka/taxi-daily-report-data.git
cd taxi-daily-report-data
mkdir -p data/drives
cp "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報/data/config.json" data/
touch data/drives/.gitkeep
git add data/
git commit -m "feat: initial config and empty drives directory"
git push
```

- [ ] **Step 7: Personal Access Token 発行**

ユーザー作業：
1. https://github.com/settings/tokens → Generate new token (classic)
2. Note: `taxi-daily-report PAT`
3. Expiration: 1 year（任意、後で再発行可能）
4. Scopes: `repo`（Full control of private repositories）にチェック
5. Generate token
6. 表示されたトークンをコピー（再表示不可なので必ずメモ）

- [ ] **Step 8: 公開URL確認 + 設定画面で初期セットアップ**

1. `https://hidenaka.github.io/taxi-daily-report/` を開く
2. 設定画面へ → データリポ名 `hidenaka/taxi-daily-report-data` 入力
3. Token入力 → 保存
4. config が正しく読み込まれることを確認

---

### Task 27: E2E手動チェックリスト実行

**Files:** なし（手動確認）

- [ ] **Step 1: 設定画面で初期セットアップ**

1. `https://<username>.github.io/taxi-daily-report/settings.html` を開く
2. リポジトリ名（`username/taxi-daily-report`）入力
3. GitHub Personal Access Token を入力（`repo` 権限で発行済み）
4. 「保存」→ config.json が読み込まれることを確認

- [ ] **Step 2: カレンダー画面で予定登録**

1. `calendar.html` を開く
2. 曜日「日・火・木」をタップして当月予定を一括展開
3. 個別タップで例外を1つ追加
4. 月サマリーが正しく表示されることを確認

- [ ] **Step 3: 入力画面で日報入力**

1. `input.html` を開く
2. 日付が自動判定されていることを確認
3. テスト用にClaude形式テキストを貼付 → パース実行
4. プレビューに件数・キャンセル数・売上が表示されることを確認
5. インラインで金額を1つ修正
6. 種別をプレミアムに変更
7. メモを追記
8. 「保存」→ GitHub上にコミットが作られることを確認（GitHub Webで確認）
9. 自動でホームへ遷移、リストに反映されることを確認

- [ ] **Step 4: 詳細画面で表示確認**

1. ホームから乗務行をタップ
2. KPI、3色帯、ヒートマップ、天候、明細が表示されることを確認
3. 「編集」ボタンで input.html に戻れることを確認

- [ ] **Step 5: iPhone Safari でPWAインストール**

1. iPhoneで `https://<username>.github.io/taxi-daily-report/` を開く
2. Safari共有メニュー → 「ホーム画面に追加」
3. 追加されたアイコンから起動
4. オフラインで起動できることを確認（機内モードにして再起動）

- [ ] **Step 6: 検算（過去明細との差を確認）**

過去3-4ヶ月の実際の日報を全て入力（または手動でJSONを作成）→ ホームの暫定支給額が、給与明細の総支給額と±1,000円以内に収まることを確認。

ズレが大きい場合：
- レートテーブルの数字が間違っている → 設定画面でレートテーブル編集
- パースに漏れがある → drive のJSONを直接GitHubで開いて trips を確認
- 12-13乗務目の判定が間違っている → payroll.js を再確認

---

## 完了基準（Definition of Done）

設計ドキュメント Section 14 に準拠。

1. [ ] パーサーがClaude/Gemini両形式を正しく解析（`node --test` で12+件pass）
2. [ ] 過去3ヶ月分の実明細と推定支給額の差が ±1,000円以内
3. [ ] iPhone SafariでPWAインストール可能、オフライン起動可能
4. [ ] ホーム → 入力 → 保存 → 詳細 → カレンダーの一周フローが動く
5. [ ] GitHub PagesにデプロイされたURLでアクセス可能

---

## 実装順序の推奨

各Phaseは前のPhaseに依存。Phase内のタスクも上から順に実装。

特に **Phase 2（純粋ロジック）を完成させてから Phase 4（UI）に進む** こと。UIから先に作るとロジックの不確かさを引きずる。

Phase 3（外部I/O）はブラウザ環境を要するため、ユニットテストは難しい。Phase 4 のUIタスクと並行して実機で動作確認する。

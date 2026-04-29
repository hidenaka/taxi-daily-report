# バルクインポート（mmさん日報データ移行）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** ローカルの `paste-here.txt` にある mm さんの過去日報データをパースして、GitHub データリポジトリ（taxi-daily-report-data）の `data/drives/mm/` に保存する

**Architecture:** Node.js スクリプトでローカルファイルを読み込み、既存の `parser.js` を使って日報テキストを JSON 化、GitHub REST API でバルク保存

**Tech Stack:** Node.js, 既存 parser.js ロジック, GitHub REST API

---

### Task 1: パーススクリプト作成

**Files:**
- Create: `scripts/bulk-import.js`
- Read: `js/parser.js` のエクスポートする関数
- Read: `js/storage.js` の `putFile` ロジック

**Background:**
`paste-here.txt` は複数日の日報が連結しているテキスト。各日は以下の形式で区切られる：
```
日付: YYYY-MM-DD 車種: XXX 出庫: HH:MM 帰庫: HH:MM
No,乗車,降車,時間,迎,乗車地,降車地,営Km,男,女,合計
...
```

**Steps:**

- [ ] **Step 1: ファイル読み込みと日付区切り**

`scripts/bulk-import.js`:
```javascript
const fs = require('fs');
const path = require('path');

const PASTE_FILE = '/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報/data/paste-here.txt';

function splitByDate(text) {
  const blocks = [];
  const lines = text.split('\n');
  let current = null;
  
  for (const line of lines) {
    const dateMatch = line.match(/^日付:\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      if (current) blocks.push(current);
      current = { date: dateMatch[1], header: line, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}
```

- [ ] **Step 2: parser.js の `parseReport` をインポートして各日をパース**

```javascript
// js/parser.js のロジックをコピーするか、モジュールインポート
// ローカルでは import が使えないので、parseReport 関数のロジックを再利用
```

- [ ] **Step 3: GitHub API で保存する関数**

```javascript
const API_BASE = 'https://api.github.com';
const REPO = 'hidenaka/taxi-daily-report-data';
const TOKEN = process.env.GITHUB_TOKEN; // ユーザーから入力

async function saveDriveToGithub(userId, drive) {
  const filepath = `data/drives/${userId}/${drive.date}.json`;
  const content = Buffer.from(JSON.stringify(drive, null, 2)).toString('base64');
  
  // 既存ファイルのshaを取得
  const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${filepath}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' }
  });
  
  const body = {
    message: `bulk import: ${userId}/${drive.date}`,
    content,
    branch: 'main'
  };
  
  if (getRes.status === 200) {
    const data = await getRes.json();
    body.sha = data.sha;
  }
  
  const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${filepath}`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${TOKEN}`, 
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  if (!putRes.ok) {
    throw new Error(`Failed to save ${filepath}: ${putRes.status}`);
  }
  return putRes.json();
}
```

- [ ] **Step 4: メイン処理**

```javascript
async function main() {
  const text = fs.readFileSync(PASTE_FILE, 'utf-8');
  const blocks = splitByDate(text);
  
  console.log(`Found ${blocks.length} days`);
  
  // 各ブロックをパース
  for (const block of blocks) {
    const rawText = [block.header, ...block.body].join('\n');
    try {
      // parser ロジックを使用
      const drive = parseRawText(rawText, block.date);
      console.log(`Parsed ${block.date}: ${drive.trips?.length || 0} trips`);
      // 実際に保存する時はコメント解除
      // await saveDriveToGithub('mm', drive);
    } catch (e) {
      console.error(`Error parsing ${block.date}:`, e.message);
    }
  }
}
```

- [ ] **Step 5: ドライランで実行して確認**

```bash
cd /tmp/taxi-daily-report
node scripts/bulk-import.js
```

期待される出力：
```
Found 20 days
Parsed 2025-07-02: 27 trips
...
```

- [ ] **Step 6: 実際に GitHub に保存**

ユーザーに PAT を確認して、環境変数に設定して実行:
```bash
export GITHUB_TOKEN=ghp_...
node scripts/bulk-import.js --dry-run=false
```

---

### Task 2: parser.js のモジュール化（オプション）

**Files:**
- Create: `js/parser-node.js` — Node.js から使える parser ラッパー

**Background:**
`js/parser.js` は ES module + ブラウザ API 依存がある可能性。Node.js スクリプトから使えるようにする。

- [ ] **Step 1: parser.js が Node.js で動くか確認**

```bash
node -e "import('./js/parser.js').then(m => console.log(Object.keys(m)))"
```

動かない場合は、必要な関数だけを抽出して `js/parser-node.js` を作成。

---

### Task 3: 保存確認

**Files:**
- Browser: `https://hidenaka.github.io/taxi-daily-report/`

- [ ] **Step 1: ブラウザで mm さんのデータが表示されるか確認**

1. インデックスを開く
2. 「営業サマリー（日別）」に 2025-07 の乗務が表示されるか確認
3. カレンダーに実績マークが付くか確認

---

## 今後の拡張（メモ）

- 他ユーザーのバルクインポートは、同じスクリプトで `--user=<userId>` として実行可能
- `paste-here-validated.json` のデータも同様にインポート可能

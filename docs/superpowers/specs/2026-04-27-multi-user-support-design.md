# マルチユーザーサポート設計仕様

**作成日**: 2026-04-27
**対象**: タクシー日報PWAアプリ
**目的**: 信頼できる知り合い数人(2-5人想定)でデータを共有し、営業サポート機能の精度を向上させる

---

## 1. 背景と目的

### 現状の課題
- 1人のデータ(約300乗務、6ヶ月)では、エリア×時刻の母数が少ない
- 推奨検索や近隣エリア推定の信頼性に限界がある
- 例: 特定エリアで降ろした後の次乗車サンプルが3件以下で「該当なし」になることが多い

### ゴール
- 信頼できる知り合い2-5人と同じデータベース(GitHub Private Repo)を共有
- **個人パフォーマンス系**(自分の収入・効率・働き方)は完全に各人独立
- **需要パターン系**(どこで降ろしたらどこで取れるか)は全員データ統合で精度向上
- 知り合いの作業負荷は最小化(写真撮影 + AI変換 + アプリでペースト)

### 非ゴール
- 一般公開・SaaS化(将来検討)
- 認証/課金システム(信頼関係前提)
- 各ユーザー間の権限分離(全員が全データ閲覧可能)

---

## 2. アーキテクチャ全体像

```
┌─────────────────────────────────────────────────┐
│ taxi-daily-report-data (Private GitHub Repo)     │
│ ├── data/                                         │
│ │   ├── drives/                                   │
│ │   │   ├── user_self/         ← あなた          │
│ │   │   │   ├── 2026-04-26.json                  │
│ │   │   │   └── ...                              │
│ │   │   ├── user_a/            ← 知り合いA       │
│ │   │   │   └── ...                              │
│ │   │   └── user_b/            ← 知り合いB       │
│ │   │       └── ...                              │
│ │   ├── config/                                   │
│ │   │   ├── user_self.json                       │
│ │   │   ├── user_a.json                          │
│ │   │   └── user_b.json                          │
│ │   └── users.json             ← 統合対象一覧    │
│ └── ...                                           │
└─────────────────────────────────────────────────┘
        ↑          ↑          ↑
        │          │          │  共有 PAT
        │          │          │
   ┌────┴─┐    ┌──┴───┐  ┌──┴───┐
   │あなた │    │知り合A│  │知り合B│
   │ブラウザ│    │ブラウザ│  │ブラウザ│
   └──────┘    └──────┘  └──────┘
   userId=     userId=    userId=
   user_self   user_a     user_b
```

### 構成要素
- **同一プライベートリポジトリ**: 全員が同じ `taxi-daily-report-data` をデータストアとして使う
- **共有PAT**: あなたが発行したGitHub Personal Access Tokenを各ユーザーに配布(信頼関係前提)
- **userIdによるフォルダ分離**: 各ユーザーは自分のフォルダのみ読み書き(規約として)
- **users.json**: 統合対象ユーザー一覧。新規参加時にここに追記

---

## 3. データ取込フロー(知り合い視点)

```
[1] 出番終了後、日報の写真を撮る
        ↓
[2] Gemini/Claudeアプリで写真+指定プロンプトを送る
   (プロンプトは事前にあなたが作成して docs/ai-prompt-template.md として共有)
        ↓
[3] AI が以下フォーマットのテキストを返す:
   ----
   日付: 2026-04-26
   車種: premium
   出庫: 07:00
   帰庫: 01:16
   ---
   No,乗車,降車,時間,迎,乗車地,降車地,営Km,男,女,合計
   1,07:17,07:38,0:21,迎,大田区上池台4,港区港南2,6.7,1,,"3,600"
   休,10:47,11:36,0:49,,江東区青海2,,,,,
   ...
   ----
        ↓
[4] アプリの「入力」画面を開く
        ↓
[5] 「テキストペースト」モードに切替 → コピペ
        ↓
[6] 「保存」ボタンタップ
        ↓
[7] data/drives/user_a/2026-04-26.json として GitHub APIで自動push
```

### AIプロンプトテンプレ(イメージ、別ドキュメントで詳細化)
```
このタクシー日報の写真を以下のテキスト形式で出力してください。

先頭に4行ヘッダー:
日付: YYYY-MM-DD
車種: premium または regular
出庫: HH:MM
帰庫: HH:MM
---

その後にCSV表(既存日報のフォーマットそのまま):
No,乗車,降車,時間,迎,乗車地,降車地,営Km,男,女,合計
1,07:17,...

ルール:
- 休憩行は「休」で始める
- 料金はカンマ区切りでクォート("3,600")
- 日付・車種が判別不能なら空欄のまま
- キャンセル行は「キ」で始める
```

---

## 4. データ構造

### 4.1 ストレージパス
| Before | After |
|---|---|
| `data/drives/2026-04-26.json` | `data/drives/{userId}/2026-04-26.json` |
| `data/config.json` | `data/config/{userId}.json` |
| (なし) | `data/users.json` (新規) |

### 4.2 設定ファイル `data/config/{userId}.json`
既存のconfig構造に `userId` と `displayName` を追加。
```json
{
  "userId": "user_a",
  "displayName": "Aさん",
  "vehicleType": "premium",
  "responsibilityShifts": 12,
  "takeHomeRate": 0.75,
  "takeHomeTarget": 500000,
  "departureTime": "07:00",
  "paidLeaveAmount": 39340,
  "lat": 35.6938,
  "lon": 139.7036,
  "locName": "千代田区"
}
```

### 4.3 userId 命名規約

- 英小文字 + 数字 + アンダースコアのみ (`^[a-z][a-z0-9_]*$`)
- `user_` プレフィックス推奨(`user_self`, `user_a`, `user_b`)
- ユーザー本人の本名や個人情報は含めない(プライバシー保護)
- フォルダ名 = ファイルパス安全 = URL安全である必要あり
- 設定UIで入力時にバリデーション

### 4.4 ユーザー一覧 `data/users.json`(新規)
```json
{
  "users": [
    { "userId": "user_self", "displayName": "あなた", "active": true },
    { "userId": "user_a", "displayName": "Aさん", "active": true },
    { "userId": "user_b", "displayName": "Bさん", "active": true }
  ]
}
```
- `active: true` のユーザーだけが営業サポートの集計対象
- 新規参加時に追記、退会時に `active: false` に変更

### 4.5 乗務JSON
既存フォーマットのまま変更なし。トップレベルに `userId` は持たない(フォルダ構造から自明)。

---

## 5. storage.js 関数設計

### 5.1 既存関数(挙動はuserId限定に変更)
| 関数 | 用途 | スコープ |
|---|---|---|
| `getDrivesForMonth(ym)` | 月度の自分の乗務取得 | `userId == 自分` のフォルダのみ |
| `getDrive(date)` | 特定日付の乗務取得 | 自分のみ |
| `saveDrive(date, json)` | 乗務保存 | 自分のフォルダに保存 |
| `getConfig()` | 自分の設定取得 | 自分の `config/{userId}.json` |
| `saveConfig(cfg)` | 設定保存 | 自分の設定 |

### 5.2 新規関数
| 関数 | 用途 |
|---|---|
| `getMyUserId()` | localStorageから自分のuserIdを取得 |
| `setMyUserId(id)` | 自分のuserIdをlocalStorageに保存 |
| `listActiveUserIds()` | `data/users.json` から `active: true` の userId配列を取得 |
| `getAllUsersDrivesForMonth(ym)` | 全 active userId の月度データを統合取得 |

### 5.3 自分のuserIdの扱い
- localStorage に `taxi_user_id` として保存(GitHub PATと同じく端末ごと)
- 設定画面で初回入力 → 各画面で読む
- デフォルト: `user_self`

### 5.4 安全規約(他人フォルダへの誤書き込み防止)
- `saveDrive` / `saveConfig` は内部で必ず `getMyUserId()` を呼び、自分のフォルダパスのみを生成
- 引数で別 userId を受け取る関数は **存在しない**(=書き込み API は自分のみ)
- 全ユーザー集計関数 `getAllUsersDrivesForMonth` は **読み込み専用**
- これによりアプリのバグや UI操作で他人のデータが上書きされる経路をコードレベルで遮断

---

## 6. スコープ別の関数呼び出し設計

各画面/機能の関数呼び出しを明示。

```
[ホーム index.html]
  → getDrivesForMonth(ym)             ← 自分のみ
  → getConfig()                       ← 自分の目標等

[入力 input.html]
  → saveDrive(date, json)             ← 自分のフォルダに保存
  → getDrive(date)                    ← 編集用
  → 「テキストペーストモード」追加(parser.js拡張)

[カレンダー calendar.html]
  → getDrivesForMonth(ym)             ← 自分のみ

[詳細 detail.html]
  → getDrive(date)                    ← 自分のみ

[振り返り review.html]
  → getDrivesForMonth(ym) × 6か月分   ← 自分のみ

[設定 settings.html]
  → getConfig() / saveConfig()        ← 自分のみ
  → setMyUserId(id) (新規UI)

[営業サポート support.html]
  ├ ペース参考カード
  │   → getDrivesForMonth(ym)         ← 自分のみ
  ├ 曜日×時間 効率ヒートマップ
  │   → getDrivesForMonth(ym)         ← 自分のみ
  ├ 推奨検索 / 高期待値 / 降車エリア別 / 過去履歴
  │   → getAllUsersDrivesForMonth(ym) ← 全員統合
  └ 近隣マップ buildNeighborMap, areaTimeHourly 等
      → 全員データを渡す                ← 全員統合
```

**実装ポイント**: `support.html` 内で2種類のデータを別変数で持つ:
- `myDrives` = 自分のみ(ペース参考・ヒートマップで使用)
- `allDrives` = 全員統合(推奨検索・履歴・エリア分析で使用)

---

## 7. parser.js 拡張

### 既存
- タブ区切りテキストをパースして trips/rests を抽出

### 拡張内容
- **ヘッダー4行(日付・車種・出庫・帰庫)** をパース
- **カンマ区切り (CSV) 対応** (既存タブ区切りも維持)
- **男女列の追加対応** (無視するだけ)
- **クォート文字 "3,600" を数値に変換**

### parseFormattedReport(text) 関数(新規)
```js
// 戻り値: { date, vehicleType, departureTime, returnTime, trips, rests, rawText }
function parseFormattedReport(text) {
  const lines = text.split('\n');
  const header = {};
  let dataStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '---') { dataStart = i + 1; break; }
    const m = line.match(/^(日付|車種|出庫|帰庫):\s*(.*)$/);
    if (m) header[m[1]] = m[2];
  }
  // CSV部分を既存parser または新parser でparse
  // ...
}
```

---

## 8. UI 変更

### 8.1 設定画面(settings.html)
新規追加:
- **userId 入力欄**(初回必須、変更可能)
- **displayName 入力欄**(任意、表示用)
- **共有PAT 入力欄**(既存)

### 8.2 入力画面(input.html)
新規モード追加:
- **「テキストペースト」モード切替トグル**
- ペースト用 textarea + 「解析して保存」ボタン
- parse結果プレビュー表示(保存前確認)

### 8.3 営業サポート画面(support.html)
変更:
- 集計対象数表示: `(全員モード: 3ユーザー、合計乗務540件)` のような表示を範囲情報に追加
- 各機能の説明文に「自分のみ」「全員統合」を明記

### 8.4 ホーム画面/その他
変更なし(自分のデータのみ表示は現状通り)

---

## 9. ドキュメント

### 9.1 docs/ai-prompt-template.md(新規)
知り合い向けの AIプロンプトテンプレ全文。コピペで使える形。

### 9.2 docs/setup-for-collaborator.md(新規)
知り合い向けセットアップ手順書:
1. アプリURL を開く
2. ホーム画面に追加(PWAインストール)
3. 設定画面で共有PAT入力(あなたから受け取る)
4. 設定画面で userId 入力(あなたが指定)
5. 入力画面で初回テスト(写真→AI→ペースト→保存)

### 9.3 README.md 更新(既存編集)
- マルチユーザー対応について追記
- データ構造の説明更新

---

## 10. マイグレーション戦略

既存データを既存パスから新パスへ移動する必要あり。

### 手順
1. ローカルで `data/drives/*.json` を `data/drives/user_self/` に移動
2. ローカルで `data/config.json` を `data/config/user_self.json` にコピー(リネームではなくコピー、念のため)
3. `data/users.json` を新規作成 (`user_self` のみ)
4. git commit & push
5. アプリ側のパス変更コードをデプロイ

### ロールバック
- 万一の事故時、git revert で旧パスに戻せる
- データ自体は新旧両方残しておく(古いパスのファイルは削除しない、テスト後に削除)

---

## 11. MVP範囲

### MVPに入れる(必須)
1. データパス変更 (`data/drives/{userId}/...`)
2. 既存自分のデータを `user_self` フォルダに移動(マイグレーション)
3. `storage.js` の関数追加 (`getAllUsersDrivesForMonth`, `listActiveUserIds`, `getMyUserId`, `setMyUserId`)
4. 設定画面に `userId` 入力欄追加
5. 営業サポートの該当機能を全員データに切替(ヒートマップとペース参考は自分のみ維持)
6. 入力画面に「テキストペースト→parse→保存」モード追加
7. parser.js 拡張(ヘッダー対応・CSV対応・男女列対応)
8. AI用プロンプトテンプレ作成(`docs/ai-prompt-template.md`)
9. 知り合い向けセットアップ手順書作成(`docs/setup-for-collaborator.md`)

### MVPに入れない(後回し)
- 各ユーザーごとの「アクティブ/非アクティブ」切替UI(MVPはJSON手編集)
- 統合対象ユーザーの匿名表示(現状はフォルダ名そのまま、将来検討)
- データ寄贈フローのGUI化(初期は各自で取込)
- スマホからのGitHub PAT設定UI改善
- ロール/権限分離(誰が何を編集できるか)
- 退会時のデータ削除フロー
- 各ユーザーの貢献度可視化(将来のお楽しみ)

---

## 12. MVP成功基準

1. **リグレッションなし**: あなたが既存通り全機能を使える(ホーム/入力/カレンダー/振り返り/詳細/設定/営業サポート)
2. **新規参加成功**: 知り合い1人が以下を完遂できる:
   - セットアップ手順書通りにセットアップ完了
   - AIで日報をテキスト化
   - アプリの入力画面でペースト → 保存
   - 翌日その人のホーム画面で前日の乗務が表示される
3. **統合精度向上の確認**: 営業サポートで「全員データ」モードが動き、自分1人だった時より特定エリアの集計件数が増えていることを画面上で確認できる

---

## 13. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| 知り合いがフォルダを間違えて他人のデータを上書き | データ損失 | アプリ側で「自分のフォルダ以外は書き込まない」をハードコード |
| 共有PATが流出 | リポジトリ全データの漏洩 | 信頼できる知り合いのみに配布、定期的に再発行可能にしておく |
| AI変換ミスで不正なJSON | 保存失敗 | parse段階でバリデーション、プレビュー表示で目視確認 |
| 知り合いが継続入力しない | データが増えない | MVP検証後に判断(続かないなら無理に拡張しない) |
| ストレージサイズ増加 | GitHub Pages制限 | JSON1乗務あたり数KB×100乗務×5人=2MB程度。当面問題なし |
| 既存データのマイグレーション失敗 | 旧データ参照不能 | git で巻き戻し可能。新旧両方データを残してデプロイ |

---

## 14. 将来拡張(MVP後)

- アクティブ/非アクティブ切替UI
- 匿名表示モード(集計時に displayName を伏せる)
- 各ユーザーの貢献度ダッシュボード
- 写真→自動取込スクリプト(あなたがバッチ実行する場合)
- 各ユーザーの目標時給を考慮した個別スコアリング
- 統合データ vs 個人データの差分可視化(自分の傾向と平均の差を見る)

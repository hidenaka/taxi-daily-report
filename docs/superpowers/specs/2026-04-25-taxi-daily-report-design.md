# タクシー日報アプリ — 設計ドキュメント

- 作成日: 2026-04-25
- ステータス: 設計承認済み（実装プラン未作成）
- コードリポ予定名: `hidenaka/taxi-daily-report`（**パブリック**、GitHub Pages有効化、URL: `https://hidenaka.github.io/taxi-daily-report/`）
- データリポ予定名: `hidenaka/taxi-daily-report-data`（**プライベート**、PAT経由でブラウザから読み書き、公開URLなし）
- 分離理由: コードを公開しても問題なし／売上・乗務記録は秘匿。将来他人にコードだけ渡せる構成。

## 1. プロジェクト概要

### 目的
個人タクシー乗務員の日報管理を、スプレッドシート手作業から自動化する。OCR済み日報テキストを貼り付けるだけで、月次の売上集計・歩率計算・推定支給額・天候記録までを自動で行うWebアプリ。

### 解決する課題
- スプレッドシートでの手作業転記とコピペが面倒
- 歩率計算（乗務数×売上ティアのテーブル参照）を感覚でやっている
- プレミアム車両のインセンティブ計算が手動
- 12-13乗務目の特別計算（62%）が混在して間違いやすい
- 天候と売上の関係を見たいが、後から天候を調べるのが面倒

### スコープ外
- 自動でOCRする機能（写真→テキストはGemini/Claudeブラウザ版で別途行う）
- 経費管理（給油代、食費など）
- 売上の現金/カード/QR内訳
- 複数ユーザー対応

## 2. ユーザーストーリー

### 主要シナリオ
1. **乗務後の入力（毎乗務後、1日1回）**
   - 仕事終わりに iPhone Safari でアプリを開く
   - 「日報を入力」をタップ
   - GeminiやClaudeのブラウザ版で日報写真をテキスト化済みのテキストを貼付
   - 自動でパース・キャンセル判定された結果を確認
   - 必要なら金額や時刻を直接編集
   - 乗務種別（デフォルト「普通車」）と帰庫時刻（最後が「休」なら自動）を確認
   - メモを追記して保存
   - 30秒以内で完了

2. **月次の振り返り（月末）**
   - ホームで当月の乗務数・売上・推定支給額を確認
   - 給与明細到着時に推定値と突き合わせ

3. **日次の振り返り（任意）**
   - ホームから乗務をタップして詳細画面へ
   - 時間配分（実車/休憩/空車）を確認
   - 時間別売上ヒートマップで効率の悪い時間帯を確認
   - 天候との関係を見る

4. **シフト計画（月初・シフト発表時）**
   - カレンダーで翌月の予定日を曜日一括選択
   - 個別の差し替え（日↔土など）
   - 月の責任出番達成見込みを確認

## 3. 技術スタック

| 領域 | 選択 | 理由 |
|------|------|------|
| フロントエンド | vanilla JS（ES modules）+ HTML/CSS | 既存「タクシー乗務タイマー」と同じパターン。フレームワーク不要 |
| データ保存 | **別 private リポ**内のJSONファイル | データの秘匿性確保、git履歴で全変更追跡可能、無料 |
| API（書込） | GitHub REST API（contents エンドポイント） | ブラウザから直接コミット可能 |
| 認証 | GitHub Personal Access Token（repo権限） | 各端末でlocalStorageに1回設定。データリポへのアクセスに使用 |
| ホスティング | GitHub Pages（**コードリポ**） | HTTPSで配信、PWA化可能、無料 |
| 天候API | Open-Meteo | 無料、APIキー不要、過去データ取得可能 |
| グラフ | Chart.js（CDN） | 軽量、SVGベース |
| PWA | Service Worker | iPhone Safariで「ホーム画面に追加」、オフライン読み取り対応 |

## 4. プロジェクト配置

### コードリポ（パブリック）
- **ローカル**: `/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報/`
- **GitHub**: `hidenaka/taxi-daily-report`
- **公開URL**: `https://hidenaka.github.io/taxi-daily-report/`
- 内容: HTML/CSS/JS、tests/、docs/、manifest、sw.js（センシティブな情報なし）

### データリポ（プライベート）
- **ローカル**: 不要（ブラウザ→GitHub APIで直接操作）
- **GitHub**: `hidenaka/taxi-daily-report-data`
- 内容: `data/config.json`（設定 + シフト + レートテーブル）、`data/drives/YYYY-MM-DD.json`（1乗務1ファイル）
- アクセス: PATでブラウザから読み書き、公開URLなし

## 5. ファイル構成

```
タクシー日報/
├ index.html              ホーム（直近乗務リスト + 月サマリー）
├ input.html              日報入力（1画面スクロール型）
├ detail.html             1乗務の詳細（?date=YYYY-MM-DD）
├ calendar.html           シフトカレンダー
├ settings.html           設定（デフォルト値、トークン、レートテーブル編集）
├ js/
│ ├ app.js                共通ユーティリティ、ナビ
│ ├ parser.js             日報テキスト解析（Claude/Gemini両対応）
│ ├ payroll.js            給与計算
│ ├ weather.js            Open-Meteo呼び出し
│ ├ storage.js            GitHub API I/O
│ └ chart.js              グラフ描画ラッパー
├ css/style.css
├ docs/superpowers/specs/ 設計・プランドキュメント
├ tests/                  パーサー・給与計算のユニットテスト
├ manifest.webmanifest    PWAマニフェスト
└ sw.js                   Service Worker

# 別リポ hidenaka/taxi-daily-report-data（プライベート、ローカルクローン不要）
data/
├ config.json             設定 + シフト + レートテーブル
└ drives/
  └ YYYY-MM-DD.json       1乗務1ファイル
```

## 6. データモデル

### `config.json`

```json
{
  "shifts": {
    "patterns": ["sun", "tue", "thu"],
    "exceptions": {
      "added": ["2026-04-25"],
      "removed": ["2026-04-26"],
      "swapped": [{"from": "2026-04-19", "to": "2026-04-18"}]
    },
    "expandedDates": ["2026-04-01", "2026-04-03", "2026-04-05"]
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
      {"salesMin": 0, "salesMax": 100000, "rate": 0.55}
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
  // 注: rateTable の "4"〜"11" の中身は本設計では未確定。
  // 実装フェーズの最初に Claude が IMG_5676 から全ティアを推定 → JSON化 →
  // 給与データフォルダの過去明細3-4件と突き合わせて検算 → 確定する。
  "lastUpdated": "2026-04-25T12:00:00+09:00"
}
```

**ポイント:**
- `shifts.expandedDates` は曜日パターンと例外から起算した実日付配列。高速参照用に展開済みで持つ
- 曜日パターンを後から変更した場合、**過去の実績日**（既に drives/* に保存済み）には影響しない。**未来の expandedDates だけ再展開**する（変更日以降の予定を上書き）
- `rateTable["12_13rate"]` は12乗務目以降の固定歩率（62%）。本人確認済み（13乗務超は実質発生しない）
- `rateTable[N]`（N=4-11）の各エントリは売上ティア（min/max）と歩率（rate）の配列
- 全体で1〜2KB程度の軽量ファイル

### `drives/YYYY-MM-DD.json`

```json
{
  "date": "2026-04-25",
  "vehicleType": "regular",
  "departureTime": "07:00",
  "returnTime": "22:43",
  "memo": "夕方羽田から長距離2本",
  "rawText": "（OCRした生テキスト）",
  "trips": [
    {
      "no": 1,
      "boardTime": "07:17",
      "alightTime": "07:22",
      "boardPlace": "品川区中延5",
      "alightPlace": "品川区二葉4",
      "km": 0.8,
      "amount": 1000,
      "isPickup": true,
      "isCancel": false,
      "waitTime": ""
    }
  ],
  "rests": [
    {
      "startTime": "08:09",
      "endTime": "08:21",
      "place": "千代田区内幸町1"
    }
  ],
  "weather": {
    "morning":  {"code": 1,  "label": "晴",   "tempAvg": 18.2, "precipMm": 0.0},
    "noon":     {"code": 2,  "label": "曇",   "tempAvg": 21.5, "precipMm": 0.0},
    "evening":  {"code": 61, "label": "小雨", "tempAvg": 19.8, "precipMm": 1.2},
    "night":    {"code": 1,  "label": "晴",   "tempAvg": 17.4, "precipMm": 0.0}
  },
  "createdAt": "2026-04-26T02:14:00+09:00",
  "updatedAt": "2026-04-26T02:18:00+09:00"
}
```

**ポイント:**
- `rawText` を残す（再パース・検証用）。サイズは1日5-10KB程度
- `trips` と `rests` は別配列（休憩は別概念）
- `weather` は4区分（朝6-12 / 昼12-18 / 夕夜18-24 / 深夜0-6）
- キャンセルは `isCancel: true` で `amount: 0` 上書き。件数集計時に除外
- 集計値（売上合計、件数など）は保存しない。表示時に都度計算（データ単一ソース原則）

### 派生データ（保存しない、表示時に計算）

- 月次の乗務数 / 売上合計 / 推定支給額 → drives/* を月でフィルタして集計
- 1乗務の実車時間 / 休憩時間 / 空車時間 → trips と rests から計算
- 時間帯別売上 / 1時間ヒートマップ → trips から集計

## 7. 主要画面とナビゲーション

ボトムナビ4タブ: **ホーム** / **入力** / **カレンダー** / **設定**

### 7.1 ホーム（index.html）
- 上部: 月サマリー（細）「N月  X/11乗務  推定¥XXX,XXX」
- 中部: 直近乗務リスト（日付・天候アイコン・件数・売上）。タップで詳細へ
- フッター: 「+日報を入力」FAB

### 7.2 入力（input.html）
1画面スクロール型。各セクション折りたたみ可能。

- 乗務日（自動判定済み、修正可能）
- テキスト貼付エリア → 貼った瞬間に自動パース
- プレビュー（インライン編集可能）
- 種別 / 帰庫時刻 / メモ
- 保存ボタン

### 7.3 詳細（detail.html?date=YYYY-MM-DD）
ハイブリッド型レイアウト。

- 上部: KPI（売上、件数、時間単価、天候）
- 中央: 時間配分の3色帯（実車 / 休憩 / 空車）
- 下: 時間別ヒートマップ（売上＋効率）
- 最下部: 日報明細（折りたたみ展開）
- 「編集」ボタンで input.html に戻り、再保存可能

### 7.4 カレンダー（calendar.html）
- 月カレンダー、タップで予定追加/削除
- 曜日一括選択ボタン（日/月/火/水/木/金/土）
- 月サマリー（予定/実績/残り/責任出番達成見込み）
- 翌月へナビゲート可能（先に翌月予定登録できる）

### 7.5 設定（settings.html）
- **データリポジトリ名**（例: `hidenaka/taxi-daily-report-data`）
- GitHub Personal Access Token（マスク表示）
- 出庫時刻デフォルト
- 乗務種別デフォルト
- 天候地点（緯度経度、デフォルト千代田区）
- レートテーブル編集（テーブルUI、ティア追加/削除、歩率変更）
- データエクスポート（全 drives/* を1JSONにまとめてダウンロード）
- 「全drives再計算」ドライランボタン（レートテーブル変更時の影響確認用）

## 8. データフロー

### 8.1 入力 → 保存
```
テキスト貼付
  → parser.js（形式自動判別: タブ/CSV）
  → trips[] と rests[] に変換
  → キャンセル判定（km=0 & amount=500 → isCancel:true、amount:0に上書き）
  → プレビュー表示
ユーザー確認・編集（インライン編集可能）
メタ情報入力
保存ボタン
  → weather.js（Open-Meteoで4区分の天候取得）
  → storage.js（GitHub API: PUT data/drives/YYYY-MM-DD.json）
  → コミット完了
  → ホームへリダイレクト
```

### 8.2 日付自動判定ロジック
```
入力時の現在時刻 T を取得
  ↓
T から48時間さかのぼって config.shifts.expandedDates を検索
  ↓
見つかった最も新しい予定日 D を候補にする
  ↓
見つからない場合は「今日」を候補
  ↓
ユーザー確認可、ドロップダウンで±7日変更可能
```

**例:**
- 4/25が予定日、4/25 23:00入力 → 4/25
- 4/25が予定日、4/26 02:00入力 → 4/25
- 4/25が予定日、4/26 18:00入力 → 4/25（48h以内にシフト予定あり）
- 直近48hに予定なし → 今日をデフォルト、手動で過去日選択

### 8.3 月サマリー集計
```
ホーム表示時
  → storage.js（GitHub API: GET data/drives/ 一覧）
  → 当月分のJSONを並列fetch
  → 集計: 売上合計、乗務数、キャンセル数
  → payroll.js: 月累計売上 + 乗務数 → 推定支給額
  → 表示
```

## 9. パース処理（parser.js）

### 9.1 入力フォーマット自動判別
- 1行目に `,` が含まれる → CSV形式（Gemini）
- それ以外 → タブ区切り（Claude）

### 9.2 列マッピング
| Claude（タブ区切り、9列） | Gemini（CSV、11列） |
|---|---|
| No / 乗車 / 降車 / 時間 / 迎 / 乗車地 / 降車地 / 営Km / 合計 / 待機 | No / 乗車 / 降車 / 時間 / 迎 / 乗車地 / 降車地 / 営Km / 男 / 女 / 合計 |

### 9.3 各行の処理
- No列が "休" → rests[] に追加 `{ startTime, endTime, place }`
- No列が数字 → trips[] に追加 `{ no, boardTime, alightTime, boardPlace, alightPlace, km, amount, isPickup, isCancel, waitTime }`
- 空行はスキップ
- 「休」が複数連続してもOK（rests[] の独立要素として追加）

### 9.4 キャンセル判定
```javascript
isCancel = (km === 0 && amount === 500)
        || (km === 0 && boardPlace === alightPlace)
// trueの場合: amount を 0 に上書き
```

### 9.5 帰庫時刻の自動採用
- ファイル末尾が「休」行の場合 → その endTime を returnTime として自動入力
- それ以外 → ユーザー手動入力

### 9.6 CSV内のカンマエスケープ
- 引用符付き値（`"3,600"`）を正しくパースする CSVパーサを使用

## 10. 給与計算ロジック（payroll.js）

### 10.1 計算ステップ

```
Step 1: 月累計の集計
  for each drive in drives:
    drive.dailySalesInclTax = sum(trip.amount for trip in trips if !trip.isCancel)
    drive.dailySalesExclTax = drive.dailySalesInclTax / 1.1
  monthlySalesExclTax = sum(drive.dailySalesExclTax for drive in drives)
  shiftCount = drives.length

Step 2: 11乗務までの売上から歩率を引く
  if shiftCount <= 11:
    table = config.rateTable[String(shiftCount)]
    rate = findRate(table, monthlySalesExclTax)
    basePay = monthlySalesExclTax * rate
  else:
    sales11 = sum(drive.dailySalesExclTax for drive in drives[0..10])
    rate = findRate(config.rateTable["11"], sales11)
    basePay = sales11 * rate
    for drive in drives[11..]:
      basePay += drive.dailySalesExclTax * config.rateTable["12_13rate"]

Step 3: プレミアム車両のインセンティブ
  for each drive in drives:
    if drive.vehicleType === "premium" && drive.dailySalesExclTax > config.premiumIncentive.thresholdSalesExclTax:
      incentive += config.premiumIncentive.amountPerShift
  total = basePay + incentive
```

### 10.2 月途中の暫定表示
- 7乗務終了時点 → 「責任出番11達成前提」で計算
- `rate = findRate(config.rateTable["11"], 当月累計売上)` を仮置き
- 表示に「暫定」ラベル付ける

### 10.3 税込／税抜の扱い
- レートテーブルは税抜ベース（IMG_5676）
- 日報の `合計` 列は税込（運賃 × 1.1）
- 給与計算前に `合計 / 1.1` で税抜化
- 表示では税抜・税込両方を見せる

### 10.4 レートテーブルの取得
- 開発初期に Claude が IMG_5676 から推定 → JSONとして config.json に格納
- 過去3〜4ヶ月の給与明細（給与データフォルダ）と突き合わせて検算
- 差が ±1,000円以内になるまで調整
- 将来、料金体系変更時はレートテーブル編集UI（settings.html）から修正

## 11. 天候取得（weather.js）

### 11.1 Open-Meteo API
- エンドポイント: `https://api.open-meteo.com/v1/forecast`（過去日付は `archive-api.open-meteo.com`）
- パラメータ: lat, lon, hourly=`weather_code,temperature_2m,precipitation`, start_date, end_date

### 11.2 時間帯別集計
取得した時間別データを4区分に集計：

| 区分 | 時間範囲 | 集計方法 |
|------|----------|----------|
| morning | 06:00-11:59 | 代表weather_code（最頻値）、気温平均、降水量合計 |
| noon | 12:00-17:59 | 同上 |
| evening | 18:00-23:59 | 同上 |
| night | 00:00-05:59 | 同上 |

### 11.3 weather_code → 日本語ラベル変換
- WMO weather codes（Open-Meteo標準）を日本語マッピング
- 主要コード: 0=快晴, 1-3=晴〜曇, 45-48=霧, 51-67=雨, 71-77=雪, 80-86=にわか雨, 95-99=雷雨

## 12. エラー処理

### 12.1 パースエラー
- **検知**: trips[] が0件、または「合計」列が数値化できない
- **対応**: エラー表示「テキスト形式を認識できませんでした。生テキストを残して保存可能。後から手動編集してください」
- **復旧**: rawText だけ保存可。詳細画面で手動入力可能

### 12.2 GitHub API エラー
| ステータス | 対応 |
|---|---|
| 401（認証失敗） | 「トークンが無効です。設定画面で再設定してください」 |
| 404（リポジトリ無し） | 「リポジトリが見つかりません」+ 設定画面リンク |
| 409（コンフリクト） | 最新版を取得 → ユーザーに「上書き / マージ / キャンセル」選択 |
| ネットワーク失敗 | localStorage に「保存待ち」キューに退避、復帰時に再送 |

### 12.3 天候API エラー
- 取得失敗してもデータ保存は止めない
- weather フィールドを `null` で保存
- 詳細画面に「天候未取得 [再取得]」ボタン表示

### 12.4 レートテーブル外の売上
- 売上ティアの最大を超える → 最大ティアの歩率を適用、警告表示「想定範囲外、レートテーブル要更新」

## 13. テスト戦略

### 13.1 パーサーのユニットテスト（必須）
- **テストデータ**: 設計時にユーザーが提供した Claude形式 + Gemini形式 の2件を `tests/fixtures/` 配下に保存して使用
  - `tests/fixtures/sample-claude.txt`（タブ区切り、26件＋休4件）
  - `tests/fixtures/sample-gemini.csv`（CSV、25件＋休6件）
- **検証項目**:
  - trips の件数
  - rests の件数
  - キャンセル判定（km=0 & amount=500）
  - 日付・時刻・金額の数値化
- **環境**: `node --test` または手書きテストランナー

### 13.2 給与計算のユニットテスト（必須）
- **テストデータ**: 給与データフォルダの過去明細から3-4件
- **検証項目**:
  - 計算した支給額 と 実明細の「歩合対象」「総支給額」の差が ±1,000円以内
  - インセンティブ計算
- **副次効果**: レートテーブル復元の検算

### 13.3 手動E2Eチェックリスト
- 日報テキスト貼付 → パース → 保存 → ホームに反映
- カレンダーで予定日マーク → 入力時に自動判定が効く
- 詳細画面の3色帯・ヒートマップ表示
- 設定画面でレートテーブル編集 → 集計に反映
- iPhone Safari でPWAインストール、オフライン起動確認

### 13.4 ドライランモード
- 設定画面に「全drives再計算」ボタン
- レートテーブル変更時にこれを押すと、過去全月の支給額を再計算して比較表示

## 14. Definition of Done

1. パーサーが Claude / Gemini 両形式を正しく解析（テスト合格）
2. 過去3ヶ月分の実明細と推定支給額の差が ±1,000円以内（給与計算正当性の証明）
3. iPhone Safari で PWAインストール可能、オフライン起動可能
4. ホーム → 入力 → 保存 → 詳細 → カレンダーの一周フローが動く
5. GitHub Pages にデプロイ済み、URLからアクセス可能

## 15. スコープ外（将来の拡張候補）

- 経費管理（給油代、食費）
- 売上の支払い方法別内訳（現金/カード/QR/チケット）
- 天候・曜日と売上の相関分析グラフ
- AIによる「効率改善アドバイス」
- 複数ユーザー対応（家族のタクシー乗務員など）

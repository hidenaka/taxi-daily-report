# マルチユーザー実装の修復 + 効率ヒートマップ再設計

**作成日**: 2026-04-27
**対象**: タクシー日報PWAアプリ
**前提仕様**: `docs/superpowers/specs/2026-04-27-multi-user-support-design.md`

---

## 1. 背景

`2026-04-27-multi-user-support-design.md` で定義したマルチユーザー対応の MVP は完了済み(Task 1〜13)だが、以下の **実装ギャップ** と **追加要件** が判明した:

### 1.1 実装ギャップ
- **本人データの user_self/ migration 未実施**: `data/drives/*.json`(約270日分)が root level に残っており、`data/drives/user_self/` フォルダが存在しない。PWA の `getDrivesForMonth(ym)` は `data/drives/{userId}/` を読むため、本人データが画面上で見えない状態。
- **users.json 形式破損**: 突貫push により、本来 `{users: [...]}` 形式であるべき `data/users.json` が `[{...}]` (flat array) に書き換わった。`user_self` エントリも欠落。

### 1.2 追加要件(本仕様で定義)
- **効率ヒートマップの定義変更**: 既存の「自分のデータ + ¥/h(休憩込み実労働時間ベース)」を、**¥/h(休憩除外実稼働時間ベース)** に変更し、**自分のみ / 全員統合 の2タブ切替**にする。
- **管理者向け bulk push 経路の汎用化**: 今回 user_mm 取込みで作った `scripts/push-from-paste.mjs` をハードコード除去し、新規知人追加でも再利用できる形にする。

---

## 2. ゴール

1. **本人データを正規パスに移行し、PWA で本人/知人両方のデータが正しく見える状態にする**
2. **効率ヒートマップを「休憩を除いた実稼働時間あたりの売上」指標に統一し、自分/全員統合 の両軸で見られるようにする**
3. **次の知人追加時に、今回の流れ(paste-here.txt → validate → push)を再現できる管理者向け運用を整備する**

---

## 3. スコープ

| 区分 | スコープ内 | スコープ外 |
|---|---|---|
| データ修復 | 本人データの user_self/ コピー、users.json 修正 | root level の旧ファイル削除(将来の cleanup) |
| 運用整備 | 管理者向け bulk push スクリプトの汎用化、ドキュメント整理 | 知人本人の日次運用フロー(既に実装済み:input.html ペーストモード) |
| ヒートマップ | ¥/h一本化、休憩除外、2タブ切替 | 他カード(ペース参考、推奨検索等)の変更 |

---

## 4. 設計

### 4.1 §A: 本人データ migration

**現状**:
```
data/drives/
  ├── 2024-03-15.json       ← 本人データ(未移行)
  ├── 2024-03-17.json
  ├── ...(約270ファイル)
  └── user_mm/              ← 知人(投入済み)
      ├── 2025-07-02.json
      └── ...
```

**移行後**:
```
data/drives/
  ├── 2024-03-15.json       ← 元ファイル残置(rollback保険)
  ├── 2024-03-17.json
  ├── ...
  ├── user_self/            ← 新規作成(コピー)
  │   ├── 2024-03-15.json
  │   ├── 2024-03-17.json
  │   └── ...
  └── user_mm/              ← 触らない
      └── ...
```

**手順**:
1. `scripts/migrate-to-userid.mjs --dry-run` で対象ファイルを確認
2. dry-run結果に問題なければ本実行
3. 完了後、PWA を開いて振り返り画面で本人データが表示されることを確認

**スクリプトの挙動**:
- 既存実装(Task 4 で完成済み、`scripts/migrate-to-userid.mjs`)
- 冪等: 既に新パスにファイルあればスキップ
- 元ファイルは削除しない
- rate limit 対応済み

**完了基準**:
- `data/drives/user_self/` 配下にファイルが存在
- PWA `index.html` / `review.html` / `calendar.html` で本人データが表示される

### 4.2 §B: users.json 修正

**現状**(GitHub data repo):
```json
[
  { "userId": "user_mm", "displayName": "mm", "active": true }
]
```

**修正後**:
```json
{
  "users": [
    { "userId": "user_self", "displayName": "自分", "active": true },
    { "userId": "user_mm", "displayName": "mm", "active": true }
  ]
}
```

**手順**:
- 1回限りの修復スクリプト `scripts/repair-users-json.mjs` を新規作成して実行
  - 現状の users.json を読み込み(壊れた flat array でもOK)
  - 正しい `{users: [...]}` 形式を出力
  - `user_self`(displayName: "自分") + `user_mm`(displayName: "mm") の両方を `active: true` で含める
  - GitHub data repo に上書き push
- 完了後、PWA `support.html` で `getAllUsersDrivesForMonth()` が両ユーザー分のデータを統合することを確認

**完了基準**:
- `data/users.json` が `{users: [...]}` 形式
- `user_self` と `user_mm` 両方が `active: true` で含まれる
- `support.html` の「全員統合」カードで両者のデータが集計される

### 4.3 §C: 管理者向け bulk push スクリプト汎用化

**現状**:
- `scripts/push-from-paste.mjs` は `user_mm` ハードコード、`2026-01-20: premium` 上書きハードコード
- users.json書き込みが flat array 形式(誤)

**変更後**:
- ファイル名: `scripts/admin-bulk-push.mjs` にrename
- 引数:

| フラグ | 必須 | デフォルト | 説明 |
|---|---|---|---|
| `--user <userId>` | ✓ | — | 投入先 userId(`isValidUserId` で検証) |
| `--display <name>` | ✓ | — | users.json 登録用の displayName |
| `--paste <path>` | | `data/paste-here.txt` | ペーストされたテキストファイル |
| `--override <date:vehicle,...>` | | (なし) | 車種上書き。例: `2026-01-20:premium,2025-10-08:regular` |
| `--dry-run` | | false | 実書き込みせず予定を表示 |

- users.json は `{users: [...]}` 形式で読み書き(既存ユーザーを保持して append)
- 既存日付の push は上書き(idempotent)
- 重複日付検出: 完全一致は片方を捨てる、内容相違は中止してエラー報告

### 4.4 §D: 効率ヒートマップ再設計

**指標**: ¥/h(¥ ÷ 実稼働時間)一本化

**実稼働時間の定義**:
- セル(曜日×時間=1時間)単位での計算
- そのセル時間帯のうち、ある drive の `(出庫 〜 帰庫)` 範囲内かつ `rests` 区間に含まれない秒数を加算
- 全 drive について合算

**売上の按分**:
- 各 trip について、`(boardTime, alightTime)` がセル時間帯と重なる秒数の比率で `amount` を按分し、セルに加算
- 既存の chart-helpers.js のロジック踏襲(休憩除外のみ追加)

**UI**(`support.html` 「曜日 × 時間 効率」カード):

| 項目 | 旧 | 新 |
|---|---|---|
| タブ構成 | `時間効率(¥/h)` / `1日平均売上` | `自分のみ` / `全員統合` |
| 指標 | A: ¥/h(休憩込み) / B: 1日平均売上 | ¥/h(休憩除外) のみ |
| データソース | 自分のみ(両タブとも) | 自分のみ(タブ1) / 全員統合(タブ2) |
| ラベル(カード見出し) | 「(自分のデータ)」固定 | タブ依存で動的切替 |
| セルtap詳細 | 維持(自分の履歴) | 維持(タブに応じて自分/全員) |
| サンプル<3件グレー | 維持 | 維持 |
| 色スケール | 全タブ共通 | タブごとに max 正規化 |

**実装ポイント**:
- `js/chart-helpers.js` の `hourlyDowEfficiency(drives, ...)` を以下に拡張:
  - 引数の drives は `{rests: [...]}` を必ず持つ前提
  - 各セル計算時、休憩区間と重なる時間を実稼働時間から除外
  - 戻り値の構造は維持(時間効率 cell × 曜日 × hour)
- 1日平均売上の計算ロジック削除(該当箇所のみ)
- `support.html` のタブUIラベル + データ供給切替

**ユースケース検証**:
- 自分は18時前後に休憩多め → 自分のみタブで18時セルが薄くなる(=自分のリアル)
- 知人は20時前後に休憩多め → 全員統合タブで18時も20時も「実際に走っていた人」のデータが残るので、両時間帯の真の¥/h が見える
- → 全員統合タブで「曜日ごとの最適稼働時間」を見つける

---

## 5. テスト戦略

### 5.1 ユニットテスト
- `tests/chart-helpers.test.js`(新規 or 既存): `hourlyDowEfficiency` の休憩除外ロジック
  - 出庫07:00、帰庫22:00、休憩18:00-19:30 のドライブで18時セルの実稼働時間=30分になること
  - 休憩内に trip がない(=データ整合性的に当然)
  - 全drive集計時の合算正確性
- `tests/admin-bulk-push.test.js`(新規): 引数parse、users.json append/preserve、override parse
- `tests/users-json.test.js`(新規): users.json の正しい形式読み書き

### 5.2 統合動作確認(手動)
1. migration実行後 → PWA index で本人データ表示
2. users.json修正後 → PWA support の全員統合カードで両ユーザー集計件数確認
3. ヒートマップ実装後:
   - 自分のみタブで休憩時間帯がグレー or 薄色
   - 全員統合タブで休憩時間帯にも数字が出る(知人が走っていれば)
   - タブ切替で色スケールが再正規化

---

## 6. ドキュメント

### 6.1 新規

`docs/admin-bulk-import.md`:
1. 用途明示: 「これは管理者向け初期/履歴一括投入手順。知人本人の日次運用は `setup-for-collaborator.md` 参照」
2. 写真→Gemini Web ペースト用プロンプト(`docs/ai-prompt-template.md` を引用)
3. paste-here.txt への保存手順
4. `node scripts/validate-pasted-bulk.mjs` で検証
5. `node scripts/admin-bulk-push.mjs --user user_X --display "Xさん"` で push
6. 実行後の PWA support での確認方法

### 6.2 更新
- `README.md`「知人の写真をまとめて取込む」セクション → admin-bulk-import.md へリンク差し替え
- `2026-04-27-multi-user-support-design.md` の §11 MVP範囲 #2 (migration) を「完了未確認 → 本仕様で完了」と注記

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| migration 中断で user_self/ が中途半端な状態 | 一部データが見えない | スクリプトは冪等。再実行で完了 |
| users.json 上書きで既存ユーザーが消える | 集計対象から外れる | admin-bulk-push.mjs は読み込み→append→書き込みで既存保持 |
| ヒートマップ計算の休憩除外バグ | 数値が狂う | ユニットテスト必須、複数drive横断のケースもカバー |
| 旧ヒートマップの色スケール期待感とのズレ | UI違和感 | リリースノート等で「指標が変わった」を明示(本人だけなのでissue事象は無いと判断) |

---

## 8. 完了基準

1. PWA を user_self で開いた時:
   - ホーム/振り返り/カレンダーで本人データが表示される
   - 営業サポート の全員統合カードで user_self + user_mm の合算が機能する
   - 効率ヒートマップ「自分のみ」タブで休憩時間帯がグレー or 薄色になっている
   - 効率ヒートマップ「全員統合」タブで休憩時間帯にも数字が出ている
2. `data/users.json` が `{users: [user_self, user_mm]}` の正しい形式
3. `scripts/admin-bulk-push.mjs --user user_X --display "X"` で次の知人を投入できる(動作確認)
4. `npm test` 全通過

---

## 9. 非ゴール(本仕様で扱わない)

- 知人本人の日次運用フロー(既に input.html ペーストモード実装済み)
- root level に残った旧 `data/drives/*.json` の削除(将来の cleanup タスク)
- 効率ヒートマップ以外のカードの修正
- 知人本人の `data/config/user_mm.json` 作成(本人がPWA設定画面で初回保存時に作られる)
- 3人目以降の知人追加 GUI(MVP範囲外、現状 admin-bulk-push.mjs 一発で対応)

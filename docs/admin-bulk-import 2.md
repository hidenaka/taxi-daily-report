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

ファイル: `data/paste-here.txt`

このファイルにペースト&保存(macOSなら `open data/paste-here.txt` で TextEdit で開く)。

### 3. 検証

```bash
node scripts/validate-pasted-bulk.mjs
```

確認すべき出力:
- 総セクション数 = 写真枚数と一致
- パース失敗 0
- 重複日付がある場合は完全一致 or 相違の判定
- キャンセル統計(¥400無条件・¥500/¥1000+0km・「キ」明示)
- 車種推論結果(premium / japantaxi の日数)

問題あれば paste-here.txt を編集してリトライ。

### 4. push

```bash
GITHUB_TOKEN=$(gh auth token) DATA_REPO=hidenaka/taxi-daily-report-data \
  node scripts/admin-bulk-push.mjs --user user_X --display "Xさん"
```

**車種を上書きしたい日があれば:**
```bash
... --override 2026-01-20:premium,2025-10-08:japantaxi
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
| `zsh: event not found` | tokenの `!` が履歴展開される。`export GITHUB_TOKEN='...'` のように single quote で囲って事前にexport |

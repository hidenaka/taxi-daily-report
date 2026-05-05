# 開発/本番環境分離 実装計画

> **For agentic workers:** 実行時は `dispatching-parallel-agents` またはタスクごとにチェックポイントレビューを行うこと

**Goal:** GitHub Pages で開発用と本番用の環境を分離し、開発中の変更が本番に影響しないようにする
**Architecture:** リポジトリを2つに分離。本番リポジトリは安定版のみ、開発リポジトリは自由にpushして確認可能
**Tech Stack:** GitHub Pages, Git

---

## ファイル構造

```
【本番】hidenaka/taxi-daily-report (mainブランチ)
├── index.html
├── input.html
├── detail.html
├── settings.html
├── ... (すべての本番ファイル)

【開発】hidenaka/taxi-daily-report-dev (mainブランチ)
├── index.html
├── input.html
├── detail.html
├── settings.html
├── ... (開発中のファイル)
```

---

## Task 1: 開発用リポジトリ作成

**Files:**
- 作成: GitHub上で `hidenaka/taxi-daily-report-dev` リポジトリ
- 変更: なし

**手順:**
1. [ ] **GitHubで新規リポジトリ作成**
   - 名前: `taxi-daily-report-dev`
   - Public設定
   - READMEなし、.gitignoreなし

2. [ ] **開発用リポジトリをローカルにクローン**
   ```bash
   cd ~/workspace
   git clone https://github.com/hidenaka/taxi-daily-report-dev.git
   ```

3. [ ] **本番リポジトリの内容をコピー**
   ```bash
   cp -r "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報"/* taxi-daily-report-dev/
   cd taxi-daily-report-dev
   git add -A
   git commit -m "initial: 本番からコピー"
   git push origin main
   ```

4. [ ] **GitHub Pages設定を有効化**
   - GitHubリポジトリ → Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / root
   - Save

5. [ ] **アクセス確認**
   - URL: `https://hidenaka.github.io/taxi-daily-report-dev/`
   - ページが表示されることを確認

---

## Task 2: 開発環境識別バッジ追加

**Files:**
- 変更: `js/app.js` (renderBottomNav関数または共通ヘッダー)

**目的:** 開発環境と本番環境を視覚的に区別

**手順:**

1. [ ] **開発環境検出関数を追加**

   `js/app.js` に追加:
   ```javascript
   export function isDevEnvironment() {
     return location.hostname.includes('-dev') || 
            location.pathname.includes('/dev/');
   }
   ```

2. [ ] **開発環境バッジを表示**

   `index.html` など各ページの `<main>` 直後に:
   ```html
   <div id="devBadge" style="display:none;background:#ff9800;color:#fff;padding:4px 8px;font-size:11px;text-align:center;font-weight:600;">
     🚧 開発環境
   </div>
   <script>
     if (location.hostname.includes('-dev')) {
       document.getElementById('devBadge').style.display = '';
     }
   </script>
   ```

---

## Task 3: デプロイフロー確立

**Files:**
- 変更: なし（運用手順）

**開発→本番の反映フロー:**

1. [ ] **開発リポジトリで変更・確認**
   ```bash
   cd taxi-daily-report-dev
   # 変更を加える
   git add -A
   git commit -m "feat: 新機能"
   git push origin main
   ```
   - `https://hidenaka.github.io/taxi-daily-report-dev/` で確認

2. [ ] **本番リポジトリに反映**
   ```bash
   cd "/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報"
   # 開発リポジトリからファイルをコピー
   cp -r ~/workspace/taxi-daily-report-dev/* .
   git add -A
   git commit -m "release: 開発版を本番反映"
   git push origin main
   ```
   - `https://hidenaka.github.io/taxi-daily-report/` で最終確認

---

## Task 4: ユーザー向けドキュメント作成

**Files:**
- 作成: `README.md` (本番リポジトリ)

**内容:**
```markdown
# タクシー日報

## URL
- 本番: https://hidenaka.github.io/taxi-daily-report/
- 開発: https://hidenaka.github.io/taxi-daily-report-dev/ (開発者のみ)

## 開発フロー
1. `taxi-daily-report-dev` リポジトリで変更
2. 開発URLで動作確認
3. 問題なければ `taxi-daily-report` に反映
```

---

## 検証チェックリスト

- [ ] 開発URL (`-dev`) でページが表示される
- [ ] 本番URL (`-dev`なし) でページが表示される
- [ ] 開発環境に「🚧 開発環境」バッジが表示される
- [ ] 本番環境にはバッジが表示されない
- [ ] 開発リポジトリにpush → 開発URLに即座に反映される
- [ ] 本番リポジトリにpush → 本番URLに即座に反映される

---

## 注意点

1. **Firestoreのデータは共有**: 開発・本番両方が同じFirebaseデータベースにアクセスする。テストデータを入れる場合は注意
2. **Service Worker**: 開発URLと本番URLでキャッシュが別々に管理される
3. **localStorage**: 同一ドメイン (`github.io`) 内では共有される可能性がある

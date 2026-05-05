# セッション引継ぎ: 2025-05-05

## 現在のタスク
Firebase Firestore への移行（GitHub PAT方式からの脱却）

## 完了済み
- [x] Firebase プロジェクト作成（taxi-dailydata）
- [x] Firestore データベース有効化（本番モード、asia-northeast1）
- [x] 匿名認証有効化
- [x] `js/firebase-init.js` — Firebase初期化（CDNモジュール方式）
- [x] `js/firebase-auth.js` — 匿名認証 + userId管理
- [x] `js/firebase-storage.js` — Firestore CRUD（getDrive, saveDrive, getDrivesForMonth, getConfig, saveConfig等）
- [x] `js/storage.js` — 互換性ラッパー（既存コードがそのまま動くように）
- [x] `index.html` — GitHub依存削除、Firebase auth初期化追加
- [x] `settings.html` — PAT入力欄削除、認証状態表示に変更
- [x] `review.html` — GitHubトークンチェック削除、auth初期化追加
- [x] `input.html` — GitHubトークンチェック削除
- [x] `detail.html` — GitHubトークンチェック削除、listFiles対応
- [x] `calendar.html` — GitHubトークンチェック削除、auth初期化追加
- [x] `support.html` — GitHubトークンチェック削除、auth初期化追加

## 未完了・次のアクション（優先順）
1. [ ] **データ移行スクリプト作成** — GitHub上の既存JSONデータをFirestoreに一括インポート
2. [ ] **動作確認** — ブラウザで各ページを開き、読み書きが正常に動くか確認
3. [ ] **オフライン対応** — Firestoreのオフライン永続化を有効化（enableIndexedDbPersistence）
4. [ ] **セキュリティルール設定** — Firestoreのルールでユーザーごとデータ分離
5. [ ] **複数ユーザー対応** — support.htmlの全員統合機能をFirestoreで実装

## 重要な決定事項
- 互換性ラッパー方式を採用：既存の `js/storage.js` をFirebase版に置き換え、同じ関数名を維持
- 匿名認証を採用：アプリ開いたら自動ログイン、後からメール連携可能
- CDNモジュール方式でFirebase SDKを読み込み（npm不要）

## 既知の問題・注意点
- `listFiles` はFirestoreの都合上、日付一覧を返すように変更（detail.htmlの日付ナビ対応）
- `support.html` の多ユーザー統合機能は現状、単一ユーザー動作にフォールバック
- オフライン時の動作は未検証（queuePendingは実装済みだがテスト未実施）
- Firestoreセキュリティルールはデフォルトのまま（開発中は許可、本番前に必ず制限要）

## 関連ファイル（現在の状態付き）
- `js/firebase-init.js`: 新規作成済み
- `js/firebase-auth.js`: 新規作成済み
- `js/firebase-storage.js`: 新規作成済み
- `js/storage.js`: 互換性ラッパーに完全置き換え済み
- `index.html`: Firebase移行済み
- `settings.html`: PAT欄削除済み
- `review.html`: auth初期化追加済み
- `input.html`: GitHubチェック削除済み
- `detail.html`: GitHubチェック削除済み
- `calendar.html`: auth初期化追加済み
- `support.html`: GitHubチェック削除済み（構文修正済み）

## 検証コマンド / 動作確認手順
```bash
# ローカルサーバー起動
python3 -m http.server 8000
# または
npx serve .

# ブラウザで確認
open http://localhost:8000
```
1. ホーム画面が「読み込み中…」なしで表示されるか
2. 設定画面でuserIdが表示されるか
3. 乗務入力→保存が正常に動くか
4. 入力したデータがホーム/カレンダーに反映されるか
5. 分析ページ（review.html）でデータが表示されるか

## Firebase設定情報
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDwy688S23-aw9IoIe82FnHly8GZZJEaXw",
  authDomain: "taxi-dailydata.firebaseapp.com",
  projectId: "taxi-dailydata",
  storageBucket: "taxi-dailydata.firebasestorage.app",
  messagingSenderId: "797799790485",
  appId: "1:797799790485:web:6fb185c0ad7049feeae89c",
  measurementId: "G-83C6HHWD1L"
};
```

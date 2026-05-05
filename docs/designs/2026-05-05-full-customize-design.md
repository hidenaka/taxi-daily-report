# タクシー日報 - 個人カスタマイズ設計（最小構成）

## 最終更新: 2026-05-05

---

## 1. ゴール

各ユーザーが自分専用の歩率テーブルを編集できるようにする。

---

## 2. 現状の問題

| 問題 | 影響 |
|------|------|
| 給与計算式が全員共通 | 会社によって歩率が異なるのに対応できない |

---

## 3. アーキテクチャ

### 3.1 Firestore スキーマ

#### コレクション: `userConfigs/{userId}`

```javascript
{
  // === 給与計算（個人編集可能） ===
  rateTable: { /* 4〜11乗務の歩率テーブル */ },
  extraRate: 0.62,  // 12乗務目以降
  premiumIncentive: {
    thresholdSalesExclTax: 80000,
    amountPerShift: 2000
  },
  responsibilityShifts: 11,

  // === 現状と同じ ===
  defaults: { vehicleType: "japantaxi", departureTime: "07:00" },
  takeHomeRate: 0.75,
  takeHomeTarget: 500000,
  paidLeaveAmount: 39340,
  weatherLocation: { lat: 35.6938, lon: 139.7036, name: "千代田区" },
  shifts: { patterns: [], exceptions: {...}, expandedDates: [], paidLeaveDates: [] },
  displayName: "",

  lastUpdated: "2026-05-05T10:00:00Z"
}
```

### 3.2 セキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // userConfigs: 自分のみ読み書き可
    match /userConfigs/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // drives: 自分のみ
    match /drives/{userId}/daily/{date} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 4. 変更が必要なファイル

| ファイル | 変更内容 | 工数 |
|----------|----------|------|
| `firebase-storage.js` | `getConfig()` / `saveConfig()` で `userConfigs/{uid}` を読み書き | 1h |
| `firebase-init.js` | Firestoreセキュリティ対応（匿名認証で自分のデータのみ） | 30min |
| `settings.html` | 歩率テーブル編集UI追加（4〜11乗務、12-13rate、premiumIncentive） | 2h |
| `payroll.js` | 変更なし（configから計算する仕様は既存のまま） | - |
| `index.html` | 変更なし | - |
| `review.html` | 変更なし | - |

---

## 5. settings.html UI設計

```
┌─────────────────────────────┐
│ 💰 給与計算設定              │
├─────────────────────────────┤
│ 責任出番数: [11]            │
│ 12〜13乗務歩率: [0.62]      │
├─────────────────────────────┤
│ 【歩率テーブル編集】         │
│ 4乗務                         │
│  [0.800] [0〜100,001]       │
│  [0.667] [100,001〜120,001] │
│  [0.571] [120,001〜140,001] │
│      ...（追加ボタン）       │
│                             │
│ 5乗務                         │
│  [0.800] [0〜125,001]       │
│      ...                     │
│                             │
│ 11乗務                        │
│  [0.687] [1,100,001〜]      │
├─────────────────────────────┤
│ 【プレミアムインセンティブ】 │
│ 閾値（税抜）: ¥[80,000]     │
│ 金額: ¥[2,000]/乗務         │
├─────────────────────────────┤
│ [💾 設定を保存]              │
└─────────────────────────────┘
```

---

## 6. 実装ステップ

### Step 1: Firestoreデータ移行（30分）
- 既存 `configs/{userId}` → `userConfigs/{userId}` に移行
- または `userConfigs` を新規作成し、存在しなければ `DEFAULT_CONFIG` をコピー

### Step 2: `firebase-storage.js` 修正（1時間）
```javascript
// getConfig() の変更
export async function getConfig() {
  await waitForAuth();
  const userId = getUserId();
  const ref = doc(db, 'userConfigs', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // 初回: DEFAULT_CONFIG をコピー
    const defaultConfig = { ...DEFAULT_CONFIG };
    await setDoc(ref, defaultConfig);
    return defaultConfig;
  }
  return snap.data();
}
```

### Step 3: `settings.html` に歩率テーブル編集UI追加（2時間）
- 動的に rateTable の行を追加・削除・編集
- 保存時に `saveConfig()` で Firestore に書き込み

---

## 7. 将来拡張（別フェーズ）

| 機能 | 優先度 | 工数 |
|------|--------|------|
| サブスク（Stripe）導入 | 中 | 2〜3日 |
| 車種フィルタ（分析ページ） | 低 | 2時間 |
| 他者データ閲覧設定 | 低 | 1時間 |

---

## 8. 次のアクション

この設計を承認いただければ、即座に実装を開始します。

変更対象は**3ファイルのみ**:
1. `firebase-storage.js`（getConfig/saveConfigのパス変更）
2. `settings.html`（歩率テーブル編集UI追加）
3. `firebase-init.js`（Firestore Rules対応）

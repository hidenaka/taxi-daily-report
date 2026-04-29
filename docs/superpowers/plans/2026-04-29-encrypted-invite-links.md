# 暗号化招待リンクシステム 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 招待URLに生のPATを含めず、暗号化された一時トークン方式で安全に知人を招待できる仕組みを構築する

**Architecture:** AES-GCM暗号化されたPATをデータリポジトリに一時保存（TTL付き）。招待URLにはトークンIDのみ含め、復号キーはURLハッシュフラグメント（サーバー非送信）で渡す。PWA起動時に自動復号・localStorage設定を行う。

**Tech Stack:** Node.js (crypto), GitHub Contents API, Vanilla JS (Web Crypto API)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/generate-invite.js` | 管理者用CLI。PATを暗号化し、データリポジトリに招待ファイルをアップロード。暗号化キーと招待URLを出力。 |
| `js/invite-crypto.js` | PWA用。暗号化データの取得、URLハッシュからの復号、localStorage自動設定。 |
| `index.html` | 起動時に `?invite=CODE` + `#key=SECRET` を検出して `js/invite-crypto.js` を呼び出す。 |

---

## Task 1: 暗号化モジュール（共通）

**Files:**
- Create: `js/crypto-utils.js`
- Test: `tests/crypto-utils.test.js`

- [ ] **Step 1: 暗号化ユーティリティの実装**

`js/crypto-utils.js`:
```javascript
/**
 * 暗号化招待リンク用ユーティリティ
 * AES-GCM + PBKDF2 でPATを暗号化
 */

const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 256;
const ITERATIONS = 100000;

/**
 * パスフレーズからAES-GCM鍵を導出
 */
async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 平文を暗号化。返り値は base64url 文字列。
 */
export async function encrypt(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  // salt + iv + ciphertext を結合して base64url エンコード
  const combined = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LEN);
  combined.set(new Uint8Array(ciphertext), SALT_LEN + IV_LEN);
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * base64url 文字列を復号。
 */
export async function decrypt(cipherBase64url, passphrase) {
  const base64 = cipherBase64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = 4 - (base64.length % 4);
  const padded = padding === 4 ? base64 : base64 + '='.repeat(padding);
  const combined = new Uint8Array([...atob(padded)].map(c => c.charCodeAt(0)));

  const salt = combined.slice(0, SALT_LEN);
  const iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = combined.slice(SALT_LEN + IV_LEN);

  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
```

- [ ] **Step 2: テスト作成**

`tests/crypto-utils.test.js`:
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encrypt, decrypt } from '../js/crypto-utils.js';

describe('crypto-utils', () => {
  it('encrypt/decrypt roundtrip', async () => {
    const plain = 'github_pat_test_12345';
    const passphrase = 'my-secret-key-42';
    const encrypted = await encrypt(plain, passphrase);
    const decrypted = await decrypt(encrypted, passphrase);
    assert.strictEqual(decrypted, plain);
  });

  it('different passphrase fails', async () => {
    const plain = 'github_pat_test_12345';
    const encrypted = await encrypt(plain, 'correct-key');
    await assert.rejects(() => decrypt(encrypted, 'wrong-key'));
  });
});
```

- [ ] **Step 3: テスト実行**

Run: `node --test tests/crypto-utils.test.js`
Expected: 2 tests pass

- [ ] **Step 4: Commit**

```bash
git add js/crypto-utils.js tests/crypto-utils.test.js
git commit -m "feat(crypto): AES-GCM encrypt/decrypt for invite links"
```

---

## Task 2: 管理者用CLIスクリプト

**Files:**
- Create: `scripts/generate-invite.js`

- [ ] **Step 1: CLIスクリプト実装**

`scripts/generate-invite.js`:
```javascript
#!/usr/bin/env node
/**
 * generate-invite.js
 *
 * 管理者用: PATを暗号化してデータリポジトリにアップロードし、安全な招待URLを生成。
 *
 * Usage:
 *   GITHUB_TOKEN=<admin-pat> node scripts/generate-invite.js \
 *     --user mm \
 *     --repo hidenaka/taxi-daily-report-data \
 *     --pat github_pat_xxx \
 *     --ttl-hours 72
 */

import { encrypt } from '../js/crypto-utils.js';
import readline from 'readline';

const API_BASE = 'https://api.github.com';

function generateCode() {
  // 8文字のランダム英数字
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(8));
  for (const v of randomValues) {
    code += chars[v % chars.length];
  }
  return code;
}

function generatePassphrase() {
  // 16文字のランダム英数字
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(16));
  for (const v of randomValues) {
    pass += chars[v % chars.length];
  }
  return pass;
}

async function uploadInvite(repo, token, code, data) {
  const filepath = `data/invites/${code}.json`;
  const content = btoa(JSON.stringify(data, null, 2));
  const url = `${API_BASE}/repos/${repo}/contents/${filepath}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `invite: create encrypted token for user ${data.userId}`,
      content,
      branch: 'main'
    })
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };

  const adminToken = process.env.GITHUB_TOKEN;
  const userId = getArg('--user');
  const repo = getArg('--repo');
  const pat = getArg('--pat');
  const ttlHours = parseInt(getArg('--ttl-hours') || '72', 10);

  if (!adminToken || !userId || !repo || !pat) {
    console.error('Usage: GITHUB_TOKEN=<admin-pat> node scripts/generate-invite.js --user mm --repo owner/repo --pat github_pat_xxx [--ttl-hours 72]');
    process.exit(1);
  }

  const code = generateCode();
  const passphrase = generatePassphrase();

  console.log(`Generating invite for user: ${userId}`);
  console.log(`TTL: ${ttlHours} hours`);

  const encryptedPat = await encrypt(pat, passphrase);

  const inviteData = {
    userId,
    repo,
    encryptedPat,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
  };

  await uploadInvite(repo, adminToken, code, inviteData);

  const appUrl = `https://hidenaka.github.io/taxi-daily-report/`;
  const inviteUrl = `${appUrl}?invite=${code}&user=${userId}&repo=${encodeURIComponent(repo)}#key=${passphrase}`;

  console.log('\n=== INVITE GENERATED ===');
  console.log(`Code: ${code}`);
  console.log(`User: ${userId}`);
  console.log(`Repo: ${repo}`);
  console.log(`Expires: ${inviteData.expiresAt}`);
  console.log('\n=== SEND THIS URL TO USER ===');
  console.log(inviteUrl);
  console.log('\n=== WARNINGS ===');
  console.log('1. This URL contains the decryption key in the hash fragment.');
  console.log('2. Hash fragments are NOT sent to servers, but ARE stored in browser history.');
  console.log('3. Advise the user to clear browser history after setup.');
  console.log('4. The invite file on GitHub will auto-expire but is NOT automatically deleted.');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
chmod +x scripts/generate-invite.js
git add scripts/generate-invite.js
git commit -m "feat(invite): admin CLI to generate encrypted invite links"
```

---

## Task 3: PWA側の復号・自動設定

**Files:**
- Create: `js/invite-crypto.js`
- Modify: `index.html`（起動時のURLパラメータ解析部分に統合）

- [ ] **Step 1: ブラウザ用復号モジュール**

`js/invite-crypto.js`:
```javascript
/**
 * invite-crypto.js
 * PWA起動時: ?invite=CODE + #key=SECRET を検出し、
 * データリポジトリから暗号化PATを取得して復号、localStorageに設定。
 */

import { decrypt } from './crypto-utils.js';
import { getRepo, setMyUserId, getMyUserId } from './storage.js';

const API_BASE = 'https://api.github.com';

/**
 * URLから招待パラメータを抽出
 */
export function parseInviteParams() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('invite');
  const userId = url.searchParams.get('user');
  const repo = url.searchParams.get('repo');
  // ハッシュフラグメントから key を取得 (#key=SECRET)
  const hash = url.hash;
  const keyMatch = hash.match(/key=([^&]+)/);
  const key = keyMatch ? keyMatch[1] : null;

  if (!code || !key) return null;
  return { code, userId, repo, key };
}

/**
 * データリポジトリから招待ファイルを取得
 */
async function fetchInvite(repo, code) {
  // repo が渡されない場合は localStorage から取得
  const targetRepo = repo || getRepo();
  const url = `${API_BASE}/repos/${targetRepo}/contents/data/invites/${code}.json`;
  const token = localStorage.getItem('github_pat'); // 管理者のPATが既にあれば使う

  const headers = { 'Accept': 'application/vnd.github+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.status === 404) {
    throw new Error('招待コードが無効か、期限切れです。');
  }
  if (!res.ok) {
    throw new Error(`招待情報の取得に失敗: ${res.status}`);
  }

  const data = await res.json();
  const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
  return content;
}

/**
 * 招待を処理してlocalStorageに設定
 */
export async function processInvite() {
  const params = parseInviteParams();
  if (!params) return false;

  const { code, userId, repo, key } = params;
  console.log('[Invite] Processing invite code:', code);

  try {
    const inviteData = await fetchInvite(repo, code);

    // 期限切れチェック
    if (new Date(inviteData.expiresAt) < new Date()) {
      throw new Error('招待の有効期限が切れています。');
    }

    // PATを復号
    const pat = await decrypt(inviteData.encryptedPat, key);

    // localStorageに設定
    localStorage.setItem('github_pat', pat);
    if (userId) {
      setMyUserId(userId);
    } else if (inviteData.userId) {
      setMyUserId(inviteData.userId);
    }
    if (repo) {
      localStorage.setItem('data_repo', repo);
    } else if (inviteData.repo) {
      localStorage.setItem('data_repo', inviteData.repo);
    }

    // URLから機密情報を消去
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('invite');
    cleanUrl.searchParams.delete('user');
    cleanUrl.searchParams.delete('repo');
    cleanUrl.hash = '';
    window.history.replaceState({}, document.title, cleanUrl.toString());

    console.log('[Invite] Setup complete for user:', getMyUserId());
    return true;
  } catch (err) {
    console.error('[Invite] Failed:', err.message);
    alert('招待リンクの処理に失敗しました: ' + err.message);
    return false;
  }
}
```

- [ ] **Step 2: index.html に統合**

既存のURLパラメータ解析部分（`?pat=...`）を残したまま、暗号化招待方式を追加。

`index.html` の起動処理に追加:
```javascript
import { processInvite } from './js/invite-crypto.js';

// ... existing code ...

async function init() {
  // 1. 招待リンク処理（優先）
  const inviteProcessed = await processInvite();
  if (inviteProcessed) {
    showToast('招待設定が完了しました');
  }

  // 2. 従来の直接PAT方式（フォールバック）
  if (!inviteProcessed) {
    const url = new URL(window.location.href);
    const pat = url.searchParams.get('pat');
    if (pat) {
      localStorage.setItem('github_pat', pat);
      // ... existing auto-setup code ...
    }
  }

  // ... rest of init ...
}
```

- [ ] **Step 3: Commit**

```bash
git add js/invite-crypto.js index.html
git commit -m "feat(invite): PWA auto-setup from encrypted invite links"
```

---

## Task 4: テストと動作確認

- [ ] **Step 1: ユニットテスト実行**

Run: `npm test`
Expected: All tests pass (crypto-utils tests included)

- [ ] **Step 2: Dry-runで招待コード生成テスト**

```bash
node scripts/generate-invite.js --user test --repo hidenaka/taxi-daily-report-data --pat github_pat_test --ttl-hours 1 --dry-run
```

- [ ] **Step 3: 手動E2Eテスト（管理者）**

1. 管理者PATで招待コード生成:
   ```bash
   GITHUB_TOKEN=<admin-pat> node scripts/generate-invite.js --user mm --repo hidenaka/taxi-daily-report-data --pat github_pat_11APQBT... --ttl-hours 72
   ```
2. 出力されたURLをSafariで開く
3. localStorageに `github_pat`, `userId`, `data_repo` が設定されることを確認
4. URLから `?invite=...` と `#key=...` が消えていることを確認

- [ ] **Step 4: Commit & Push**

```bash
git push origin main
```

---

## Spec Coverage Check

| Requirement | Task |
|------------|------|
| PATを暗号化してURLに含めない | Task 1 (AES-GCM), Task 2 (CLI暗号化) |
| 復号キーはサーバーに送信しない | Task 3 (URL hash fragment) |
| 有効期限付きの一時トークン | Task 2 (expiresAt field) |
| PWA起動時に自動設定 | Task 3 (processInvite) |
| URLから機密情報を消去 | Task 3 (history.replaceState) |
| 既存の直接PAT方式も維持 | Task 3 (フォールバック) |

## Placeholder Scan

- なし。全ステップに完全なコードを含める。

## Type Consistency

- `encrypt(plaintext: string, passphrase: string): Promise<string>`
- `decrypt(cipherBase64url: string, passphrase: string): Promise<string>`
- `processInvite(): Promise<boolean>`

全て一致。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-29-encrypted-invite-links.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

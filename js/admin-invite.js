/**
 * admin-invite.js
 * ブラウザ上で招待リンクを生成（管理者専用）
 */

import { encrypt } from './crypto-utils.js';
import { getRepo, getMyUserId } from './storage.js';

const API_BASE = 'https://api.github.com';

function getToken() {
  return localStorage.getItem('github_token');
}

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error('GitHub token未設定');
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(8));
  for (const v of randomValues) {
    code += chars[v % chars.length];
  }
  return code;
}

function generatePassphrase() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(16));
  for (const v of randomValues) {
    pass += chars[v % chars.length];
  }
  return pass;
}

function getBaseUrl() {
  // 現在のページURLからベースURLを推定
  const url = new URL(window.location.href);
  url.pathname = url.pathname.replace(/\/[^\/]*$/, '/');
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function generateInvite({ userId, pat, ttlHours, repo }) {
  const code = generateCode();
  const passphrase = generatePassphrase();
  const targetRepo = repo || getRepo();

  if (!targetRepo) throw new Error('データリポジトリが設定されていません');
  if (!isValidUserId(userId)) throw new Error('userIdの形式が不正です');
  if (!pat) throw new Error('PATを入力してください');

  // 有効期限
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  // PATを暗号化
  const encryptedPat = await encrypt(pat, passphrase);

  // 招待データ
  const inviteData = {
    userId,
    repo: targetRepo,
    encryptedPat,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  // GitHubにアップロード
  const filepath = `data/invites/${code}.json`;
  const content = btoa(JSON.stringify(inviteData, null, 2));

  const res = await fetch(`${API_BASE}/repos/${targetRepo}/contents/${filepath}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      message: `invite: create encrypted token for user ${userId}`,
      content,
      branch: 'main'
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`アップロード失敗: ${res.status} ${err.slice(0, 200)}`);
  }

  // 招待URL生成
  const baseUrl = getBaseUrl();
  const inviteUrl = `${baseUrl}?invite=${code}&user=${userId}&repo=${targetRepo}#key=${passphrase}`;

  return { inviteUrl, code, expiresAt };
}

function isValidUserId(id) {
  return typeof id === 'string' && /^[a-z][a-z0-9_]*$/.test(id);
}

// ユーザー一覧取得
export async function fetchUsers() {
  const repo = getRepo();
  if (!repo) return [];
  try {
    const res = await fetch(`${API_BASE}/repos/${repo}/contents/data/users.json`, {
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return content.users || [];
  } catch (e) {
    console.error('users.json取得失敗:', e);
    return [];
  }
}

/**
 * invite-crypto.js
 * PWA起動時: ?invite=CODE + #key=SECRET を検出し、
 * データリポジトリから暗号化PATを取得して復号、localStorageに設定。
 */

import { decrypt } from './crypto-utils.js';
import { getRepo, setMyUserId } from './storage.js';

const API_BASE = 'https://api.github.com';

export function parseInviteParams() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('invite');
  const userId = url.searchParams.get('user');
  const repo = url.searchParams.get('repo');
  const hash = url.hash;
  const keyMatch = hash.match(/key=([^&]+)/);
  const key = keyMatch ? keyMatch[1] : null;

  if (!code || !key) return null;
  return { code, userId, repo, key };
}

async function fetchInvite(repo, code) {
  const targetRepo = repo || getRepo();
  const url = `${API_BASE}/repos/${targetRepo}/contents/data/invites/${code}.json`;
  const token = localStorage.getItem('github_token');

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

export async function processInvite() {
  const params = parseInviteParams();
  if (!params) return false;

  const { code, userId, repo, key } = params;
  console.log('[Invite] Processing invite code:', code);

  try {
    const inviteData = await fetchInvite(repo, code);

    if (new Date(inviteData.expiresAt) < new Date()) {
      throw new Error('招待の有効期限が切れています。');
    }

    const pat = await decrypt(inviteData.encryptedPat, key);

    // GitHub版は廃止: token/repo は保存しない
    console.log('[Invite] GitHub版は廃止されました。Firebase版をご利用ください。');
    if (userId) {
      setMyUserId(userId);
    } else if (inviteData.userId) {
      setMyUserId(inviteData.userId);
    }
    // repo 情報は不要

    // URLから機密情報を消去
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('invite');
    cleanUrl.searchParams.delete('user');
    cleanUrl.searchParams.delete('repo');
    cleanUrl.hash = '';
    window.history.replaceState({}, document.title, cleanUrl.toString());

    console.log('[Invite] Setup complete for user:', userId || inviteData.userId);
    return true;
  } catch (err) {
    console.error('[Invite] Failed:', err.message);
    alert('招待リンクの処理に失敗しました: ' + err.message);
    return false;
  }
}

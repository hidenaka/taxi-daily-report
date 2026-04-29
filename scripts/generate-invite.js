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

import { encrypt, decrypt } from '../js/crypto-utils.js';

const API_BASE = 'https://api.github.com';

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

async function uploadInvite(repo, token, code, data) {
  const filepath = `data/invites/${code}.json`;
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');
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

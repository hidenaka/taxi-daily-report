#!/usr/bin/env node
// users.json を {users: [...]} 形式に修復する。
// user_self(displayName: "自分") と user_mm(displayName: "mm") を含めて active: true で書く。
// 既存のflat array形式・破損形式どれでも上書き対応。

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DATA_REPO = process.env.DATA_REPO;
if (!GITHUB_TOKEN || !DATA_REPO) {
  console.error('GITHUB_TOKEN と DATA_REPO 環境変数が必要です');
  process.exit(1);
}

const REQUIRED_USERS = [
  { userId: 'user_self', displayName: '自分', active: true },
  { userId: 'user_mm', displayName: 'mm', active: true }
];

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'repair-users' }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function ghPut(path, obj, message, sha) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(obj, null, 2)).toString('base64'),
    ...(sha ? { sha } : {})
  };
  const res = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'repair-users',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const path = 'data/users.json';
const existing = await ghGet(path);
const sha = existing?.sha || null;
let priorJson = null;
if (existing) {
  try {
    priorJson = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf-8'));
  } catch {
    priorJson = null;
  }
}
const newObj = { users: REQUIRED_USERS };
console.log('修復前:', JSON.stringify(priorJson));
console.log('修復後:', JSON.stringify(newObj));
await ghPut(path, newObj, 'repair: users.json to {users:[...]} format', sha);
console.log('✓ users.json 上書き完了');

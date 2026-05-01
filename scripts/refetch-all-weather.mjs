#!/usr/bin/env node
// 全乗務データの天候を新ロジックで一括再取得し、上書き保存する一回限りのメンテナンス用スクリプト。
//
// 環境変数:
//   GITHUB_TOKEN  ... GitHub Personal Access Token（contents: write 権限）
//   DATA_REPO     ... "owner/repo" 形式
//   USER_ID       ... 対象ユーザーID（省略時は全 active ユーザー）
//   DRY_RUN       ... "1" にすると保存せず差分だけ表示
//
// 使い方:
//   GITHUB_TOKEN=ghp_xxx DATA_REPO=hidenaka/taxi-daily-report-data USER_ID=user_self \
//     node scripts/refetch-all-weather.mjs
//   GITHUB_TOKEN=... DATA_REPO=... DRY_RUN=1 node scripts/refetch-all-weather.mjs

import { fetchWeatherForDate } from '../js/weather.js';

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.DATA_REPO;
const USER_FILTER = process.env.USER_ID;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!TOKEN || !REPO) {
  console.error('GITHUB_TOKEN と DATA_REPO は必須');
  process.exit(1);
}

const API = 'https://api.github.com';
const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

async function ghJson(path) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function getFileContent(path) {
  const r = await ghJson(path);
  if (!r) return null;
  const decoded = Buffer.from(r.content, 'base64').toString('utf-8');
  return { content: JSON.parse(decoded), sha: r.sha };
}

async function listDir(path) {
  const r = await ghJson(path);
  return r || [];
}

async function putFileContent(path, jsonObj, sha, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(jsonObj, null, 2), 'utf-8').toString('base64'),
    sha
  };
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listUsers() {
  if (USER_FILTER) return [USER_FILTER];
  const usersFile = await getFileContent('data/users.json');
  if (!usersFile?.content?.users) return [];
  return usersFile.content.users.filter(u => u.active === true).map(u => u.userId);
}

async function getConfig(userId) {
  const f = await getFileContent(`data/config/${userId}.json`);
  return f?.content || null;
}

async function refetchUser(userId) {
  const config = await getConfig(userId);
  if (!config?.weatherLocation) {
    console.log(`[${userId}] 天候取得地点未設定 — スキップ`);
    return { processed: 0, updated: 0, failed: 0 };
  }
  const dir = `data/drives/${userId}`;
  const files = await listDir(dir);
  const driveFiles = files.filter(f => f.name?.endsWith('.json'));
  console.log(`[${userId}] ${driveFiles.length} 乗務を処理 (location: ${config.weatherLocation.name || `${config.weatherLocation.lat},${config.weatherLocation.lon}`})`);

  let processed = 0, updated = 0, failed = 0;
  for (const f of driveFiles) {
    processed++;
    const driveFile = await getFileContent(f.path);
    if (!driveFile) { failed++; continue; }
    const drive = driveFile.content;
    try {
      const weather = await fetchWeatherForDate(drive.date, config.weatherLocation);
      const before = drive.weather ? `${drive.weather.morning?.label || '-'}/${drive.weather.noon?.label || '-'}/${drive.weather.evening?.label || '-'}/${drive.weather.night?.label || '-'}` : 'none';
      const after = `${weather.morning.label}/${weather.noon.label}/${weather.evening.label}/${weather.night.label}`;
      const changed = before !== after;
      console.log(`  ${drive.date} ${changed ? '*' : ' '} ${before}  →  ${after}`);
      if (!DRY_RUN) {
        drive.weather = weather;
        drive.updatedAt = new Date().toISOString();
        await putFileContent(f.path, drive, driveFile.sha, `refetch weather ${drive.date}`);
        updated++;
      } else if (changed) {
        updated++;
      }
      // open-meteo のレート制限を避ける軽い間引き
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.error(`  ${drive.date} ✗ ${e.message}`);
      failed++;
    }
  }
  return { processed, updated, failed };
}

(async () => {
  const userIds = await listUsers();
  console.log(`対象ユーザー: ${userIds.join(', ')} ${DRY_RUN ? '(DRY-RUN)' : ''}`);
  let total = { processed: 0, updated: 0, failed: 0 };
  for (const u of userIds) {
    const r = await refetchUser(u);
    total.processed += r.processed; total.updated += r.updated; total.failed += r.failed;
  }
  console.log(`\n完了: ${total.processed}件処理 / ${total.updated}件${DRY_RUN ? '差分あり' : '更新'} / ${total.failed}件失敗`);
})().catch(e => { console.error(e); process.exit(1); });

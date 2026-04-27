#!/usr/bin/env node
// 管理者向け 知人データ bulk push スクリプト
// 環境変数: GITHUB_TOKEN, DATA_REPO (owner/repo)
// 使用例:
//   node scripts/admin-bulk-push.mjs --user user_a --display "Aさん"
//   node scripts/admin-bulk-push.mjs --user user_a --display "Aさん" --override 2026-01-20:premium

import { readFileSync } from 'fs';
import { parseFormattedReport } from '../js/parser.js';
import { isValidUserId } from '../js/userid.js';

export function parseOverrides(s) {
  if (!s) return {};
  const o = {};
  for (const seg of s.split(',')) {
    const [date, vehicle] = seg.split(':');
    if (!date || !vehicle) continue;
    o[date.trim()] = vehicle.trim();
  }
  return o;
}

export function parseArgs(argv) {
  const r = { userId: null, displayName: null, pastePath: 'data/paste-here.txt', overrides: {}, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user') r.userId = argv[++i];
    else if (a === '--display') r.displayName = argv[++i];
    else if (a === '--paste') r.pastePath = argv[++i];
    else if (a === '--override') r.overrides = parseOverrides(argv[++i]);
    else if (a === '--dry-run') r.dryRun = true;
  }
  if (!r.userId) throw new Error('--user is required');
  if (!r.displayName) throw new Error('--display is required');
  if (!isValidUserId(r.userId)) throw new Error(`invalid userId: ${r.userId}`);
  return r;
}

export function mergeUsers(existing, newUser) {
  let users = [];
  if (existing == null) users = [];
  else if (Array.isArray(existing)) users = existing.slice();
  else if (Array.isArray(existing.users)) users = existing.users.slice();
  const idx = users.findIndex(u => u.userId === newUser.userId);
  if (idx >= 0) users[idx] = { ...users[idx], ...newUser };
  else users.push(newUser);
  return { users };
}

function splitReports(t) {
  const lines = t.split('\n');
  const sections = [];
  let cur = [];
  for (const line of lines) {
    if (/^日付:\s*\d{4}-\d{2}-\d{2}/.test(line) && cur.length > 0) {
      sections.push(cur.join('\n').trim());
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) sections.push(cur.join('\n').trim());
  return sections.filter(s => s);
}

function normalizeSection(s) {
  const lines = s.split('\n');
  const m = lines[0].match(/^日付:\s*(\S*)\s+車種:\s*(\S*)?\s+出庫:\s*(\S*)\s+帰庫:\s*(\S*)\s*$/);
  if (!m) return s;
  const [, date, vehicle, dep, ret] = m;
  const head = `日付: ${date}\n車種: ${vehicle || ''}\n出庫: ${dep}\n帰庫: ${ret}\n---`;
  return [head, ...lines.slice(1)].join('\n');
}

function inferVehicleType(trips) {
  if (!trips || trips.length === 0) return 'japantaxi';
  // 「ア」(アプリ配車) が1件でもあれば必ず japantaxi
  if (trips.some(t => t.pickupKind === 'ア')) return 'japantaxi';
  const pickupCount = trips.filter(t => t.isPickup).length;
  return (pickupCount / trips.length) >= 0.7 ? 'premium' : 'japantaxi';
}

const DATA_REPO = process.env.DATA_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'admin-bulk-push' }
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
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'admin-bulk-push', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ensureUser(userId, displayName) {
  const path = 'data/users.json';
  const existing = await ghGet(path);
  let priorObj = null;
  let sha = null;
  if (existing) {
    sha = existing.sha;
    try { priorObj = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf-8')); } catch { priorObj = null; }
  }
  const merged = mergeUsers(priorObj, { userId, displayName, active: true });
  await ghPut(path, merged, `add/update ${userId} in users.json`, sha);
  console.log(`✓ users.json に ${userId} を登録/更新`);
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts.dryRun && (!GITHUB_TOKEN || !DATA_REPO)) {
    throw new Error('GITHUB_TOKEN と DATA_REPO 環境変数が必要です(--dry-run でスキップ可能)');
  }
  const text = readFileSync(opts.pastePath, 'utf-8');
  const sections = splitReports(text);
  console.log(`[1/4] ${sections.length} セクション読み込み (paste=${opts.pastePath})`);

  const drives = [];
  for (const sec of sections) {
    const parsed = parseFormattedReport(normalizeSection(sec));
    let vehicleType = parsed.vehicleType || inferVehicleType(parsed.trips);
    if (opts.overrides[parsed.date]) vehicleType = opts.overrides[parsed.date];
    drives.push({
      date: parsed.date,
      vehicleType,
      departureTime: parsed.departureTime,
      returnTime: parsed.returnTime,
      trips: parsed.trips,
      rests: parsed.rests
    });
  }

  // 重複排除
  const byDate = {};
  for (const d of drives) { (byDate[d.date] ||= []).push(d); }
  const finalDrives = [];
  const conflicts = [];
  for (const [date, arr] of Object.entries(byDate)) {
    if (arr.length === 1) { finalDrives.push(arr[0]); continue; }
    const same = arr.every(x =>
      JSON.stringify(x.trips) === JSON.stringify(arr[0].trips) &&
      x.departureTime === arr[0].departureTime &&
      x.returnTime === arr[0].returnTime
    );
    if (same) { finalDrives.push(arr[0]); console.log(`  ↪ ${date}: 完全一致重複→1つに統合`); }
    else { conflicts.push(date); }
  }
  if (conflicts.length) {
    console.error(`★ 相違ある重複: ${conflicts.join(', ')} → push中止`);
    process.exit(1);
  }
  console.log(`[2/4] ${finalDrives.length} 日に集約 (premium=${finalDrives.filter(d => d.vehicleType === 'premium').length}, japantaxi=${finalDrives.filter(d => d.vehicleType === 'japantaxi').length})`);

  if (opts.dryRun) console.log('[dry-run] users.json チェックスキップ予定');
  else await ensureUser(opts.userId, opts.displayName);
  console.log(`[3/4] users.json チェック完了`);

  console.log(`[4/4] push 開始 (${opts.dryRun ? 'DRY-RUN' : 'LIVE'})`);
  let ok = 0, fail = 0;
  for (const d of finalDrives) {
    const path = `data/drives/${opts.userId}/${d.date}.json`;
    if (opts.dryRun) {
      console.log(`[dry-run] PUT ${path} (vehicleType=${d.vehicleType}, trips=${d.trips.length})`);
      ok++;
      continue;
    }
    try {
      const existing = await ghGet(path);
      const sha = existing?.sha || null;
      const msg = sha ? `update drive ${opts.userId}/${d.date}` : `add drive ${opts.userId}/${d.date}`;
      await ghPut(path, d, msg, sha);
      console.log(`✓ ${d.date} (${d.vehicleType}, ${d.trips.length}件)`);
      ok++;
    } catch (e) {
      console.error(`✗ ${d.date}: ${e.message}`);
      fail++;
    }
  }
  console.log('');
  console.log(`完了: 成功 ${ok} / 失敗 ${fail}`);
}

import { pathToFileURL } from 'url';
import { realpathSync } from 'fs';
const isMain = (() => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
})();
if (isMain) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });
}

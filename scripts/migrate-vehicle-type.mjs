#!/usr/bin/env node
/**
 * migrate-vehicle-type.mjs
 *
 * 既存の data/drives/{userId}/*.json 内の vehicleType を
 *   "regular" → "japantaxi"
 * に書き換える。冪等。
 *
 * 実行:
 *   GITHUB_TOKEN=$(gh auth token) DATA_REPO=hidenaka/taxi-daily-report-data \
 *     node scripts/migrate-vehicle-type.mjs
 *   --dry-run で変更プレビュー
 */

const API = 'https://api.github.com';
const SLEEP_MS = 100;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function handleRateLimit(res) {
  const reset = res.headers.get('X-RateLimit-Reset');
  if (reset) {
    const wait = Math.max(parseInt(reset, 10) * 1000 - Date.now() + 1000, 1000);
    console.warn(`[rate-limit] ${Math.ceil(wait / 1000)}秒待機...`);
    await sleep(wait);
  } else {
    await sleep(60_000);
  }
}

async function ghReq(repo, token, path, init = {}) {
  const url = `${API}/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(init.headers || {}),
  };
  let retries = 0;
  while (true) {
    const res = await fetch(url, { ...init, headers });
    await sleep(SLEEP_MS);
    if (res.status === 404) return { status: 404 };
    if (res.status === 403 || res.status === 429) {
      if (retries++ >= 3) throw new Error(`rate limit exhausted: ${path}`);
      await handleRateLimit(res);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${path}: ${await res.text()}`);
    return { status: res.status, body: await res.json() };
  }
}

async function listDir(repo, token, dir) {
  const r = await ghReq(repo, token, dir);
  if (r.status === 404) return [];
  return r.body;
}

async function getFile(repo, token, path) {
  const r = await ghReq(repo, token, path);
  if (r.status === 404) return null;
  return { base64: r.body.content.replace(/\n/g, ''), sha: r.body.sha };
}

async function putFile(repo, token, path, base64, message, sha) {
  const body = JSON.stringify({ message, content: base64, ...(sha ? { sha } : {}) });
  await ghReq(repo, token, path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function parseConfig() {
  const args = process.argv.slice(2);
  let token = process.env.GITHUB_TOKEN || null;
  let repo = process.env.DATA_REPO || null;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' && args[i + 1]) token = args[++i];
    else if (args[i] === '--repo' && args[i + 1]) repo = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
  }
  return { token, repo, dryRun };
}

async function main() {
  const { token, repo, dryRun } = parseConfig();
  if (!token || !repo) {
    console.error('GITHUB_TOKEN と DATA_REPO が必要');
    process.exit(1);
  }

  console.log(`vehicleType migration: regular → japantaxi (repo=${repo})${dryRun ? ' [DRY RUN]' : ''}`);

  // data/drives/ 配下のユーザーディレクトリを列挙
  const root = await listDir(repo, token, 'data/drives');
  const userDirs = root.filter(e => e.type === 'dir');
  console.log(`ユーザー数: ${userDirs.length}`);

  let scanned = 0, updated = 0, alreadyOk = 0, errors = 0;

  for (const ud of userDirs) {
    const files = await listDir(repo, token, ud.path);
    const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));
    console.log(`\n[${ud.name}] ${jsonFiles.length} files`);

    for (let i = 0; i < jsonFiles.length; i++) {
      const f = jsonFiles[i];
      try {
        const src = await getFile(repo, token, f.path);
        if (!src) { errors++; continue; }
        const txt = Buffer.from(src.base64, 'base64').toString('utf-8');
        scanned++;
        let obj;
        try { obj = JSON.parse(txt); } catch { console.error(`  ${f.name} parse error`); errors++; continue; }

        if (obj.vehicleType === 'japantaxi' || (obj.vehicleType !== 'regular' && obj.vehicleType !== undefined)) {
          alreadyOk++;
          continue;
        }
        if (obj.vehicleType !== 'regular') {
          // undefined等は触らない
          alreadyOk++;
          continue;
        }

        obj.vehicleType = 'japantaxi';
        const newTxt = JSON.stringify(obj, null, 2);
        const newB64 = Buffer.from(newTxt, 'utf-8').toString('base64');

        if (dryRun) {
          console.log(`  [DRY] ${f.name} regular → japantaxi`);
          updated++;
          continue;
        }
        await putFile(repo, token, f.path, newB64, `migrate: vehicleType regular → japantaxi (${ud.name}/${f.name})`, src.sha);
        console.log(`  ✓ ${f.name}`);
        updated++;
      } catch (e) {
        console.error(`  ✗ ${f.name}: ${e.message}`);
        errors++;
      }
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`scanned: ${scanned} / updated: ${updated} / already ok: ${alreadyOk} / errors: ${errors}`);
  console.log('========================================');
  if (errors > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });

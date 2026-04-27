#!/usr/bin/env node
/**
 * migrate-to-userid.mjs
 *
 * GitHub Contents API 経由でデータリポのファイルを user_self/ 配下に移行する。
 * 元ファイルは削除しない（ロールバック保険）。
 * 冪等: 既に新パスにファイルが存在する場合はスキップ。
 *
 * 実行方法:
 *   GITHUB_TOKEN=ghp_xxx DATA_REPO=username/taxi-daily-report-data node scripts/migrate-to-userid.mjs
 * または:
 *   node scripts/migrate-to-userid.mjs --token ghp_xxx --repo username/taxi-daily-report-data
 */

const API_BASE = 'https://api.github.com';
const SLEEP_MS = 100; // rate limit 配慮: リクエスト間 100ms

// ─── ユーティリティ ──────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * rate limit 超過時に X-RateLimit-Reset まで待機する。
 * @param {Response} res
 */
async function handleRateLimit(res) {
  const reset = res.headers.get('X-RateLimit-Reset');
  if (reset) {
    const waitUntil = parseInt(reset, 10) * 1000;
    const now = Date.now();
    const waitMs = Math.max(waitUntil - now + 1000, 1000); // 1秒余裕
    console.warn(`[rate-limit] 429/403 受信。${Math.ceil(waitMs / 1000)}秒後に再開...`);
    await sleep(waitMs);
  } else {
    // ヘッダーが無い場合は60秒待機
    console.warn('[rate-limit] X-RateLimit-Reset ヘッダーなし。60秒待機...');
    await sleep(60_000);
  }
}

// ─── GitHub API 関数群 ───────────────────────────────────────────

/**
 * ディレクトリ内のファイル一覧を取得する。
 * @param {string} repo  例: "username/taxi-daily-report-data"
 * @param {string} token GitHub PAT
 * @param {string} dir   例: "data/drives"
 * @returns {Array<{name: string, path: string, sha: string, type: string}>}
 */
async function listFiles(repo, token, dir) {
  const url = `${API_BASE}/repos/${repo}/contents/${dir}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let retries = 0;
  while (true) {
    const res = await fetch(url, { headers });
    await sleep(SLEEP_MS);

    if (res.status === 404) return [];
    if (res.status === 403 || res.status === 429) {
      if (retries >= 3) throw new Error(`listFiles: rate limit retries exhausted for ${dir}`);
      retries++;
      await handleRateLimit(res);
      continue;
    }
    if (!res.ok) throw new Error(`listFiles: HTTP ${res.status} for ${dir}`);
    return res.json();
  }
}

/**
 * 単一ファイルの raw content (base64) と sha を取得する。
 * ファイルが存在しない場合は null を返す。
 * @returns {{ base64: string, sha: string } | null}
 */
async function getFile(repo, token, path) {
  const url = `${API_BASE}/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let retries = 0;
  while (true) {
    const res = await fetch(url, { headers });
    await sleep(SLEEP_MS);

    if (res.status === 404) return null;
    if (res.status === 403 || res.status === 429) {
      if (retries >= 3) throw new Error(`getFile: rate limit retries exhausted for ${path}`);
      retries++;
      await handleRateLimit(res);
      continue;
    }
    if (!res.ok) throw new Error(`getFile: HTTP ${res.status} for ${path}`);

    const data = await res.json();
    // GitHub は改行入り base64 を返すので除去する
    const base64 = data.content.replace(/\n/g, '');
    return { base64, sha: data.sha };
  }
}

/**
 * ファイルを作成する（新規のみ）。
 * sha を渡さなければ新規作成。既存ファイルへの sha なし PUT は 422 になる。
 * @param {string} base64  元ファイルの content をそのまま流用
 * @param {string} message コミットメッセージ
 */
async function putFile(repo, token, path, base64, message) {
  const url = `${API_BASE}/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({ message, content: base64 });

  let retries = 0;
  while (true) {
    const res = await fetch(url, { method: 'PUT', headers, body });
    await sleep(SLEEP_MS);

    if (res.status === 403 || res.status === 429) {
      if (retries >= 3) throw new Error(`putFile: rate limit retries exhausted for ${path}`);
      retries++;
      await handleRateLimit(res);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`putFile: HTTP ${res.status} for ${path}: ${text}`);
    }
    return res.json();
  }
}

// ─── マイグレーション処理 ────────────────────────────────────────

/**
 * 引数・環境変数から token / repo を取得する。
 * 無ければ null を返す。
 */
function parseConfig() {
  const args = process.argv.slice(2);
  let token = process.env.GITHUB_TOKEN || null;
  let repo = process.env.DATA_REPO || null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' && args[i + 1]) token = args[++i];
    if (args[i] === '--repo' && args[i + 1]) repo = args[++i];
  }

  return { token, repo };
}

/**
 * メイン処理
 */
async function main() {
  const { token, repo } = parseConfig();

  // ─── バリデーション
  if (!token || !repo) {
    console.error(
      'エラー: GITHUB_TOKEN と DATA_REPO が必要です。\n' +
        '  GITHUB_TOKEN=ghp_xxx DATA_REPO=username/taxi-daily-report-data node scripts/migrate-to-userid.mjs\n' +
        'または\n' +
        '  node scripts/migrate-to-userid.mjs --token ghp_xxx --repo username/taxi-daily-report-data'
    );
    process.exit(1);
  }

  console.log(`マイグレーション開始: repo=${repo}`);
  console.log('');

  let copied = 0;
  let skipped = 0;
  let errors = 0;

  // ─── Step 1: data/drives/ 直下の .json ファイルを user_self/ にコピー
  console.log('=== [1/3] data/drives/*.json → data/drives/user_self/ ===');

  let driveFiles;
  try {
    const allEntries = await listFiles(repo, token, 'data/drives');
    // type === 'file' かつ .json のみ対象（user_self/ などのディレクトリは除外）
    driveFiles = allEntries.filter(e => e.type === 'file' && e.name.endsWith('.json'));
  } catch (err) {
    console.error(`致命的エラー: data/drives の一覧取得失敗: ${err.message}`);
    console.error('token または repo が無効な可能性があります。');
    process.exit(1);
  }

  console.log(`対象ファイル数: ${driveFiles.length}`);

  for (let i = 0; i < driveFiles.length; i++) {
    const file = driveFiles[i];
    const srcPath = file.path; // 例: data/drives/2026-04-01.json
    const destPath = `data/drives/user_self/${file.name}`;
    const progress = `[${i + 1}/${driveFiles.length}]`;

    try {
      // 冪等チェック: 新パスが既に存在するか
      const existing = await getFile(repo, token, destPath);
      if (existing !== null) {
        console.log(`${progress} ${file.name} SKIP (既に存在)`);
        skipped++;
        continue;
      }

      // 元ファイルの content を取得
      const src = await getFile(repo, token, srcPath);
      if (src === null) {
        console.warn(`${progress} ${file.name} WARN (元ファイルが見つからない、スキップ)`);
        skipped++;
        continue;
      }

      // 新パスに作成
      await putFile(
        repo,
        token,
        destPath,
        src.base64,
        `migrate: copy ${file.name} to user_self/`
      );
      console.log(`${progress} ${file.name} copied`);
      copied++;
    } catch (err) {
      console.error(`${progress} ${file.name} ERROR: ${err.message}`);
      errors++;
      // 個別失敗は続行
    }
  }

  // ─── Step 2: data/config.json → data/config/user_self.json
  console.log('');
  console.log('=== [2/3] data/config.json → data/config/user_self.json ===');

  try {
    const configSrc = await getFile(repo, token, 'data/config.json');
    if (configSrc === null) {
      console.log('data/config.json が存在しない。スキップ。');
    } else {
      const configDest = await getFile(repo, token, 'data/config/user_self.json');
      if (configDest !== null) {
        console.log('data/config/user_self.json SKIP (既に存在)');
        skipped++;
      } else {
        await putFile(
          repo,
          token,
          'data/config/user_self.json',
          configSrc.base64,
          'migrate: copy config.json to config/user_self.json'
        );
        console.log('data/config/user_self.json copied');
        copied++;
      }
    }
  } catch (err) {
    console.error(`config コピーエラー: ${err.message}`);
    errors++;
  }

  // ─── Step 3: data/users.json を新規作成
  console.log('');
  console.log('=== [3/3] data/users.json 作成 ===');

  try {
    const usersExisting = await getFile(repo, token, 'data/users.json');
    if (usersExisting !== null) {
      console.log('data/users.json SKIP (既に存在)');
      skipped++;
    } else {
      const usersContent = JSON.stringify(
        {
          users: [{ userId: 'user_self', displayName: '自分', active: true }],
        },
        null,
        2
      );
      // Node.js 18+ の btoa は latin1 しか扱えないので Buffer を使う
      const base64 = Buffer.from(usersContent, 'utf-8').toString('base64');
      await putFile(
        repo,
        token,
        'data/users.json',
        base64,
        'migrate: create users.json for multi-user support'
      );
      console.log('data/users.json created');
      copied++;
    }
  } catch (err) {
    console.error(`users.json 作成エラー: ${err.message}`);
    errors++;
  }

  // ─── サマリ
  console.log('');
  console.log('========================================');
  console.log(`マイグレーション完了`);
  console.log(`  コピー  : ${copied} 件`);
  console.log(`  スキップ: ${skipped} 件`);
  console.log(`  エラー  : ${errors} 件`);
  console.log('========================================');

  if (errors > 0) {
    console.error(`${errors} 件のエラーが発生しました。上記ログを確認してください。`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});

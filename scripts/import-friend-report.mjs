#!/usr/bin/env node
/**
 * import-friend-report.mjs
 *
 * 知人から送られたタクシー日報の写真を codex CLI で OCR + 構造化し、
 * GitHub data リポの data/drives/{userId}/{date}.json に保存する。
 *
 * 使い方:
 *   GITHUB_TOKEN=ghp_xxx DATA_REPO=owner/repo \
 *     node scripts/import-friend-report.mjs --user user_a --photo /path/to/p1.jpg
 *
 *   # 複数写真
 *   node scripts/import-friend-report.mjs --user user_a --photo p1.jpg --photo p2.jpg
 *
 *   # 日付を明示
 *   node scripts/import-friend-report.mjs --user user_a --photo p.jpg --date 2026-04-26
 *
 *   # dry-run（GitHub push しない）
 *   node scripts/import-friend-report.mjs --user user_a --photo p.jpg --dry-run
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const execFileAsync = promisify(execFile);

// ─── パス定義 ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const PROMPT_FILE = resolve(__dirname, 'prompts/friend-report.md');
const PARSER_PATH = resolve(REPO_ROOT, 'js/parser.js');

const API_BASE = 'https://api.github.com';
const SLEEP_MS = 200;

// ─── ユーティリティ ───────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function usage() {
  console.error(`
使い方:
  node scripts/import-friend-report.mjs --user <userId> --photo <path> [--photo <path>...] [options]

必須:
  --user  <userId>      ユーザーID (英小文字始まり、英小文字・数字・アンダースコアのみ)
  --photo <path>        日報写真のパス (複数指定可)

オプション:
  --date  <YYYY-MM-DD>  日付を明示 (省略時は OCR 結果から推定)
  --dry-run             GitHub に push せずに変換結果を表示

環境変数 (dry-run 以外では必須):
  GITHUB_TOKEN          GitHub Personal Access Token
  DATA_REPO             データリポ (例: owner/taxi-daily-report-data)
`.trim());
}

/** 引数をパース */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    user: null,
    photos: [],
    date: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--user' && args[i + 1]) {
      opts.user = args[++i];
    } else if (a === '--photo' && args[i + 1]) {
      opts.photos.push(args[++i]);
    } else if (a === '--date' && args[i + 1]) {
      opts.date = args[++i];
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else {
      console.error(`不明なオプション: ${a}`);
      usage();
      process.exit(1);
    }
  }

  return opts;
}

/** バリデーション */
function validate(opts) {
  const errors = [];

  if (!opts.user) {
    errors.push('--user が指定されていません');
  } else if (!/^[a-z][a-z0-9_]*$/.test(opts.user)) {
    errors.push(`--user "${opts.user}" は無効です。英小文字始まり、英小文字・数字・アンダースコアのみ使用可`);
  }

  if (opts.photos.length === 0) {
    errors.push('--photo が1つ以上必要です');
  }

  const missingPhotos = opts.photos.filter(p => !existsSync(resolve(p)));
  if (missingPhotos.length > 0) {
    errors.push(`写真ファイルが見つかりません: ${missingPhotos.join(', ')}`);
  }

  if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
    errors.push(`--date "${opts.date}" は YYYY-MM-DD 形式で指定してください`);
  }

  if (!opts.dryRun) {
    if (!process.env.GITHUB_TOKEN) errors.push('環境変数 GITHUB_TOKEN が未設定です');
    if (!process.env.DATA_REPO) errors.push('環境変数 DATA_REPO が未設定です');
  }

  return errors;
}

// ─── codex 呼び出し ───────────────────────────────────────────────

/**
 * codex exec で写真を読み込み、構造化テキストを返す。
 * @param {string[]} photoPaths  絶対パスの配列
 * @returns {Promise<string>}    codex の最終出力テキスト
 */
async function runCodexOCR(photoPaths) {
  const promptText = readFileSync(PROMPT_FILE, 'utf-8');
  const outputFile = `/tmp/codex-out-${Date.now()}.txt`;

  // codex exec -i img1 -i img2 ... -o output.txt --skip-git-repo-check "<prompt>"
  const imageArgs = photoPaths.flatMap(p => ['-i', resolve(p)]);
  const cliArgs = [
    'exec',
    '--skip-git-repo-check',
    '--ephemeral',
    ...imageArgs,
    '-o', outputFile,
    promptText,
  ];

  console.log(`[codex] 写真 ${photoPaths.length} 枚を読み込み中...`);

  try {
    const { stdout, stderr } = await execFileAsync('codex', cliArgs, {
      timeout: 120_000, // 2分
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (err) {
    const errTxt = `/tmp/import-err-${Date.now()}.txt`;
    writeFileSync(errTxt, `stdout:\n${err.stdout || ''}\nstderr:\n${err.stderr || ''}`);
    throw new Error(`codex 実行失敗 (詳細: ${errTxt}): ${err.message}`);
  }

  if (!existsSync(outputFile)) {
    throw new Error(`codex の出力ファイルが生成されませんでした: ${outputFile}`);
  }

  const result = readFileSync(outputFile, 'utf-8').trim();
  if (!result) {
    throw new Error('codex の出力が空でした');
  }

  return result;
}

// ─── パーサー呼び出し ──────────────────────────────────────────────

async function parseOutput(text) {
  // ESM 動的 import で js/parser.js を読み込む
  const parserUrl = new URL(`file://${PARSER_PATH}`);
  const { parseFormattedReport } = await import(parserUrl.href);
  return parseFormattedReport(text);
}

// ─── GitHub Contents API ──────────────────────────────────────────

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** UTF-8 JSON → base64 (Node.js Buffer) */
function encodeJson(obj) {
  return Buffer.from(JSON.stringify(obj, null, 2), 'utf-8').toString('base64');
}

/**
 * ファイルの現在の sha を取得する。存在しない場合は null。
 */
async function getFileSha(repo, token, path) {
  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
    headers: authHeaders(token),
  });
  await sleep(SLEEP_MS);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} (GET ${path})`);
  const data = await res.json();
  return data.sha;
}

/**
 * ファイルを作成または更新する。
 */
async function putFile(repo, token, path, obj, message, sha) {
  const body = { message, content: encodeJson(obj) };
  if (sha) body.sha = sha;

  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await sleep(SLEEP_MS);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error: ${res.status} (PUT ${path}): ${text}`);
  }
  return res.json();
}

// ─── インタラクティブ確認 ──────────────────────────────────────────

function confirm(prompt) {
  if (!process.stdin.isTTY) {
    console.error('[エラー] 標準入力が TTY ではありません。--dry-run で確認してから手動実行してください。');
    process.exit(1);
  }
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, answer => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

// ─── メイン ───────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const errors = validate(opts);

  if (errors.length > 0) {
    for (const e of errors) console.error(`エラー: ${e}`);
    usage();
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.DATA_REPO;

  // ─── 1. codex で OCR
  let rawText;
  try {
    rawText = await runCodexOCR(opts.photos);
  } catch (err) {
    console.error(`[OCR失敗] ${err.message}`);
    process.exit(1);
  }

  console.log('\n[OCR出力]');
  console.log('─'.repeat(60));
  console.log(rawText);
  console.log('─'.repeat(60));

  // ─── 2. パース & バリデーション
  let parsed;
  try {
    parsed = await parseOutput(rawText);
  } catch (err) {
    const tmpFile = `/tmp/import-${Date.now()}.txt`;
    writeFileSync(tmpFile, rawText, 'utf-8');
    console.error(`[パース失敗] ${err.message}`);
    console.error(`OCR 出力を保存しました: ${tmpFile}`);
    process.exit(1);
  }

  // ─── 3. drive オブジェクト構築
  if (parsed.trips.length === 0) {
    const rawTextPath = `/tmp/import-${Date.now()}.txt`;
    console.error('[警告] 乗務データが0件です。OCR 出力を確認してください。');
    console.error(`元テキストは ${rawTextPath} に保存しました。`);
    // Save raw text for inspection
    writeFileSync(rawTextPath, rawText, 'utf-8');
    process.exit(1);
  }

  const date = parsed.date || opts.date;
  if (!date) {
    console.error('[エラー] OCR が日付を読み取れませんでした。--date YYYY-MM-DD で明示してください。');
    process.exit(1);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`[エラー] 日付フォーマットが不正です: "${date}". YYYY-MM-DD 形式が必要です。`);
    process.exit(1);
  }

  const drive = {
    date,
    vehicleType: parsed.vehicleType,
    departureTime: parsed.departureTime,
    returnTime: parsed.returnTime,
    trips: parsed.trips,
    rests: parsed.rests,
  };

  // ─── 4. プレビュー表示
  const totalAmount = drive.trips
    .filter(t => !t.isCancel)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const fmtAmount = totalAmount.toLocaleString('ja-JP');

  console.log('\n[プレビュー]');
  console.log(`  ユーザー    : ${opts.user}`);
  console.log(`  日付        : ${drive.date}`);
  console.log(`  車種        : ${drive.vehicleType || '(不明)'}`);
  console.log(`  出庫        : ${drive.departureTime || '(不明)'}`);
  console.log(`  帰庫        : ${drive.returnTime || '(不明)'}`);
  console.log(`  乗務件数    : ${drive.trips.length} 件`);
  console.log(`  休憩        : ${drive.rests.length} 件`);
  console.log(`  売上合計    : ¥${fmtAmount}`);

  const githubPath = `data/drives/${opts.user}/${drive.date}.json`;
  console.log(`  保存先      : ${githubPath}`);

  if (opts.dryRun) {
    console.log('\n[DRY RUN] GitHub への push はスキップします。');
    console.log(`WOULD PUSH: ${githubPath}`);
    console.log(JSON.stringify(drive, null, 2));
    process.exit(0);
  }

  // ─── 5. 確認
  const answer = await confirm('\nこの内容で GitHub に保存しますか? [y/N] ');
  if (answer !== 'y' && answer !== 'yes') {
    console.log('中断しました。');
    process.exit(0);
  }

  // ─── 6. GitHub push
  console.log('\n[GitHub] push 中...');
  try {
    const sha = await getFileSha(repo, token, githubPath);
    const message = sha
      ? `update drive ${opts.user}/${drive.date}`
      : `add drive ${opts.user}/${drive.date}`;
    await putFile(repo, token, githubPath, drive, message, sha);
    console.log(`[完了] ${githubPath} を ${sha ? '更新' : '新規作成'}しました。`);
  } catch (err) {
    console.error(`[GitHub push 失敗] ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});

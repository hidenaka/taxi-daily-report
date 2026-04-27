#!/usr/bin/env node
/**
 * import-friend-report.mjs
 *
 * 知人から送られたタクシー日報の写真を gemini CLI で OCR + 構造化し、
 * GitHub data リポの data/drives/{userId}/{date}.json に保存する。
 *
 * OCR_INVESTIGATION (gemini CLI v0.39.1):
 *   エージェント型CLIのため画像フラグなし(-p で headless)。
 *   画像OCRの信頼性のため GEMINI_API_KEY + google.genai Python SDK を採用。
 *
 * 使い方:
 *   node scripts/import-friend-report.mjs --user <userId> --photo <path> [options]
 *   オプション: --date, --vehicle premium|regular, --dry-run
 *   必須環境変数: GITHUB_TOKEN, DATA_REPO, GEMINI_API_KEY
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { inferVehicleType } from './lib/infer-vehicle.mjs';

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
  console.error([
    '使い方: node scripts/import-friend-report.mjs --user <userId> --photo <path> [options]',
    '必須: --user, --photo',
    'オプション: --date <YYYY-MM-DD>  --vehicle <premium|regular>  --dry-run',
    '環境変数: GITHUB_TOKEN, DATA_REPO (dry-run 以外で必須), GEMINI_API_KEY (OCR 必須)',
  ].join('\n'));
}

/** 引数をパース */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    user: null,
    photos: [],
    date: null,
    vehicle: null,
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
    } else if (a === '--vehicle' && args[i + 1]) {
      opts.vehicle = args[++i];
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

  if (opts.vehicle && !['premium', 'regular'].includes(opts.vehicle)) {
    errors.push(`--vehicle "${opts.vehicle}" は無効です。premium または regular を指定してください`);
  }

  if (!opts.dryRun) {
    if (!process.env.GITHUB_TOKEN) errors.push('環境変数 GITHUB_TOKEN が未設定です');
    if (!process.env.DATA_REPO) errors.push('環境変数 DATA_REPO が未設定です');
  }

  return errors;
}

// ─── gemini 呼び出し ──────────────────────────────────────────────

/**
 * GEMINI_API_KEY + google.genai (Python) で写真を OCR して構造化テキストを返す。
 * @param {string[]} photoPaths  絶対パスの配列
 * @returns {Promise<string>}    gemini の出力テキスト
 */
async function runGeminiOCR(photoPaths) {
  const promptText = readFileSync(PROMPT_FILE, 'utf-8');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('環境変数 GEMINI_API_KEY が未設定です');
  }

  const absPhotoPaths = photoPaths.map(p => resolve(p));
  const pyScript = `
import sys,json,mimetypes
import google.genai as genai
from google.genai import types
client=genai.Client(api_key=${JSON.stringify(apiKey)})
paths=json.loads(${JSON.stringify(JSON.stringify(absPhotoPaths))})
prompt=json.loads(${JSON.stringify(JSON.stringify(promptText))})
parts=[]
for p in paths:
    mime,_=mimetypes.guess_type(p)
    data=open(p,'rb').read()
    parts.append(types.Part.from_bytes(data=data,mime_type=mime or'image/jpeg'))
parts.append(types.Part.from_text(text=prompt))
r=client.models.generate_content(model='gemini-2.0-flash',contents=parts,config=types.GenerateContentConfig(temperature=0))
sys.stdout.write(r.text)
`;

  console.log(`[gemini] 写真 ${photoPaths.length} 枚を読み込み中...`);

  let stdout, stderr;
  try {
    const result = await execFileAsync('python3', ['-c', pyScript], {
      timeout: 120_000, // 2分
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err) {
    if (err.stderr) process.stderr.write(err.stderr);
    const errTxt = `/tmp/import-err-${Date.now()}.txt`;
    writeFileSync(errTxt, `stdout:\n${err.stdout || ''}\nstderr:\n${err.stderr || ''}`);
    throw new Error(`gemini 実行失敗 (詳細: ${errTxt}): ${err.message}`);
  }

  if (stderr) process.stderr.write(stderr);

  const result = (stdout || '').trim();
  if (!result) {
    throw new Error('gemini の出力が空でした');
  }

  return result;
}

// ─── パーサー呼び出し ──────────────────────────────────────────────

async function parseOutput(text) {
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

/** UTF-8 JSON → base64 */
function encodeJson(obj) {
  return Buffer.from(JSON.stringify(obj, null, 2), 'utf-8').toString('base64');
}

/** ファイルの現在の sha を取得。存在しない場合は null。 */
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

/** ファイルを作成または更新する。 */
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

  // ─── 1. gemini で OCR
  let rawText;
  try {
    rawText = await runGeminiOCR(opts.photos);
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

  // ─── 車種の優先順位制御: CLI指定 > gemini読取 > 迎車率自動判定
  let vehicleType, vehicleSource, pickupRatio = null;
  if (opts.vehicle) {
    vehicleType = opts.vehicle;
    vehicleSource = 'cli';
  } else if (parsed.vehicleType) {
    vehicleType = parsed.vehicleType;
    vehicleSource = 'gemini';
  } else {
    const inferred = inferVehicleType(parsed.trips);
    vehicleType = inferred.value;
    vehicleSource = inferred.source;
    pickupRatio = inferred.ratio;
  }

  const drive = {
    date,
    vehicleType,
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

  // 車種の表示ラベル (source 別)
  let vehicleLabel;
  if (vehicleSource === 'cli') {
    vehicleLabel = `${vehicleType} (CLI 指定)`;
  } else if (vehicleSource === 'gemini') {
    vehicleLabel = `${vehicleType} (gemini 読取)`;
  } else if (vehicleSource === 'auto') {
    vehicleLabel = `${vehicleType} (自動判定: 迎車率 ${(pickupRatio * 100).toFixed(1)}%)`;
  } else {
    vehicleLabel = '(不明)';
  }

  console.log('\n[プレビュー]');
  console.log(`  ユーザー    : ${opts.user}`);
  console.log(`  日付        : ${drive.date}`);
  console.log(`  車種        : ${vehicleLabel}`);
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

import { DEFAULT_USER_ID, isValidUserId, normalizeUserId } from './userid.js';
import { getBillingPeriodRange } from './app.js';

const API_BASE = 'https://api.github.com';

const USER_ID_KEY = 'taxi_user_id';

export function getMyUserId() {
  const raw = localStorage.getItem(USER_ID_KEY);
  if (!raw) return DEFAULT_USER_ID;
  const norm = normalizeUserId(raw);
  return isValidUserId(norm) ? norm : DEFAULT_USER_ID;
}

export function setMyUserId(id) {
  const norm = normalizeUserId(id);
  if (!isValidUserId(norm)) {
    throw new Error('userId は英小文字始まりで英小文字・数字・アンダースコアのみ使用可');
  }
  localStorage.setItem(USER_ID_KEY, norm);
  return norm;
}

function getToken() {
  return localStorage.getItem('github_token');
}

function getRepo() {
  // データリポ（"username/taxi-daily-report-data"）。コードリポではない点注意。
  return localStorage.getItem('github_data_repo');
}

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error('GitHub token未設定');
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

// 単一ファイルを取得 → JSONパース済みで返す
export async function getFile(path) {
  const repo = getRepo();
  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
    headers: authHeaders()
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  // base64デコード → UTF-8 → JSON
  const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  return { content: JSON.parse(decoded), sha: data.sha };
}

// ディレクトリ内のファイル一覧
export async function listFiles(dir) {
  const repo = getRepo();
  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${dir}`, {
    headers: authHeaders()
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json(); // [{ name, path, sha, ... }]
}

export async function getConfig() {
  const userId = getMyUserId();
  const result = await getFile(`data/config/${userId}.json`);
  return result?.content || null;
}

export async function getDrive(date) {
  const userId = getMyUserId();
  const result = await getFile(`data/drives/${userId}/${date}.json`);
  return result?.content || null;
}

// 月度（YYYY-MM）の全drive並列取得 — 16-15 サイクル対応
export async function getDrivesForMonth(yearMonth) {
  const userId = getMyUserId();
  const { start, end } = getBillingPeriodRange(yearMonth);
  const files = await listFiles(`data/drives/${userId}`);
  const periodFiles = files.filter(f => {
    if (!f.name.endsWith('.json')) return false;
    const date = f.name.replace('.json', '');
    return date >= start && date <= end;
  });
  const drives = await Promise.all(
    periodFiles.map(f => getFile(f.path).then(r => r?.content))
  );
  return drives.filter(d => d !== null);
}

// UTF-8文字列を base64 エンコード
function encodeContent(jsonObject) {
  const text = JSON.stringify(jsonObject, null, 2);
  return btoa(unescape(encodeURIComponent(text)));
}

// ファイルを作成 or 更新（コンフリクト時は409返す）
export async function putFile(path, jsonObject, message, sha = null) {
  const repo = getRepo();
  const body = {
    message,
    content: encodeContent(jsonObject)
  };
  if (sha) body.sha = sha; // 更新時は必須

  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.status === 409 || (res.status === 422 && (await res.clone().json()).message?.includes('sha'))) {
    const err = new Error('Conflict');
    err.code = 'CONFLICT';
    throw err;
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function saveDrive(drive) {
  const userId = getMyUserId();
  const path = `data/drives/${userId}/${drive.date}.json`;
  // 既存shaを取得（更新の場合）
  const existing = await getFile(path);
  const sha = existing?.sha || null;
  const message = sha
    ? `update drive ${userId}/${drive.date}`
    : `add drive ${userId}/${drive.date}`;
  return putFile(path, drive, message, sha);
}

export async function saveConfig(config) {
  const userId = getMyUserId();
  const path = `data/config/${userId}.json`;
  const existing = await getFile(path);
  const sha = existing?.sha || null;
  return putFile(path, config, `update config ${userId}`, sha);
}

const PENDING_QUEUE_KEY = 'pending_saves';

function getPendingQueue() {
  return JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
}

function setPendingQueue(queue) {
  localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
}

// saveDriveをラップ: 失敗時はキューに退避
export async function saveDriveSafe(drive) {
  try {
    return await saveDrive(drive);
  } catch (err) {
    if (err.code === 'CONFLICT') throw err; // コンフリクトは呼び元で処理
    // ネットワーク or その他失敗 → キューに退避
    const queue = getPendingQueue();
    queue.push({ type: 'drive', data: drive, queuedAt: Date.now() });
    setPendingQueue(queue);
    throw new Error(`保存失敗: ${err.message} (キューに退避済、復帰時に再送します)`);
  }
}

// 起動時に呼ぶ：キュー内の保存待ちを再送
export async function flushPendingQueue() {
  const queue = getPendingQueue();
  const remaining = [];
  for (const item of queue) {
    try {
      if (item.type === 'drive') await saveDrive(item.data);
    } catch (err) {
      remaining.push(item);
    }
  }
  setPendingQueue(remaining);
  return { sent: queue.length - remaining.length, remaining: remaining.length };
}

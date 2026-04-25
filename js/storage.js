const API_BASE = 'https://api.github.com';

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
  const result = await getFile('data/config.json');
  return result?.content || null;
}

export async function getDrive(date) {
  const result = await getFile(`data/drives/${date}.json`);
  return result?.content || null;
}

// 当月の全drive並列取得
export async function getDrivesForMonth(yearMonth) {
  const files = await listFiles('data/drives');
  const monthFiles = files.filter(f => f.name.startsWith(yearMonth) && f.name.endsWith('.json'));
  const drives = await Promise.all(
    monthFiles.map(f => getFile(f.path).then(r => r?.content))
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
  const path = `data/drives/${drive.date}.json`;
  // 既存shaを取得（更新の場合）
  const existing = await getFile(path);
  const sha = existing?.sha || null;
  const message = sha ? `update drive ${drive.date}` : `add drive ${drive.date}`;
  return putFile(path, drive, message, sha);
}

export async function saveConfig(config) {
  const existing = await getFile('data/config.json');
  const sha = existing?.sha || null;
  return putFile('data/config.json', config, 'update config', sha);
}

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

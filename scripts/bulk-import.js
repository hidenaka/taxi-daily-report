import fs from 'fs';
import { parseReport } from '../js/parser.js';

const PASTE_FILE = '/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報/data/paste-here.txt';
const API_BASE = 'https://api.github.com';
const REPO = 'hidenaka/taxi-daily-report-data';
const USER_ID = process.env.TARGET_USER || 'mm';
const TOKEN = process.env.GITHUB_TOKEN;

function splitByDate(text) {
  const blocks = [];
  const lines = text.split('\n');
  let current = null;

  for (const line of lines) {
    const dateMatch = line.match(/^日付:\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      if (current) blocks.push(current);
      // ヘッダーから情報を抽出
      const headerMatch = line.match(/^日付:\s*(\d{4}-\d{2}-\d{2})\s+車種:\s*(\S*)\s+出庫:\s*(\d{1,2}:\d{2})\s+帰庫:\s*(\d{1,2}:\d{2})/);
      current = {
        date: dateMatch[1],
        vehicleType: headerMatch?.[2] || '',
        departureTime: headerMatch?.[3] || '',
        returnTime: headerMatch?.[4] || '',
        headerLine: line,
        body: []
      };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

async function checkExisting(userId, date) {
  const filepath = `data/drives/${userId}/${date}.json`;
  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${filepath}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' }
  });
  return res.status === 200;
}

async function saveDrive(userId, drive, skipIfExists = true) {
  const filepath = `data/drives/${userId}/${drive.date}.json`;

  // 既存チェック
  const exists = await checkExisting(userId, drive.date);
  if (exists && skipIfExists) {
    return { skipped: true, reason: 'already exists' };
  }

  const content = Buffer.from(JSON.stringify(drive, null, 2)).toString('base64');

  // 既存ファイルのshaを取得（上書き用）
  const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${filepath}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' }
  });

  const body = {
    message: `bulk import: ${userId}/${drive.date}`,
    content,
    branch: 'main'
  };

  if (getRes.status === 200) {
    const data = await getRes.json();
    body.sha = data.sha;
  }

  const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${filepath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Failed to save ${filepath}: ${putRes.status} ${err}`);
  }
  return putRes.json();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!TOKEN && !dryRun) {
    console.error('Error: GITHUB_TOKEN 環境変数が設定されていません');
    console.error('Usage: GITHUB_TOKEN=ghp_xxx TARGET_USER=mm node scripts/bulk-import.js');
    process.exit(1);
  }

  console.log(`Reading ${PASTE_FILE}...`);
  const text = fs.readFileSync(PASTE_FILE, 'utf-8');
  const blocks = splitByDate(text);
  console.log(`Found ${blocks.length} days`);

  if (dryRun) {
    console.log('DRY RUN モード: 保存は行いません');
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const block of blocks) {
    // データ部分をパース（最初の行はCSVヘッダー）
    const dataText = block.body.join('\n');
    try {
      const parsed = parseReport(dataText);

      const drive = {
        date: block.date,
        vehicleType: block.vehicleType || 'japantaxi',
        departureTime: block.departureTime || '07:00',
        returnTime: block.returnTime || parsed.returnTime || '',
        trips: parsed.trips,
        rests: parsed.rests,
        rawText: [block.headerLine, ...block.body].join('\n'),
        weather: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!dryRun) {
        const result = await saveDrive(USER_ID, drive, true);
        if (result?.skipped) {
          console.log(`[${block.date}] SKIP: ${drive.trips.length} trips, ${drive.rests.length} rests (already exists)`);
          skipped++;
        } else {
          console.log(`[${block.date}] SAVED: ${drive.trips.length} trips, ${drive.rests.length} rests`);
          success++;
        }
      } else {
        console.log(`[${block.date}] DRY: ${drive.trips.length} trips, ${drive.rests.length} rests`);
        success++;
      }
    } catch (e) {
      console.error(`[${block.date}] ERROR:`, e.message);
      failed++;
    }
  }

  console.log(`\nDone: ${success} saved, ${skipped} skipped, ${failed} failed`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const basePath = '/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報';
const promptPath = `${basePath}/scripts/prompts/recheck-friend-reports.md`;
const outDir = `${basePath}/data/friend_report_texts`;

// 指示書から対象ファイルをパース
const promptContent = fs.readFileSync(promptPath, 'utf-8');
const lines = promptContent.split('\n');
const tasks = [];

for (const line of lines) {
  const match = line.match(/^\|?\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
  if (match) {
    tasks.push({
      id: match[1],
      imgPath: match[2].replace('./', `${basePath}/`),
      txtPath: match[3].replace('./', `${basePath}/`),
      oldDate: match[4].trim(),
      oldTotal: match[6].trim()
    });
  }
}

let summary = '# 再チェック検証サマリ\n\n';
summary += '| 出力先ファイル | 旧日付 | 新日付 | 旧売上 | 新売上 | 一致/相違 | 備考 |\n';
summary += '|---|---|---|---|---|---|---|\n';

for (const task of tasks) {
  const fileName = path.basename(task.txtPath);
  let content = '';
  
  // 失敗したファイルまたは未作成のファイルのみ再OCR
  if (!fs.existsSync(task.txtPath) || fs.readFileSync(task.txtPath, 'utf-8').includes('エラー')) {
    console.log(`Retrying OCR for ${fileName}...`);
    try {
      const cmd = `gemini -y "画像 ${task.imgPath} を読み込み、プロンプト ${promptPath} のルールと出力フォーマットに従ってテキスト化し、結果のみを返してください。"`;
      content = execSync(cmd, { encoding: 'utf-8', timeout: 180000 });
      fs.writeFileSync(task.txtPath, content.trim());
    } catch (e) {
      console.error(`Retry failed for ${fileName}`);
    }
  } else {
    content = fs.readFileSync(task.txtPath, 'utf-8');
  }

  // 正確な集計処理
  let newDate = '';
  let newTotal = 0;
  const contentLines = content.split('\n');
  for (const line of contentLines) {
    if (line.startsWith('日付:')) newDate = line.replace('日付:', '').trim();
    // CSV行の解析 (カンマを含むクォートに対応)
    const match = line.match(/^(?:\d+|キ),.*,"?([\d,]+)"?$/);
    if (match) {
      const val = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(val)) newTotal += val;
    }
  }

  const newTotalStr = `¥${newTotal.toLocaleString()}`;
  const diff = (task.oldDate === newDate && task.oldTotal === newTotalStr) ? '一致' : '相違';
  summary += `| ${fileName} | ${task.oldDate} | ${newDate} | ${task.oldTotal} | ${newTotalStr} | ${diff} | ${newDate ? '再チェック完了' : '解析失敗'} |\n`;
}

fs.writeFileSync(`${outDir}/recheck-summary.md`, summary);
console.log('Summary updated with correct calculations.');

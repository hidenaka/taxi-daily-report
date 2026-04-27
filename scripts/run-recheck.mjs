import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const basePath = '/Users/hideakimacbookair/Library/Mobile Documents/com~apple~CloudDocs/タクシー乗務アプリ/タクシー日報';
const promptPath = `${basePath}/scripts/prompts/recheck-friend-reports.md`;
const outDir = `${basePath}/data/friend_report_texts`;

// 指示書から対象ファイルをパース（テーブルから抽出）
const promptContent = fs.readFileSync(promptPath, 'utf-8');
const lines = promptContent.split('\n');
const tasks = [];

for (const line of lines) {
  // | 1 | `./data/...` | `./data/...` | ... という形式を抽出
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

console.log(`Starting recheck for ${tasks.length} files...`);

for (const task of tasks) {
  const fileName = path.basename(task.txtPath);
  console.log(`[${task.id}/55] Processing ${fileName}...`);
  
  try {
    // 独立したプロセスで Gemini CLI を実行
    const cmd = `gemini -y "画像 ${task.imgPath} を読み込み、プロンプト ${promptPath} のルールと出力フォーマットに従ってテキスト化し、結果のみを標準出力に返してください。余計な解説は一切不要です。"`;
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 120000 });
    
    // 結果の解析
    const lines = result.split('\n');
    let newDate = '';
    let newTotal = 0;
    
    for (const line of lines) {
      if (line.startsWith('日付:')) newDate = line.replace('日付:', '').trim();
      const cols = line.split(',');
      if (cols.length > 10 && !line.startsWith('No') && !line.startsWith('休') && !line.startsWith('キ')) {
        const val = parseInt(cols[10].replace(/"/g, '').replace(/,/g, ''), 10);
        if (!isNaN(val)) newTotal += val;
      }
    }
    
    const newTotalStr = `¥${newTotal.toLocaleString()}`;
    const diff = (task.oldDate === newDate && task.oldTotal === newTotalStr) ? '一致' : '相違';
    
    fs.writeFileSync(task.txtPath, result.trim());
    summary += `| ${fileName} | ${task.oldDate} | ${newDate} | ${task.oldTotal} | ${newTotalStr} | ${diff} | 再チェック完了 |\n`;
    
  } catch (err) {
    console.error(`Error processing ${fileName}:`, err.message);
    summary += `| ${fileName} | ${task.oldDate} | エラー | ${task.oldTotal} | - | 相違 | 処理失敗 |\n`;
  }
}

fs.writeFileSync(`${outDir}/recheck-summary.md`, summary);
console.log('Finished! Summary saved to data/friend_report_texts/recheck-summary.md');

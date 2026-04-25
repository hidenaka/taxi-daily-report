// 形式判別: 1行目（ヘッダー）にカンマがあれば CSV (Gemini)、それ以外はタブ (Claude)
export function detectFormat(text) {
  const firstLine = text.split('\n')[0] || '';
  return firstLine.includes(',') ? 'gemini' : 'claude';
}

// 「合計」列のような "1,000" や "29,110" を数値化（カンマ除去）
function parseAmount(s) {
  if (!s || s.trim() === '') return 0;
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}

function parseKm(s) {
  if (!s || s.trim() === '') return 0;
  return parseFloat(s) || 0;
}

function parseClaudeRow(cells) {
  // [No, 乗車, 降車, 時間, 迎, 乗車地, 降車地, 営Km, 合計, 待機]
  const [no, board, alight, dur, pickup, bp, ap, km, amt, wait] = cells;
  if (no === '休') {
    return { type: 'rest', startTime: board, endTime: alight, place: bp };
  }
  return {
    type: 'trip',
    no: parseInt(no, 10),
    boardTime: board,
    alightTime: alight,
    boardPlace: bp,
    alightPlace: ap,
    km: parseKm(km),
    amount: parseAmount(amt),
    isPickup: pickup === '迎',
    isCancel: false,
    waitTime: wait || ''
  };
}

export function parseReport(text) {
  const format = detectFormat(text);
  const lines = text.split('\n').filter(l => l.trim() !== '');
  // ヘッダー行をスキップ
  const dataLines = lines.slice(1);

  const trips = [];
  const rests = [];

  for (const line of dataLines) {
    const cells = format === 'claude' ? line.split('\t') : []; // Geminiは次のタスクで
    if (cells.length === 0) continue;

    const parsed = parseClaudeRow(cells);
    if (parsed.type === 'rest') rests.push({ startTime: parsed.startTime, endTime: parsed.endTime, place: parsed.place });
    else { delete parsed.type; trips.push(parsed); }
  }

  return { trips, rests, format };
}

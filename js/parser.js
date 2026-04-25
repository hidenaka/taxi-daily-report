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
  // キャンセル判定: km=0 で (amount=500 or 乗車地==降車地)
  const isCancel = parseKm(km) === 0 && (parseAmount(amt) === 500 || bp === ap);
  return {
    type: 'trip',
    no: parseInt(no, 10),
    boardTime: board,
    alightTime: alight,
    boardPlace: bp,
    alightPlace: ap,
    km: parseKm(km),
    amount: isCancel ? 0 : parseAmount(amt),
    isPickup: pickup === '迎',
    isCancel,
    waitTime: wait || ''
  };
}

// CSV1行を引用符を考慮してセルに分解
function splitCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { cells.push(cur); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function parseGeminiRow(cells) {
  // [No, 乗車, 降車, 時間, 迎, 乗車地, 降車地, 営Km, 男, 女, 合計]
  const [no, board, alight, dur, pickup, bp, ap, km, _m, _f, amt] = cells;
  if (no === '休') {
    return { type: 'rest', startTime: board, endTime: alight, place: bp };
  }
  // キャンセル判定: km=0 で (amount=500 or 乗車地==降車地)
  const isCancel = parseKm(km) === 0 && (parseAmount(amt) === 500 || bp === ap);
  return {
    type: 'trip',
    no: parseInt(no, 10),
    boardTime: board,
    alightTime: alight,
    boardPlace: bp,
    alightPlace: ap,
    km: parseKm(km),
    amount: isCancel ? 0 : parseAmount(amt),
    isPickup: pickup === '迎',
    isCancel,
    waitTime: ''
  };
}

export function parseReport(text) {
  const format = detectFormat(text);
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const dataLines = lines.slice(1);

  const trips = [];
  const rests = [];

  for (const line of dataLines) {
    const cells = format === 'claude' ? line.split('\t') : splitCsvLine(line);
    if (cells.length === 0 || (cells.length === 1 && cells[0].trim() === '')) continue;

    const parsed = format === 'claude' ? parseClaudeRow(cells) : parseGeminiRow(cells);
    if (parsed.type === 'rest') {
      rests.push({ startTime: parsed.startTime, endTime: parsed.endTime, place: parsed.place });
    } else {
      delete parsed.type;
      trips.push(parsed);
    }
  }

  return { trips, rests, format };
}

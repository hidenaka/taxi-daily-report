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
  // キャンセル判定: 行頭が「キ」、または amount=400 (無条件)、または km=0 で amount=500/1000
  // 乗降同所+0kmは待機料金で売上が立つこともあるため、金額が400/500/1000以外なら通常乗車扱い
  const amtNum = parseAmount(amt);
  const kmNum = parseKm(km);
  const isCancelMarker = no === 'キ';
  const isCancel = isCancelMarker || amtNum === 400 || (kmNum === 0 && (amtNum === 500 || amtNum === 1000));
  return {
    type: 'trip',
    no: isCancelMarker ? null : parseInt(no, 10),
    pickupKind: pickup || '',
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
  // キャンセル判定: 行頭が「キ」、または amount=400 (無条件)、または km=0 で amount=500/1000
  // 乗降同所+0kmは待機料金で売上が立つこともあるため、金額が400/500/1000以外なら通常乗車扱い
  const amtNum = parseAmount(amt);
  const kmNum = parseKm(km);
  const isCancelMarker = no === 'キ';
  const isCancel = isCancelMarker || amtNum === 400 || (kmNum === 0 && (amtNum === 500 || amtNum === 1000));
  return {
    type: 'trip',
    no: isCancelMarker ? null : parseInt(no, 10),
    pickupKind: pickup || '',
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

  // 末尾の行が rests の最後の要素と一致するかで判定
  const allDataCells = dataLines.length > 0
    ? (format === 'claude' ? dataLines[dataLines.length - 1].split('\t') : splitCsvLine(dataLines[dataLines.length - 1]))
    : [];
  const lastNo = allDataCells[0];
  const returnTime = lastNo === '休' && rests.length > 0 ? rests[rests.length - 1].endTime : null;

  return { trips, rests, returnTime, format };
}

// 4行ヘッダー + --- + CSV/タブ表 のフォーマットをパース
export function parseFormattedReport(text) {
  const lines = text.split('\n');
  const header = { 日付: '', 車種: '', 出庫: '', 帰庫: '' };
  let dataStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '---') { dataStart = i + 1; break; }
    const m = line.match(/^(日付|車種|出庫|帰庫):\s*(.*)$/);
    if (m) header[m[1]] = m[2].trim();
  }
  if (dataStart === -1) {
    throw new Error('parseFormattedReport: --- separator not found');
  }
  const dataText = lines.slice(dataStart).join('\n');
  const inner = parseReport(dataText);
  return {
    date: header.日付,
    vehicleType: header.車種,
    departureTime: header.出庫,
    returnTime: header.帰庫 || inner.returnTime,
    trips: inner.trips,
    rests: inner.rests,
    format: inner.format,
    rawText: text
  };
}

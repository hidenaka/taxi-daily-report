#!/usr/bin/env node
// data/paste-here.txt を bulk-input.html と同じロジックで検証する
// 形式: 4行ヘッダー (日付/車種/出庫/帰庫) + --- + CSV/タブ表 を「日付:」で複数日分割

import { readFileSync, writeFileSync } from 'fs';
import { parseFormattedReport } from '../js/parser.js';

const TEXT_PATH = process.argv[2] || 'data/paste-here.txt';
const text = readFileSync(TEXT_PATH, 'utf-8');

// bulk-input.html の splitReports と同じロジック
function splitReports(t) {
  const lines = t.split('\n');
  const sections = [];
  let cur = [];
  for (const line of lines) {
    if (/^日付:\s*\d{4}-\d{2}-\d{2}/.test(line) && cur.length > 0) {
      sections.push(cur.join('\n').trim());
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) sections.push(cur.join('\n').trim());
  return sections.filter(s => s);
}

// 旧1行ヘッダー (日付:.. 車種:.. 出庫:.. 帰庫:..) を新4行+--- 形式に正規化
function normalizeSection(s) {
  const lines = s.split('\n');
  const m = lines[0].match(/^日付:\s*(\S*)\s+車種:\s*(\S*)?\s+出庫:\s*(\S*)\s+帰庫:\s*(\S*)\s*$/);
  if (!m) return s; // 既に新形式
  const [, date, vehicle, dep, ret] = m;
  const head = `日付: ${date}\n車種: ${vehicle || ''}\n出庫: ${dep}\n帰庫: ${ret}\n---`;
  return [head, ...lines.slice(1)].join('\n');
}

function inferVehicleType(trips) {
  if (!trips || trips.length === 0) return 'japantaxi';
  const pickupCount = trips.filter(t => t.isPickup).length;
  return (pickupCount / trips.length) >= 0.7 ? 'premium' : 'japantaxi';
}

const sections = splitReports(text);
const summaries = [];
const dateCount = {};
let totalCancel400 = 0, totalCancel500 = 0, totalCancel1000 = 0, totalCancelMarker = 0;
const errors = [];

for (let i = 0; i < sections.length; i++) {
  const normalized = normalizeSection(sections[i]);
  let parsed;
  try {
    parsed = parseFormattedReport(normalized);
  } catch (e) {
    errors.push({ index: i, error: e.message, head: sections[i].slice(0, 80) });
    continue;
  }
  const trips = parsed.trips;
  const pickupCount = trips.filter(t => t.isPickup).length;
  const ratio = trips.length === 0 ? 0 : pickupCount / trips.length;
  const inferredVehicle = parsed.vehicleType || inferVehicleType(trips);
  const cancelTrips = trips.filter(t => t.isCancel);
  const totalAmount = trips.reduce((s, t) => s + t.amount, 0);

  // キャンセル種類別カウント
  for (const t of cancelTrips) {
    // 元の金額を見るため raw text から再判定
    if (t.no === null) totalCancelMarker++;
    // ※ trip.amount は cancel 時 0 上書きされてるので元金額が見えない
    // ここは大雑把に分類できないので合計のみ
  }
  // 改めて raw rows をスキャンして金額別カウント (normalized: 4行ヘッダー + --- + CSVヘッダー の後がデータ)
  const rawLines = normalized.split('\n').slice(6);
  for (const line of rawLines) {
    if (!line.trim()) continue;
    const cells = line.split(',');
    if (cells.length < 11) continue;
    const no = cells[0];
    if (no === '休') continue;
    const km = cells[7];
    const amtRaw = cells[10] || '';
    const amt = parseInt(amtRaw.replace(/[",]/g, ''), 10) || 0;
    const kmNum = parseFloat(km) || 0;
    if (no === 'キ') { /* counted above */ }
    else if (amt === 400) totalCancel400++;
    else if (kmNum === 0 && amt === 500) totalCancel500++;
    else if (kmNum === 0 && amt === 1000) totalCancel1000++;
  }

  dateCount[parsed.date] = (dateCount[parsed.date] || 0) + 1;
  summaries.push({
    date: parsed.date,
    occurrence: dateCount[parsed.date],
    vehicleType: inferredVehicle,
    vehicleSource: parsed.vehicleType ? 'header' : 'auto',
    pickupRatio: ratio,
    departureTime: parsed.departureTime,
    returnTime: parsed.returnTime,
    tripCount: trips.length,
    cancelCount: cancelTrips.length,
    totalAmount,
    rests: parsed.rests.length
  });
}

const dups = Object.entries(dateCount).filter(([_, c]) => c > 1).map(([d]) => d);
const premiumDays = summaries.filter(s => s.vehicleType === 'premium').length;
const regularDays = summaries.filter(s => s.vehicleType === 'japantaxi').length;

console.log('=== 検証結果 ===');
console.log(`総セクション: ${sections.length}`);
console.log(`パース成功: ${summaries.length}`);
console.log(`パース失敗: ${errors.length}`);
console.log(`ユニーク日付: ${Object.keys(dateCount).length}`);
console.log(`重複日付: ${dups.length} 件 → ${dups.join(', ') || '(なし)'}`);
console.log('');
console.log('キャンセル統計:');
console.log(`  「キ」明示マーカー:  ${totalCancelMarker}`);
console.log(`  ¥400 (無条件):       ${totalCancel400}`);
console.log(`  ¥500 + 0km:          ${totalCancel500}`);
console.log(`  ¥1000 + 0km:         ${totalCancel1000}`);
console.log(`  合計:                ${totalCancelMarker + totalCancel400 + totalCancel500 + totalCancel1000}`);
console.log('');
console.log(`車種推論: premium ${premiumDays} / japantaxi ${regularDays}`);
console.log('');
console.log('=== 各日サマリ ===');
console.log('# 日付       occ vehicle(src) pickup% trips canc 売上     出-帰');
for (const s of summaries) {
  const occMark = s.occurrence > 1 ? `*${s.occurrence}` : '  ';
  const ratioStr = (s.pickupRatio * 100).toFixed(0).padStart(3) + '%';
  console.log(
    `${s.date} ${occMark} ${s.vehicleType.padEnd(7)}(${s.vehicleSource}) ${ratioStr} ${String(s.tripCount).padStart(3)} ${String(s.cancelCount).padStart(3)} ¥${String(s.totalAmount).padStart(7)} ${s.departureTime}-${s.returnTime}`
  );
}
if (errors.length) {
  console.log('');
  console.log('=== パースエラー ===');
  for (const e of errors) console.log(`#${e.index}: ${e.error} | ${e.head}`);
}

const outPath = TEXT_PATH.replace(/\.txt$/, '-validated.json');
writeFileSync(outPath, JSON.stringify({ summaries, duplicates: dups, totals: { cancelMarker: totalCancelMarker, cancel400: totalCancel400, cancel500: totalCancel500, cancel1000: totalCancel1000, premiumDays, regularDays }, errors, sections: sections.length }, null, 2));
console.log('');
console.log(`詳細JSON: ${outPath}`);

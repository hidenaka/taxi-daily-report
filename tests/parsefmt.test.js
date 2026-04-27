import { test, assert } from './run.js';
import { parseFormattedReport } from '../js/parser.js';
import { readFileSync } from 'node:fs';

test('parseFormattedReport: ヘッダー4項目を抽出', () => {
  const text = readFileSync('tests/fixtures/sample-formatted.txt', 'utf-8');
  const r = parseFormattedReport(text);
  assert.equal(r.date, '2026-04-26');
  assert.equal(r.vehicleType, 'premium');
  assert.equal(r.departureTime, '07:00');
  assert.equal(r.returnTime, '01:16');
});

test('parseFormattedReport: trips 2件・rests 1件を抽出', () => {
  const text = readFileSync('tests/fixtures/sample-formatted.txt', 'utf-8');
  const r = parseFormattedReport(text);
  assert.equal(r.trips.length, 2);
  assert.equal(r.rests.length, 1);
});

test('parseFormattedReport: 引用符付き金額をパース', () => {
  const text = readFileSync('tests/fixtures/sample-formatted.txt', 'utf-8');
  const r = parseFormattedReport(text);
  assert.equal(r.trips[0].amount, 3600);
  assert.equal(r.trips[1].amount, 2100);
});

test('parseFormattedReport: 男女列を無視して正しく合計列を取る', () => {
  const text = readFileSync('tests/fixtures/sample-formatted.txt', 'utf-8');
  const r = parseFormattedReport(text);
  assert.equal(r.trips[0].boardPlace, '大田区上池台4');
  assert.equal(r.trips[0].alightPlace, '港区港南2');
  assert.equal(r.trips[0].km, 6.7);
});

test('parseFormattedReport: 不完全ヘッダーでも data 部分は処理', () => {
  const text = '日付: 2026-04-26\n---\nNo,乗車,降車,時間,迎,乗車地,降車地,営Km,男,女,合計\n1,07:00,07:10,0:10,,A,B,1.0,,,"500"';
  const r = parseFormattedReport(text);
  assert.equal(r.date, '2026-04-26');
  assert.equal(r.vehicleType, '');
  assert.equal(r.trips.length, 1);
});

test('parseFormattedReport: --- 区切りなしならthrow', () => {
  const text = '日付: 2026-04-26\n車種: premium\n出庫: 07:00\n帰庫: 23:00';
  assert.throws(() => parseFormattedReport(text), /--- separator not found/);
});

test('parseFormattedReport: rawText に元テキストをそのまま含む', () => {
  const text = readFileSync('tests/fixtures/sample-formatted.txt', 'utf-8');
  const r = parseFormattedReport(text);
  assert.equal(r.rawText, text);
});

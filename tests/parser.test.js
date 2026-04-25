import { test, assert } from './run.js';
import { parseReport, detectFormat } from '../js/parser.js';
import { readFileSync } from 'node:fs';

test('detectFormat: Claude形式（タブ）を判別', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  assert.equal(detectFormat(text), 'claude');
});

test('detectFormat: Gemini形式（CSV）を判別', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  assert.equal(detectFormat(text), 'gemini');
});

test('parseReport: Claude形式から trips 26件、rests 4件を抽出', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  const result = parseReport(text);
  assert.equal(result.trips.length, 26);
  assert.equal(result.rests.length, 4);
});

test('parseReport: Claude形式の最初のtripが正しい', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  const result = parseReport(text);
  const t = result.trips[0];
  assert.equal(t.no, 1);
  assert.equal(t.boardTime, '07:17');
  assert.equal(t.alightTime, '07:22');
  assert.equal(t.boardPlace, '品川区中延5');
  assert.equal(t.alightPlace, '品川区二葉4');
  assert.equal(t.km, 0.8);
  assert.equal(t.amount, 1000);
  assert.equal(t.isPickup, true);
  assert.equal(t.isCancel, false);
});

test('parseReport: Gemini形式から trips 25件、rests 6件を抽出', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  const result = parseReport(text);
  assert.equal(result.trips.length, 25);
  assert.equal(result.rests.length, 6);
});

test('parseReport: Gemini形式の最初のtripが正しい（引用符付き金額）', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  const result = parseReport(text);
  const t = result.trips[0];
  assert.equal(t.no, 1);
  assert.equal(t.boardTime, '07:17');
  assert.equal(t.alightTime, '07:38');
  assert.equal(t.boardPlace, '大田区上池台4');
  assert.equal(t.alightPlace, '港区港南2');
  assert.equal(t.km, 6.7);
  assert.equal(t.amount, 3600);  // "3,600" → 3600
});

test('parseReport: Gemini形式で「迎」フィールドが空の場合 isPickup=false', () => {
  const text = readFileSync('tests/fixtures/sample-gemini.csv', 'utf-8');
  const result = parseReport(text);
  // 23番（22:13到着）は「迎」が空（流し営業）
  const trip23 = result.trips.find(t => t.no === 23);
  assert.equal(trip23.isPickup, false);
});

test('parseReport: km=0 & amount=500 はキャンセル扱い、amount=0 に上書き', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
1\t10:00\t10:05\t0:05\t迎\t品川区A\t品川区A\t0\t500\t`;
  const result = parseReport(text);
  assert.equal(result.trips.length, 1);
  assert.equal(result.trips[0].isCancel, true);
  assert.equal(result.trips[0].amount, 0);
});

test('parseReport: km=0 & 乗車地==降車地 もキャンセル扱い（500円以外でも）', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
2\t11:00\t11:00\t0:00\t迎\t大田区西蒲田5\t大田区西蒲田5\t0\t0\t`;
  const result = parseReport(text);
  assert.equal(result.trips[0].isCancel, true);
  assert.equal(result.trips[0].amount, 0);
});

test('parseReport: 通常乗車（km>0）はキャンセル扱いにならない', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
3\t12:00\t12:10\t0:10\t迎\t品川区A\t品川区B\t2.0\t1500\t`;
  const result = parseReport(text);
  assert.equal(result.trips[0].isCancel, false);
  assert.equal(result.trips[0].amount, 1500);
});

test('parseReport: 末尾が「休」行なら returnTime をその endTime にする', () => {
  const text = readFileSync('tests/fixtures/sample-claude.txt', 'utf-8');
  const result = parseReport(text);
  // 末尾は「休 20:31 22:43」
  assert.equal(result.returnTime, '22:43');
});

test('parseReport: 末尾が乗車行なら returnTime は null', () => {
  const text = `No\t乗車\t降車\t時間\t迎\t乗車地\t降車地\t営Km\t合計\t待機
1\t12:00\t12:10\t0:10\t迎\t品川区A\t品川区B\t2.0\t1500\t`;
  const result = parseReport(text);
  assert.equal(result.returnTime, null);
});

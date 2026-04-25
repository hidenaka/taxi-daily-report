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

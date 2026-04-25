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

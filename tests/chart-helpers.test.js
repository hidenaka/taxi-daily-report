import { test } from 'node:test';
import assert from 'node:assert';
import { hourlyDowEfficiency } from '../js/chart-helpers.js';

test('hourlyDowEfficiency: 休憩中の時間は実稼働時間 (workingMin) から除外される', () => {
  // 木曜 (2026-04-23 は木曜)
  // 出庫 18:00、帰庫 20:00、休憩 18:00-19:30 → 18時セルは休憩で全埋め(workingMin=0)、19時セルは19:30まで休憩で30分稼働
  const drives = [{
    date: '2026-04-23',
    departureTime: '18:00',
    returnTime: '20:00',
    trips: [],
    rests: [{ startTime: '18:00', endTime: '19:30', place: 'X' }]
  }];
  const m = hourlyDowEfficiency(drives);
  const dow = 4; // 木曜
  assert.equal(m[dow][18].workingMin, 0, '18時セルは休憩で全埋め');
  assert.equal(m[dow][19].workingMin, 30, '19時セルは19:30まで休憩、30分間稼働');
});

test('hourlyDowEfficiency: hourlyA は workingMin ベース(売上÷実稼働時間)', () => {
  const drives = [{
    date: '2026-04-23',
    departureTime: '18:00',
    returnTime: '20:00',
    trips: [{ no: 1, boardTime: '19:30', alightTime: '19:50', boardPlace: 'A', alightPlace: 'B', km: 5, amount: 3000, isPickup: true, isCancel: false, waitTime: '' }],
    rests: [{ startTime: '18:00', endTime: '19:30', place: 'X' }]
  }];
  const m = hourlyDowEfficiency(drives);
  const dow = 4;
  // 19時セル: workingMin=30, sales=3000, hourlyA = 3000 / (30/60) = 6000
  assert.equal(m[dow][19].sales, 3000);
  assert.equal(m[dow][19].workingMin, 30);
  assert.equal(m[dow][19].hourlyA, 6000);
});

test('hourlyDowEfficiency: hourlyB は削除されている', () => {
  const drives = [{
    date: '2026-04-23',
    departureTime: '18:00',
    returnTime: '20:00',
    trips: [],
    rests: []
  }];
  const m = hourlyDowEfficiency(drives);
  assert.equal(m[4][18].hourlyB, undefined, 'hourlyB プロパティは削除済み');
});

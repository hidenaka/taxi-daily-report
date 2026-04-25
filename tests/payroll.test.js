import { test, assert } from './run.js';
import { calcDailySales, calcMonthlySales } from '../js/payroll.js';

test('calcDailySales: trips のキャンセル除いた合計（税込）', () => {
  const drive = {
    trips: [
      { amount: 1000, isCancel: false },
      { amount: 6300, isCancel: false },
      { amount: 0, isCancel: true },     // キャンセルは除外
      { amount: 2000, isCancel: false }
    ]
  };
  assert.equal(calcDailySales(drive).inclTax, 9300);
  assert.equal(calcDailySales(drive).exclTax, 9300 / 1.1);
});

test('calcMonthlySales: drives全体の合計', () => {
  const drives = [
    { trips: [{ amount: 50000, isCancel: false }] },
    { trips: [{ amount: 60000, isCancel: false }, { amount: 500, isCancel: true }] }
  ];
  const result = calcMonthlySales(drives);
  assert.equal(result.inclTax, 110000);
  assert.equal(result.exclTax, 110000 / 1.1);
  assert.equal(result.shiftCount, 2);
});

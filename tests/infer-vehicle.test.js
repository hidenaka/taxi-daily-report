import { test, assert } from './run.js';
import { inferVehicleType, PREMIUM_PICKUP_THRESHOLD } from '../scripts/lib/infer-vehicle.mjs';

test('inferVehicleType: 全迎車 → premium', () => {
  const trips = [{ isPickup: true }, { isPickup: true }, { isPickup: true }];
  const r = inferVehicleType(trips);
  assert.equal(r.value, 'premium');
  assert.equal(r.source, 'auto');
  assert.equal(r.ratio, 1);
});

test('inferVehicleType: 全流し → japantaxi', () => {
  const trips = [{ isPickup: false }, { isPickup: false }];
  assert.equal(inferVehicleType(trips).value, 'japantaxi');
});

test('inferVehicleType: 70%境界(7/10) → premium', () => {
  const trips = Array.from({ length: 10 }, (_, i) => ({ isPickup: i < 7 }));
  assert.equal(inferVehicleType(trips).value, 'premium');
});

test('inferVehicleType: 70%未満(6/10) → japantaxi', () => {
  const trips = Array.from({ length: 10 }, (_, i) => ({ isPickup: i < 6 }));
  assert.equal(inferVehicleType(trips).value, 'japantaxi');
});

test('inferVehicleType: 空配列 → unknown', () => {
  const r = inferVehicleType([]);
  assert.equal(r.value, '');
  assert.equal(r.source, 'unknown');
});

test('PREMIUM_PICKUP_THRESHOLD は 0.7', () => {
  assert.equal(PREMIUM_PICKUP_THRESHOLD, 0.7);
});

// scripts/lib/infer-vehicle.mjs
//
// 迎車率から車種(premium/japantaxi)を自動推定する純関数。
// 迎車率が PREMIUM_PICKUP_THRESHOLD 以上なら premium、未満なら japantaxi。

export const PREMIUM_PICKUP_THRESHOLD = 0.7;

/**
 * 乗務データの迎車率から車種を推定する。
 *
 * @param {Array<{isPickup: boolean}>} trips
 * @returns {{ value: string, source: string, ratio: number }}
 *   value  : 'premium' | 'japantaxi' | '' (空配列の場合)
 *   source : 'auto' | 'unknown'
 *   ratio  : 迎車率 (0.0 〜 1.0)
 */
export function inferVehicleType(trips) {
  if (!Array.isArray(trips) || trips.length === 0) {
    return { value: '', source: 'unknown', ratio: 0 };
  }
  const pickupCount = trips.filter(t => t.isPickup).length;
  const ratio = pickupCount / trips.length;
  const value = ratio >= PREMIUM_PICKUP_THRESHOLD ? 'premium' : 'japantaxi';
  return { value, source: 'auto', ratio };
}

const TAX_RATE = 1.1;

export function calcDailySales(drive) {
  const inclTax = (drive.trips || [])
    .filter(t => !t.isCancel)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  return {
    inclTax,
    exclTax: inclTax / TAX_RATE
  };
}

export function calcMonthlySales(drives) {
  let inclTax = 0;
  for (const drive of drives) {
    inclTax += calcDailySales(drive).inclTax;
  }
  return {
    inclTax,
    exclTax: inclTax / TAX_RATE,
    shiftCount: drives.length
  };
}

export function findRate(tiers, salesExclTax) {
  for (const tier of tiers) {
    if (salesExclTax >= tier.salesMin && salesExclTax < tier.salesMax) {
      return tier.rate;
    }
  }
  // 範囲外（最大超）→最大ティアの率
  return tiers[tiers.length - 1].rate;
}

export function calcBasePay(drives, config) {
  const monthly = calcMonthlySales(drives);
  const shiftCount = monthly.shiftCount;
  const salesExclTax = monthly.exclTax;

  if (shiftCount <= 11) {
    const tiers = config.rateTable[String(shiftCount)] || config.rateTable["11"];
    const rate = findRate(tiers, salesExclTax);
    return { basePay: salesExclTax * rate, rate, shiftCount };
  }
  // 12乗務以上は次のタスクで実装
  return { basePay: 0, rate: 0, shiftCount };
}

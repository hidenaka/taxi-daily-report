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
  const shiftCount = drives.length;

  if (shiftCount <= 11) {
    const monthly = calcMonthlySales(drives);
    const tiers = config.rateTable[String(shiftCount)] || config.rateTable["11"];
    const rate = findRate(tiers, monthly.exclTax);
    return { basePay: monthly.exclTax * rate, rate, shiftCount };
  }

  // 12乗務以上: 11乗務目までで歩率算出 + 12乗務目以降は固定率
  const drives11 = drives.slice(0, 11);
  const monthly11 = calcMonthlySales(drives11);
  const rate11 = findRate(config.rateTable["11"], monthly11.exclTax);
  let basePay = monthly11.exclTax * rate11;

  const extraRate = config.rateTable["12_13rate"];
  for (const drive of drives.slice(11)) {
    const daily = calcDailySales(drive);
    basePay += daily.exclTax * extraRate;
  }

  return { basePay, rate: rate11, shiftCount, extraRate };
}

export function calcIncentive(drives, config) {
  const { thresholdSalesExclTax, amountPerShift } = config.premiumIncentive;
  let total = 0;
  for (const drive of drives) {
    if (drive.vehicleType !== 'premium') continue;
    const daily = calcDailySales(drive);
    if (daily.exclTax > thresholdSalesExclTax) total += amountPerShift;
  }
  return total;
}

export function calcTotalPay(drives, config) {
  const base = calcBasePay(drives, config);
  const incentive = calcIncentive(drives, config);
  return {
    ...base,
    incentive,
    total: base.basePay + incentive
  };
}

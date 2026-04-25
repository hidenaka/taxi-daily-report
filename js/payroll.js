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

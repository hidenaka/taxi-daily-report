// "HH:MM" → 分
export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// 1乗務の時間配分を分単位で返す（実車/休憩/空車）
export function calcTimeBreakdown(drive) {
  const dep = timeToMinutes(drive.departureTime);
  let ret = timeToMinutes(drive.returnTime);
  if (ret < dep) ret += 24 * 60; // 翌日にまたがる
  const totalMin = ret - dep;

  const tripMin = (drive.trips || [])
    .filter(t => !t.isCancel)
    .reduce((s, t) => {
      let dur = timeToMinutes(t.alightTime) - timeToMinutes(t.boardTime);
      if (dur < 0) dur += 24 * 60;
      return s + dur;
    }, 0);

  const restMin = (drive.rests || []).reduce((s, r) => {
    let dur = timeToMinutes(r.endTime) - timeToMinutes(r.startTime);
    if (dur < 0) dur += 24 * 60;
    return s + dur;
  }, 0);

  const idleMin = Math.max(0, totalMin - tripMin - restMin);
  return { totalMin, tripMin, restMin, idleMin };
}

// 1時間ごとの売上配列（24要素、000-2300）
export function salesByHour(drive) {
  const hours = Array(24).fill(0);
  for (const t of (drive.trips || [])) {
    if (t.isCancel) continue;
    const start = timeToMinutes(t.boardTime);
    const h = Math.floor(start / 60);
    if (h >= 0 && h < 24) hours[h] += t.amount;
  }
  return hours;
}

export function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

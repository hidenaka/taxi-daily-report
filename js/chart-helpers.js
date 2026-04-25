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

// 1時間ごとの実車時間(分)配列。tripが時間境界をまたぐ場合は分割
export function tripMinByHour(drive) {
  const mins = Array(24).fill(0);
  for (const t of (drive.trips || [])) {
    if (t.isCancel) continue;
    let start = timeToMinutes(t.boardTime);
    let end = timeToMinutes(t.alightTime);
    if (end < start) end += 24 * 60;
    let m = start;
    while (m < end) {
      const h = Math.floor(m / 60) % 24;
      const nextHourMark = (Math.floor(m / 60) + 1) * 60;
      const segEnd = Math.min(end, nextHourMark);
      mins[h] += (segEnd - m);
      m = segEnd;
    }
  }
  return mins;
}

// 1時間ごとの休憩時間(分)配列
export function restMinByHour(drive) {
  const mins = Array(24).fill(0);
  for (const r of (drive.rests || [])) {
    let start = timeToMinutes(r.startTime);
    let end = timeToMinutes(r.endTime);
    if (end < start) end += 24 * 60;
    let m = start;
    while (m < end) {
      const h = Math.floor(m / 60) % 24;
      const nextHourMark = (Math.floor(m / 60) + 1) * 60;
      const segEnd = Math.min(end, nextHourMark);
      mins[h] += (segEnd - m);
      m = segEnd;
    }
  }
  return mins;
}

// 7時スタート(または指定)の順序で {hour, sales, tripMin, restMin} を返す
export function hourlyActivity(drive, startHour = 7) {
  const sales = salesByHour(drive);
  const tripMins = tripMinByHour(drive);
  const restMins = restMinByHour(drive);
  return Array.from({ length: 24 }, (_, i) => {
    const h = (startHour + i) % 24;
    return { hour: h, sales: sales[h], tripMin: tripMins[h], restMin: restMins[h] };
  });
}

// summary-only な drive: 詳細trip単位のデータがなく合計のみ
export function isSummaryOnly(drive) {
  if (drive._importedFrom === 'spreadsheet') return true;
  return (drive.trips || []).some(t => t._periodCount);
}

// 時間帯キー: 朝(13時まで)/昼(13〜18時)/夜(18〜23時)/深夜(23時〜)
export function getPeriodKey(timeStr) {
  const m = timeToMinutes(timeStr);
  if (m >= 23 * 60 || m < 7 * 60) return 'night';
  if (m < 13 * 60) return 'morning';
  if (m < 18 * 60) return 'noon';
  return 'evening';
}

export const PERIOD_LABELS = {
  morning: '朝(13時まで)',
  noon: '昼(13〜18時)',
  evening: '夜(18〜23時)',
  night: '深夜(23時〜)'
};

// 1乗務を時間帯別に集計
export function calcPeriodBreakdown(drive) {
  const empty = () => ({ sales: 0, count: 0, tripMin: 0, restMin: 0 });
  const result = { morning: empty(), noon: empty(), evening: empty(), night: empty() };
  for (const t of (drive.trips || [])) {
    if (t.isCancel) continue;
    const k = getPeriodKey(t.boardTime);
    result[k].sales += (t.amount || 0);
    result[k].count++;
    let dur = timeToMinutes(t.alightTime) - timeToMinutes(t.boardTime);
    if (dur < 0) dur += 24 * 60;
    result[k].tripMin += dur;
  }
  for (const r of (drive.rests || [])) {
    const k = getPeriodKey(r.startTime);
    let dur = timeToMinutes(r.endTime) - timeToMinutes(r.startTime);
    if (dur < 0) dur += 24 * 60;
    result[k].restMin += dur;
  }
  return result;
}

// 複数乗務の時間帯別集計を合算
export function aggregatePeriodBreakdowns(drives) {
  const empty = () => ({ sales: 0, count: 0, tripMin: 0, restMin: 0 });
  const total = { morning: empty(), noon: empty(), evening: empty(), night: empty() };
  for (const d of drives) {
    const b = calcPeriodBreakdown(d);
    for (const k of Object.keys(total)) {
      total[k].sales += b[k].sales;
      total[k].count += b[k].count;
      total[k].tripMin += b[k].tripMin;
      total[k].restMin += b[k].restMin;
    }
  }
  return total;
}

export function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ====== 振り返り分析関数 ======

// dateOfWeek (0=日, 1=月, ... 6=土)
export function dowOf(isoDate) {
  return new Date(isoDate + 'T00:00:00+09:00').getDay();
}

// 曜日 × 時間帯 平均売上マトリックス
// returns { matrix: [7][4] = avgSales, count: [7][4] = 日数 }
export function dowPeriodMatrix(drives) {
  const sumMap = Array.from({length: 7}, () => ({morning:0, noon:0, evening:0, night:0}));
  const countMap = Array.from({length: 7}, () => ({morning:0, noon:0, evening:0, night:0}));
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    const dow = dowOf(d.date);
    const pb = calcPeriodBreakdown(d);
    for (const k of ['morning','noon','evening','night']) {
      sumMap[dow][k] += pb[k].sales;
      if (pb[k].count > 0) countMap[dow][k]++;
    }
  }
  const matrix = sumMap.map((row, i) => {
    const r = {};
    for (const k of ['morning','noon','evening','night']) {
      r[k] = countMap[i][k] > 0 ? sumMap[i][k] / countMap[i][k] : 0;
    }
    return r;
  });
  return { matrix, count: countMap };
}

// 日別売上一覧 → ベスト/ワースト
export function rankDrivesBySales(drives, n = 10) {
  const detailed = drives.filter(d => !isSummaryOnly(d)).map(d => {
    const valid = (d.trips || []).filter(t => !t.isCancel);
    const sales = valid.reduce((s,t) => s + (t.amount || 0), 0);
    return {
      date: d.date,
      sales,
      count: valid.length,
      dow: dowOf(d.date),
      weather: d.weather,
      vehicleType: d.vehicleType,
    };
  }).filter(d => d.sales > 0);
  const sorted = [...detailed].sort((a,b) => b.sales - a.sales);
  return {
    best: sorted.slice(0, n),
    worst: sorted.slice(-n).reverse()
  };
}

// 天気別売上集計 (主に日中の天気で判定)
export function weatherSalesAggregation(drives) {
  const buckets = { sunny: [], cloudy: [], rainy: [], snowy: [] };
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    if (!d.weather) continue;
    const w = d.weather.noon || d.weather.morning;
    if (!w) continue;
    const code = w.code;
    let bucket;
    if (code >= 71 && code <= 77) bucket = 'snowy';
    else if (code >= 51 && code <= 67) bucket = 'rainy';
    else if (code >= 80) bucket = 'rainy';
    else if (code >= 2) bucket = 'cloudy';
    else bucket = 'sunny';
    const valid = (d.trips || []).filter(t => !t.isCancel);
    const sales = valid.reduce((s,t) => s + (t.amount || 0), 0);
    if (sales > 0) buckets[bucket].push(sales);
  }
  const result = {};
  for (const k of Object.keys(buckets)) {
    const arr = buckets[k];
    result[k] = {
      days: arr.length,
      avg: arr.length > 0 ? arr.reduce((s,v)=>s+v,0) / arr.length : 0,
      total: arr.reduce((s,v)=>s+v,0)
    };
  }
  return result;
}

export const WEATHER_LABELS = { sunny: '晴れ', cloudy: '曇り', rainy: '雨', snowy: '雪' };
export const DOW_LABELS = ['日','月','火','水','木','金','土'];

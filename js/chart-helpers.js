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

// 1乗務の出庫〜帰庫を時間帯ごとに分割 (分単位)
export function periodMinutesInDrive(drive) {
  const result = { morning: 0, noon: 0, evening: 0, night: 0 };
  if (!drive.departureTime || !drive.returnTime) return result;
  const dep = timeToMinutes(drive.departureTime);
  let ret = timeToMinutes(drive.returnTime);
  if (ret < dep) ret += 24 * 60;
  // 1分刻みで時間帯判定
  for (let m = dep; m < ret; m++) {
    const h = Math.floor(m / 60) % 24;
    let k;
    if (h >= 23 || h < 7) k = 'night';
    else if (h < 13) k = 'morning';
    else if (h < 18) k = 'noon';
    else k = 'evening';
    result[k]++;
  }
  return result;
}

// 1乗務を時間帯別に集計
export function calcPeriodBreakdown(drive) {
  const empty = () => ({ sales: 0, count: 0, tripMin: 0, restMin: 0, periodMin: 0 });
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
  // 各時間帯の滞在時間 (出庫〜帰庫を時間帯で分割)
  const pm = periodMinutesInDrive(drive);
  for (const k of Object.keys(result)) result[k].periodMin = pm[k];
  return result;
}

// 複数乗務の時間帯別集計を合算
export function aggregatePeriodBreakdowns(drives) {
  const empty = () => ({ sales: 0, count: 0, tripMin: 0, restMin: 0, periodMin: 0 });
  const total = { morning: empty(), noon: empty(), evening: empty(), night: empty() };
  for (const d of drives) {
    const b = calcPeriodBreakdown(d);
    for (const k of Object.keys(total)) {
      total[k].sales += b[k].sales;
      total[k].count += b[k].count;
      total[k].tripMin += b[k].tripMin;
      total[k].restMin += b[k].restMin;
      total[k].periodMin += b[k].periodMin;
    }
  }
  return total;
}

export function formatMin(min) {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
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

// 出庫時刻基準で時刻文字列→minutes (0=出庫、出庫前は翌日扱い)
function minsFromDep(timeStr, depHour) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0]), m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  let mins = h * 60 + m;
  if (mins < depHour * 60) mins += 24 * 60;
  return mins - depHour * 60;
}

// 出庫時刻別+任意の経過分単位での平均/最大/最小累積
// depHour: 数値 or 数値配列(複数許容、例: [7,8,9])
// dowFilter: null=全曜日, 0-6=その曜日のみ
export function calcPaceAtElapsed(drives, depHour, elapsedMin, dowFilter = null) {
  const allowedHours = Array.isArray(depHour) ? depHour : [depHour];
  const matched = drives.filter(d => {
    if (isSummaryOnly(d)) return false;
    if (!d.departureTime) return false;
    const h = parseInt(d.departureTime.split(':')[0]);
    if (!allowedHours.includes(h)) return false;
    if (dowFilter != null && dowOf(d.date) !== dowFilter) return false;
    return true;
  });
  if (matched.length === 0 || elapsedMin <= 0) return { days: 0, totalDays: matched.length, samples: [] };
  const samples = [];
  for (const d of matched) {
    const dh = parseInt(d.departureTime.split(':')[0]);
    let s = 0, tm = 0, rm = 0, cnt = 0, active = false;
    for (const t of (d.trips || [])) {
      if (t.isCancel) continue;
      const bm = minsFromDep(t.boardTime, dh);
      if (bm == null || bm >= elapsedMin) continue;
      s += (t.amount || 0);
      cnt++;
      const am = minsFromDep(t.alightTime, dh);
      if (am != null) {
        let dur = am - bm;
        if (dur < 0) dur += 24 * 60;
        if (bm + dur > elapsedMin) dur = elapsedMin - bm;
        tm += Math.max(0, dur);
      }
      active = true;
    }
    for (const r of (d.rests || [])) {
      const sm = minsFromDep(r.startTime, dh);
      if (sm == null || sm >= elapsedMin) continue;
      const em = minsFromDep(r.endTime, dh);
      if (em != null) {
        let dur = em - sm;
        if (dur < 0) dur += 24 * 60;
        if (sm + dur > elapsedMin) dur = elapsedMin - sm;
        rm += Math.max(0, dur);
      }
      active = true;
    }
    if (active) samples.push({ date: d.date, sales: s, count: cnt, tripMin: tm, restMin: rm });
  }
  if (samples.length === 0) return { days: 0, totalDays: matched.length, samples };
  const sumSales = samples.reduce((s,v) => s + v.sales, 0);
  const sumRest = samples.reduce((s,v) => s + v.restMin, 0);
  const sumTrip = samples.reduce((s,v) => s + v.tripMin, 0);
  const sumCount = samples.reduce((s,v) => s + v.count, 0);
  const maxSamp = samples.reduce((a,b) => a.sales >= b.sales ? a : b);
  const minSamp = samples.reduce((a,b) => a.sales <= b.sales ? a : b);
  const restVals = samples.map(v => v.restMin);
  const countVals = samples.map(v => v.count);
  return {
    days: samples.length,
    totalDays: matched.length,
    avgSales: sumSales / samples.length,
    avgRest: sumRest / samples.length,
    avgTrip: sumTrip / samples.length,
    avgCount: sumCount / samples.length,
    maxSales: maxSamp.sales,
    maxDate: maxSamp.date,
    minSales: minSamp.sales,
    minDate: minSamp.date,
    maxRest: Math.max(...restVals),
    minRest: Math.min(...restVals),
    maxCount: Math.max(...countVals),
    minCount: Math.min(...countVals),
  };
}

// drives中に存在する出庫時刻のhour一覧 (件数付き)
export function depHourDistribution(drives) {
  const counts = {};
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    if (!d.departureTime) continue;
    const h = parseInt(d.departureTime.split(':')[0]);
    if (!isNaN(h)) counts[h] = (counts[h] || 0) + 1;
  }
  return counts;
}

// 曜日別の集計 (各日数/平均営収/平均件数/平均時間単価/平均乗務時間/ベスト日)
// 曜日(0-6) × 時間(0-23) × 効率 マトリクス
// 各セル: { sales, activeMin, presentMin, count, days, hourlyA, hourlyB }
//   sales: その時間バケットに発生した売上 (時間按分)
//   activeMin: 実車中だった合計分
//   presentMin: 乗務中(出庫〜帰庫)だった合計分 (=空車+実車+休憩 全て含む)
//   count: その時間バケット開始のtrip数
//   days: その時間バケットに乗務していた日数
//   hourlyA: 実労働時間効率 sales / (presentMin/60)  ← A: 「その時間にいると1hあたりいくら稼げるか」
//   hourlyB: 1日あたり売上 sales / days  ← B: 「その時間帯に1日平均いくら売上が立つか」
export function hourlyDowEfficiency(drives) {
  const matrix = Array.from({length: 7}, () =>
    Array.from({length: 24}, () => ({ sales: 0, activeMin: 0, presentMin: 0, count: 0, days: 0 }))
  );
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    if (!d.date) continue;
    const dow = dowOf(d.date);
    if (d.departureTime && d.returnTime) {
      const dep = timeToMinutes(d.departureTime);
      let ret = timeToMinutes(d.returnTime);
      if (ret < dep) ret += 24 * 60;
      // 各時間バケットに乗務範囲が重なる分数を集計
      const startBucket = Math.floor(dep / 60);
      const endBucket = Math.floor((ret - 1) / 60);
      const seen = new Set();
      for (let bi = startBucket; bi <= endBucket; bi++) {
        const bucketStart = bi * 60;
        const bucketEnd = bucketStart + 60;
        const overlap = Math.max(0, Math.min(bucketEnd, ret) - Math.max(bucketStart, dep));
        if (overlap <= 0) continue;
        const h = bi % 24;
        matrix[dow][h].presentMin += overlap;
        if (!seen.has(h)) { seen.add(h); matrix[dow][h].days++; }
      }
    }
    for (const t of (d.trips || [])) {
      if (t.isCancel) continue;
      const start = timeToMinutes(t.boardTime);
      let end = timeToMinutes(t.alightTime);
      if (end < start) end += 24 * 60;
      const dur = Math.max(1, end - start);
      let cur = start;
      while (cur < end) {
        const h = Math.floor(cur / 60) % 24;
        const next = Math.min(end, (Math.floor(cur / 60) + 1) * 60);
        const slice = next - cur;
        matrix[dow][h].activeMin += slice;
        matrix[dow][h].sales += (t.amount || 0) * (slice / dur);
        cur = next;
      }
      const bh = Math.floor(start / 60) % 24;
      matrix[dow][bh].count++;
    }
  }
  for (let dow = 0; dow < 7; dow++) {
    for (let h = 0; h < 24; h++) {
      const c = matrix[dow][h];
      c.hourlyA = c.presentMin > 0 ? c.sales / (c.presentMin / 60) : 0;
      c.hourlyB = c.days > 0 ? c.sales / c.days : 0;
    }
  }
  return matrix;
}

// 場所文字列から区+町名 (丁目番号を除いた地名) を抽出
// 例: "大田区羽田空港3" → "大田区羽田空港", "新宿区霞ヶ丘町" → "新宿区霞ヶ丘町"
export function extractArea(place) {
  if (!place) return '';
  return place.replace(/\d+$/, '').trim();
}

// 過去データから近隣エリアを自動推定
// 「降車→短時間(maxWaitMin以内)で次乗車」のペアが minPairs 件以上発生したエリア同士を近隣と判定
// 戻り値: { area: Set<neighborArea> }
export function buildNeighborMap(drives, { minPairs = 2, maxWaitMin = 25 } = {}) {
  const pairs = {};
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    const trips = (d.trips || []).filter(t => !t.isCancel);
    for (let i = 0; i < trips.length - 1; i++) {
      const t = trips[i];
      const next = trips[i + 1];
      const a = extractArea(t.alightPlace);
      const b = extractArea(next.boardPlace);
      if (!a || !b || a === b) continue;
      let wait = timeToMinutes(next.boardTime) - timeToMinutes(t.alightTime);
      if (wait < 0) wait += 24 * 60;
      if (wait > maxWaitMin) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      pairs[key] = (pairs[key] || 0) + 1;
    }
  }
  const neighbors = {};
  for (const [key, count] of Object.entries(pairs)) {
    if (count < minPairs) continue;
    const [a, b] = key.split('|');
    if (!neighbors[a]) neighbors[a] = new Set();
    if (!neighbors[b]) neighbors[b] = new Set();
    neighbors[a].add(b);
    neighbors[b].add(a);
  }
  return neighbors;
}

// 特定の降車エリアで降ろした後、次にどのエリアで乗車した時の効率が良かったか
// 待ち時間 30分以内のtripのみを集計 (=降ろした近辺で取れた仕事)
// periodFilter: null=全時間帯, 'morning'/'noon'/'evening'/'night' のいずれか (alightTime基準)
// neighbors: buildNeighborMap の結果。指定すれば降車エリアの近隣も対象に含める
// 戻り値: { rows, includedAreas, totalDropoffs, totalNextWithin30 }
//   各row: { area, count, avgWait, avgSales, avgDur, efficiency, ratio15, ratio30, totalSeen }
//     totalSeen: そのエリアで降ろした件数(母数)
//     count: そのうち30分以内に次が取れた件数
//     ratio15: 15分以内取得率(=count15/totalSeen)
//     ratio30: 30分以内取得率(=count/totalSeen)
export function nextBoardBreakdown(drives, dropoffArea, periodFilter = null, neighbors = null) {
  const targetAreas = new Set([dropoffArea]);
  if (neighbors && neighbors[dropoffArea]) {
    for (const n of neighbors[dropoffArea]) targetAreas.add(n);
  }
  const groups = {};   // nextArea → { count, totalWait, totalSales, totalDur, count15 }
  const seenByNextArea = {}; // nextArea ごとの母数(降車後の機会総数) は計算しないので、別途totalSeenだけ管理
  let totalDropoffs = 0;
  let totalNextWithin30 = 0;
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    const trips = (d.trips || []).filter(t => !t.isCancel);
    for (let i = 0; i < trips.length - 1; i++) {
      const t = trips[i];
      if (!targetAreas.has(extractArea(t.alightPlace))) continue;
      if (periodFilter && getPeriodKey(t.alightTime) !== periodFilter) continue;
      totalDropoffs++;
      const next = trips[i + 1];
      const nextArea = extractArea(next.boardPlace);
      if (!nextArea) continue;
      let wait = timeToMinutes(next.boardTime) - timeToMinutes(t.alightTime);
      if (wait < 0) wait += 24 * 60;
      // 30分超は集計対象外 (=移動先で取った扱い、近隣の判断材料にしない)
      if (wait > 30) continue;
      totalNextWithin30++;
      let nd = timeToMinutes(next.alightTime) - timeToMinutes(next.boardTime);
      if (nd < 0) nd += 24 * 60;
      if (!groups[nextArea]) groups[nextArea] = { count: 0, count15: 0, totalWait: 0, totalSales: 0, totalDur: 0 };
      groups[nextArea].count++;
      if (wait <= 15) groups[nextArea].count15++;
      groups[nextArea].totalWait += wait;
      groups[nextArea].totalSales += (next.amount || 0);
      groups[nextArea].totalDur += nd;
    }
  }
  const rows = Object.entries(groups).map(([area, g]) => {
    const avgWait = g.totalWait / g.count;
    const avgSales = g.totalSales / g.count;
    const avgDur = g.totalDur / g.count;
    const efficiency = (avgWait + avgDur) > 0 ? avgSales / (avgWait + avgDur) * 60 : 0;
    // 取得率は「降車機会(totalDropoffs)に対する」割合
    const ratio15 = totalDropoffs > 0 ? g.count15 / totalDropoffs : 0;
    const ratio30 = totalDropoffs > 0 ? g.count / totalDropoffs : 0;
    return { area, count: g.count, count15: g.count15, avgWait, avgSales, avgDur, efficiency, ratio15, ratio30 };
  }).sort((a, b) => b.efficiency - a.efficiency);
  return { rows, includedAreas: Array.from(targetAreas), totalDropoffs, totalNextWithin30 };
}

// 全trip の平均単価 (全期間・キャンセル除外)
export function avgTripSales(drives) {
  let sum = 0, count = 0;
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    for (const t of (d.trips || [])) {
      if (t.isCancel) continue;
      sum += (t.amount || 0);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// 目標時給(¥/h) = 手取り目標 ÷ 控除前必要売上比 ÷ 月乗務数 ÷ 平均乗務時間
// config: { takeHomeTarget, takeHomeRate, responsibilityShifts }
export function calcTargetHourly(drives, config) {
  const target = config.takeHomeTarget || 500000;
  const rate = config.takeHomeRate || 0.75;
  const shifts = config.responsibilityShifts || 12;
  const requiredSales = target / rate;
  // 平均乗務時間 (過去データから算出。データなしなら18h想定)
  const detailed = drives.filter(d => !isSummaryOnly(d) && d.departureTime && d.returnTime);
  let totalMin = 0;
  for (const d of detailed) totalMin += calcTimeBreakdown(d).totalMin;
  const avgShiftHours = detailed.length > 0 ? (totalMin / detailed.length / 60) : 18;
  return requiredSales / shifts / avgShiftHours;
}

// 推奨スコア化: 1行を評価
// efficiency, avgSales を targetHourly, avgSalesBaseline に対する比率で評価
// ratio30 = 取得率(0-1)
// 戻り値: { score, mark, effRatio, salesRatio }
//   mark: ◎(両方優秀) / ○(平均的) / △(片方が著しく低い) / ✕(両方低い=移動推奨)
export function evaluateRecommendRow({ efficiency, avgSales, ratio30 }, targetHourly, avgSalesBaseline) {
  const effRatio = targetHourly > 0 ? efficiency / targetHourly : 0;
  const salesRatio = avgSalesBaseline > 0 ? avgSales / avgSalesBaseline : 0;
  // スコア: 効率55% + 単価30% + 取得率15%
  const score = effRatio * 0.55 + salesRatio * 0.30 + (ratio30 || 0) * 0.15;
  let mark;
  if (effRatio < 0.7 && salesRatio < 0.7) mark = '✕';
  else if (effRatio < 0.7 || salesRatio < 0.65) mark = '△';
  else if (effRatio >= 1.3 && salesRatio >= 1.1) mark = '◎';
  else mark = '○';
  return { score, mark, effRatio, salesRatio };
}

// 高期待値エリア × 時間帯
// 各trip(乗車)を boardPlace × 時間帯(4区切り) で集計、平均単価高い順
// 「待ちは長いが期待値高い」エリア(羽田空港等)を発見するための指標
// 戻り値: [{ area, period, count, avgSales, avgDur, hourlyDuringTrip }]
export function highValueAreas(drives, { minSamples = 5 } = {}) {
  const groups = {}; // "area|period" → {count, sumSales, sumDur}
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    for (const t of (d.trips || [])) {
      if (t.isCancel) continue;
      const area = extractArea(t.boardPlace);
      if (!area) continue;
      const period = getPeriodKey(t.boardTime);
      let dur = timeToMinutes(t.alightTime) - timeToMinutes(t.boardTime);
      if (dur < 0) dur += 24 * 60;
      const key = `${area}|${period}`;
      if (!groups[key]) groups[key] = { count: 0, sumSales: 0, sumDur: 0 };
      groups[key].count++;
      groups[key].sumSales += (t.amount || 0);
      groups[key].sumDur += dur;
    }
  }
  const rows = [];
  for (const [key, g] of Object.entries(groups)) {
    if (g.count < minSamples) continue;
    const [area, period] = key.split('|');
    const avgSales = g.sumSales / g.count;
    const avgDur = g.sumDur / g.count;
    const hourlyDuringTrip = avgDur > 0 ? avgSales / (avgDur / 60) : 0;
    rows.push({ area, period, count: g.count, avgSales, avgDur, hourlyDuringTrip });
  }
  rows.sort((a, b) => b.avgSales - a.avgSales);
  return rows;
}

// 降車エリア別 効率分析
// 各trip 直後 (同日内) のwait時間と次trip売上を集計
// 「次の乗車エリア」分布も記録 → 降ろしたあとどこで次が取れる傾向かが分かる
export function dropoffAreaAnalysis(drives) {
  const areas = {};
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    const trips = (d.trips || []).filter(t => !t.isCancel);
    for (let i = 0; i < trips.length; i++) {
      const t = trips[i];
      const area = extractArea(t.alightPlace);
      if (!area) continue;
      if (!areas[area]) areas[area] = {
        dropoffs: 0,
        totalWaitMin: 0, waitCount: 0,
        totalNextSales: 0, nextCount: 0,
        totalNextDur: 0,
        nextBoards: {},
      };
      const a = areas[area];
      a.dropoffs++;
      const next = trips[i + 1];
      if (next) {
        let wait = timeToMinutes(next.boardTime) - timeToMinutes(t.alightTime);
        if (wait < 0) wait += 24 * 60;
        if (wait < 4 * 60) {
          a.totalWaitMin += wait;
          a.waitCount++;
        }
        a.totalNextSales += (next.amount || 0);
        a.nextCount++;
        let nd = timeToMinutes(next.alightTime) - timeToMinutes(next.boardTime);
        if (nd < 0) nd += 24 * 60;
        a.totalNextDur += nd;
        const nextBoardArea = extractArea(next.boardPlace);
        if (nextBoardArea) a.nextBoards[nextBoardArea] = (a.nextBoards[nextBoardArea] || 0) + 1;
      }
    }
  }
  const result = [];
  for (const [area, v] of Object.entries(areas)) {
    const avgWait = v.waitCount > 0 ? v.totalWaitMin / v.waitCount : null;
    const avgNextSales = v.nextCount > 0 ? v.totalNextSales / v.nextCount : null;
    const avgNextDur = v.nextCount > 0 ? v.totalNextDur / v.nextCount : null;
    let efficiency = null;
    if (avgWait != null && avgNextSales != null && avgNextDur != null) {
      const denom = avgWait + avgNextDur;
      if (denom > 0) efficiency = avgNextSales / denom * 60;
    }
    const topNextBoards = Object.entries(v.nextBoards)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area, count]) => ({ area, count, pct: count / v.nextCount }));
    result.push({ area, dropoffs: v.dropoffs, avgWait, avgNextSales, avgNextDur, efficiency, nextCount: v.nextCount, topNextBoards });
  }
  return result;
}

export function dowAggregation(drives) {
  const empty = () => ({ days: 0, totalSales: 0, totalCount: 0, totalTripMin: 0, totalShiftMin: 0, bestSales: 0, bestDate: null });
  const result = Array.from({length: 7}, empty);
  for (const d of drives) {
    if (isSummaryOnly(d)) continue;
    const dow = dowOf(d.date);
    const valid = (d.trips || []).filter(t => !t.isCancel);
    const sales = valid.reduce((s,t) => s + (t.amount || 0), 0);
    if (sales === 0) continue;
    const bd = calcTimeBreakdown(d);
    result[dow].days++;
    result[dow].totalSales += sales;
    result[dow].totalCount += valid.length;
    result[dow].totalTripMin += bd.tripMin;
    result[dow].totalShiftMin += bd.totalMin;
    if (sales > result[dow].bestSales) {
      result[dow].bestSales = sales;
      result[dow].bestDate = d.date;
    }
  }
  return result;
}

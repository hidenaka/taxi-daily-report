const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';

// WMO weather codes → 日本語ラベル
const WMO_LABELS = {
  0: '快晴', 1: '晴', 2: '一部曇', 3: '曇',
  45: '霧', 48: '霧',
  51: '霧雨', 53: '霧雨', 55: '霧雨',
  61: '小雨', 63: '雨', 65: '強雨',
  71: '小雪', 73: '雪', 75: '大雪',
  80: 'にわか雨', 81: 'にわか雨', 82: '激しいにわか雨',
  95: '雷雨', 96: '雷雨', 99: '激しい雷雨'
};

export function weatherLabel(code) {
  return WMO_LABELS[code] || '不明';
}

// 1日分の天候を時間別で取得 → 4区分に集計
export async function fetchWeatherForDate(date, location) {
  const today = new Date().toISOString().slice(0, 10);
  const isPast = date < today;
  const url = new URL(isPast ? ARCHIVE_API : FORECAST_API);
  url.searchParams.set('latitude', location.lat);
  url.searchParams.set('longitude', location.lon);
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  url.searchParams.set('hourly', 'weather_code,temperature_2m,precipitation');
  url.searchParams.set('timezone', 'Asia/Tokyo');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();

  return aggregateByPeriod(data.hourly);
}

function mostFrequent(arr) {
  const count = {};
  arr.forEach(v => count[v] = (count[v] || 0) + 1);
  let max = 0, best = arr[0];
  for (const k in count) if (count[k] > max) { max = count[k]; best = parseInt(k); }
  return best;
}

function average(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function sum(arr) {
  return arr.reduce((s, v) => s + v, 0);
}

function aggregateByPeriod(hourly) {
  const periods = {
    morning: [6, 7, 8, 9, 10, 11],
    noon: [12, 13, 14, 15, 16, 17],
    evening: [18, 19, 20, 21, 22, 23],
    night: [0, 1, 2, 3, 4, 5]
  };
  const result = {};
  for (const [name, hours] of Object.entries(periods)) {
    const codes = [], temps = [], precs = [];
    for (const h of hours) {
      if (hourly.weather_code[h] != null) codes.push(hourly.weather_code[h]);
      if (hourly.temperature_2m[h] != null) temps.push(hourly.temperature_2m[h]);
      if (hourly.precipitation[h] != null) precs.push(hourly.precipitation[h]);
    }
    const code = mostFrequent(codes);
    result[name] = {
      code,
      label: weatherLabel(code),
      tempAvg: Math.round(average(temps) * 10) / 10,
      precipMm: Math.round(sum(precs) * 10) / 10
    };
  }
  return result;
}

export function renderBottomNav(activePage) {
  const items = [
    { id: 'home', label: 'ホーム', href: 'index.html' },
    { id: 'input', label: '入力', href: 'input.html' },
    { id: 'calendar', label: 'カレンダー', href: 'calendar.html' },
    { id: 'settings', label: '設定', href: 'settings.html' }
  ];
  return `
    <nav class="bottom">
      ${items.map(it => `<a href="${it.href}" class="${it.id === activePage ? 'active' : ''}">${it.label}</a>`).join('')}
    </nav>`;
}

export function formatYen(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

export function formatDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00+09:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

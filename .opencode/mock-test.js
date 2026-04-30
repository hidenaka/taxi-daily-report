const { chromium } = require('playwright');

const mockUsers = {
  users: [
    { userId: 'user_self', displayName: '自分', role: 'admin', active: true },
    { userId: 'user_other', displayName: '他ユーザー', role: 'member', active: true }
  ]
};

const mockDrives = [];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  // Intercept GitHub API calls
  await page.route('https://api.github.com/**', async route => {
    const url = route.request().url();
    if (url.includes('users.json')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: Buffer.from(JSON.stringify(mockUsers)).toString('base64'), sha: 'mock' }) });
    }
    if (url.includes('drives/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (url.includes('contents/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    route.continue();
  });

  // Set dummy credentials
  await page.goto('http://localhost:8080/support.html');
  await page.evaluate(() => {
    localStorage.setItem('github_token', 'dummy_token');
    localStorage.setItem('github_data_repo', 'owner/repo');
    localStorage.setItem('taxi_user_id', 'user_self');
  });
  await page.reload();
  await page.waitForTimeout(3000);

  // Check key DOM elements after load
  const checks = await page.evaluate(() => ({
    paceCardExists: !!document.getElementById('paceCard'),
    paceCardHasContent: document.getElementById('paceCard')?.innerHTML?.length > 50,
    recGpsBadgeExists: !!document.getElementById('recGpsBadge'),
    recAreaHasOptions: document.getElementById('recArea')?.options?.length >= 0,
    rangeTabsExist: document.querySelectorAll('.range-tabs button').length > 0,
    zonePresetsExist: document.querySelectorAll('.pace-preset').length > 0,
    elapsedTabsExist: document.querySelectorAll('.pace-etab').length > 0,
    dowTabsExist: document.querySelectorAll('.pace-dtab').length > 0,
    hourEffBodyExists: !!document.getElementById('hourEffBody'),
    highValueBodyExists: !!document.getElementById('highValueBody'),
    areaBodyExists: !!document.getElementById('areaBody'),
    recBodyExists: !!document.getElementById('recBody'),
    rangeInfoText: document.getElementById('rangeInfo')?.textContent || '',
    paceCardText: document.getElementById('paceCard')?.textContent?.substring(0, 100) || '',
  }));

  console.log('DOM checks:', JSON.stringify(checks, null, 2));
  console.log('Errors:', errors.length ? errors : 'none');

  await page.screenshot({ path: '/Users/hideakimacbookair/taxi-daily-report/.opencode/support-mock-screenshot.png', fullPage: true });
  await browser.close();
})();

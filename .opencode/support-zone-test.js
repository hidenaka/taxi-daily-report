const { chromium } = require('playwright');

const mockUsers = {
  users: [
    { userId: 'user_self', displayName: '自分', role: 'admin', active: true }
  ]
};

const mockConfig = {
  rateTable: {
    "11": [
      { salesMin: 0, salesMax: 500000, rate: 0.55 },
      { salesMin: 500000, salesMax: 1000000, rate: 0.60 },
      { salesMin: 1000000, salesMax: 99999999, rate: 0.65 }
    ]
  },
  premiumThreshold: 80000,
  premiumIncentive: 2000
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.route('https://api.github.com/**', async route => {
    const url = route.request().url();
    if (url.includes('users.json')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: Buffer.from(JSON.stringify(mockUsers)).toString('base64'), sha: 'mock' }) });
    }
    if (url.includes('drives/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (url.includes('contents/')) {
      if (url.endsWith('/')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      const payload = url.includes('config') ? mockConfig : {};
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: Buffer.from(JSON.stringify(payload)).toString('base64'), sha: 'mock' }) });
    }
    route.continue();
  });

  await page.goto('http://localhost:8080/support.html');
  await page.evaluate(() => {
    localStorage.setItem('github_token', 'dummy_token');
    localStorage.setItem('github_data_repo', 'owner/repo');
    localStorage.setItem('taxi_user_id', 'user_self');
  });
  await page.reload();
  await page.waitForTimeout(3000);

  const checks = await page.evaluate(() => ({
    paceCardText: document.getElementById('paceCard')?.textContent?.substring(0, 300) || '',
    zoneLabels: Array.from(document.querySelectorAll('.pace-preset')).map(b => b.textContent),
    elapsedWithHints: document.getElementById('paceCard')?.innerHTML?.match(/<span[^>]*>[^<]*<\/span>\s*<button/g)?.length || 0,
  }));

  console.log('DOM checks:', JSON.stringify(checks, null, 2));
  console.log('Errors:', errors.length ? errors : 'none');

  await page.screenshot({ path: '/Users/hideakimacbookair/taxi-daily-report/.opencode/support-zone-screenshot.png', fullPage: true });
  await browser.close();
})();

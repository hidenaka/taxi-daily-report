const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // mobile viewport
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('http://localhost:8080/support.html');
  await page.waitForTimeout(2000); // wait for scripts

  // Check key DOM elements
  const checks = await page.evaluate(() => ({
    paceCardExists: !!document.getElementById('paceCard'),
    recGpsBadgeExists: !!document.getElementById('recGpsBadge'),
    rangeTabsExist: document.querySelectorAll('.range-tabs button').length > 0,
    zonePresetsExist: document.querySelectorAll('.pace-preset').length > 0,
    noTokenMessage: document.querySelector('main')?.textContent?.includes('GitHubトークン') || false,
    jsError: window.__js_error__ || null,
  }));

  console.log('DOM checks:', JSON.stringify(checks, null, 2));
  console.log('Errors:', errors.length ? errors : 'none');

  await page.screenshot({ path: '/Users/hideakimacbookair/taxi-daily-report/.opencode/support-screenshot.png', fullPage: true });
  await browser.close();
})();

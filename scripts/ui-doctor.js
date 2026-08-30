/**
 * UI doctor — crawl sidebar views and run-detail tabs.
 * Usage: node scripts/ui-doctor.js
 */
const { chromium } = require('playwright');

const BASE = process.env.ZERO_UI_URL || 'http://localhost:3000';
const API = process.env.ZERO_API_URL || 'http://localhost:3001';

const SIDEBAR_VIEWS = [
  { nav: 'Dashboard', expect: '.dash-view' },
  { nav: 'Runs', expect: '.runs-view, .run-list-view, [class*="runs"]' },
  { nav: 'Agents', expect: '.agv-view, [class*="agv"]' },
  { nav: 'Integrations', expect: '.integrations-view, [class*="integration"]' },
  { nav: 'API Keys', expect: '.apikeys-view, [class*="apikey"]' },
  { nav: 'Locators', expect: '.locators-view, [class*="locator"]' },
  { nav: 'New Run', expect: '.new-run-view, [class*="new-run"]' },
];

async function fetchRuns() {
  const res = await fetch(`${API}/runs`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data.runs || [];
}

function report(title, items) {
  console.log(`\n=== ${title} ===`);
  for (const item of items) {
    const icon = item.ok ? '✓' : '✗';
    console.log(`  ${icon} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
}

async function clickSidebar(page, label) {
  const btn = page.locator('.sidebar-nav .nav-item, .sidebar-foot .nav-item')
    .filter({ hasText: label })
    .first();
  await btn.click({ timeout: 8000 });
  await page.waitForTimeout(400);
}

async function main() {
  const health = await fetch(`${API}/health`).then(r => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error('API not healthy — start stack first (docker compose up or npm run start:all)');
    process.exit(1);
  }

  const runs = await fetchRuns();
  const completedRun = runs.find(r => r.status === 'completed') || runs[0];
  const runId = completedRun?.id || completedRun?.runId;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('requestfailed', req => {
    const url = req.url();
    const expectedStreamClose =
      req.resourceType() === 'eventsource' && req.failure()?.errorText === 'net::ERR_ABORTED';
    if (!url.includes('favicon') && !expectedStreamClose) {
      failedRequests.push(`${req.failure()?.errorText || 'failed'}: ${url}`);
    }
  });

  const sidebarResults = [];

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

  for (const view of SIDEBAR_VIEWS) {
    try {
      await clickSidebar(page, view.nav);
      const found = await page.locator(view.expect).first().isVisible({ timeout: 5000 }).catch(() => false);
      const mainText = await page.locator('.app-main').innerText().catch(() => '');
      const emptyOnly = mainText.trim().length < 20;
      sidebarResults.push({
        ok: found || !emptyOnly,
        name: view.nav,
        detail: found ? 'content visible' : emptyOnly ? 'main area empty' : 'loaded (selector mismatch)',
      });
    } catch (e) {
      sidebarResults.push({ ok: false, name: view.nav, detail: e.message.slice(0, 80) });
    }
  }

  report('Sidebar navigation', sidebarResults);

  // Theme picker
  const themeResults = [];
  try {
    const themeBtn = page.getByRole('button', { name: /Choose theme/ });
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await themeBtn.click();
    await page.waitForTimeout(150);
    const next = page.locator('[role="radio"][aria-checked="false"]').first();
    await next.click();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    themeResults.push({ ok: before !== after, name: 'Theme picker', detail: `${before} → ${after}` });
  } catch (e) {
    themeResults.push({ ok: false, name: 'Theme picker', detail: e.message.slice(0, 80) });
  }
  report('Theme', themeResults);

  // Run detail tabs
  const tabResults = [];
  if (runId) {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await clickSidebar(page, 'Runs');
    await page.waitForTimeout(600);

    const runRow = page.locator('tr, .run-row, [class*="run-card"], button, a').filter({ hasText: runId.slice(0, 12) }).first();
    const rowVisible = await runRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (rowVisible) {
      await runRow.click();
    } else {
      await page.goto(`${BASE}/runs/${runId}`, { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(1500);

    const tabs = page.locator('.rdt-tab');
    const tabCount = await tabs.count();

    if (tabCount === 0) {
      tabResults.push({ ok: false, name: 'Run detail', detail: `No tabs found for run ${runId}` });
    } else {
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        const label = (await tab.innerText()).replace(/\d+[✓✕].*/, '').trim();
        try {
          await tab.click();
          await page.waitForTimeout(500);
          const content = page.locator('.rdt-tab-content');
          const text = await content.innerText().catch(() => '');
          const hasError = /failed to fetch|network error|undefined is not/i.test(text);
          const isEmpty = text.includes('Awaiting') || text.includes('Loading') || text.trim().length < 5;
          tabResults.push({
            ok: !hasError,
            name: label || `Tab ${i + 1}`,
            detail: hasError ? 'error text in panel' : isEmpty ? 'placeholder/awaiting' : `${text.length} chars`,
          });
        } catch (e) {
          tabResults.push({ ok: false, name: label, detail: e.message.slice(0, 80) });
        }
      }

      // Header actions
      const pdfBtn = page.getByRole('button', { name: /PDF/i });
      const rerunBtn = page.getByRole('button', { name: /Re-run Failed/i });
      tabResults.push({
        ok: await pdfBtn.isVisible(),
        name: 'PDF download button',
        detail: (await pdfBtn.isDisabled()) ? 'disabled (run not completed?)' : 'enabled',
      });
      tabResults.push({
        ok: await rerunBtn.isVisible(),
        name: 'Re-run Failed button',
        detail: (await rerunBtn.isDisabled()) ? 'disabled (no failures)' : 'enabled',
      });
    }
  } else {
    tabResults.push({ ok: false, name: 'Run detail', detail: 'No runs in database' });
  }

  report(`Run detail tabs (run: ${runId || 'none'})`, tabResults);

  // API endpoints used by views
  const apiResults = [];
  const endpoints = [
    '/health',
    '/runs',
    '/agent-settings',
    '/provider-keys',
    '/locators?host=example.com',
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${API}${ep}`);
      apiResults.push({ ok: res.ok, name: ep, detail: `HTTP ${res.status}` });
    } catch (e) {
      apiResults.push({ ok: false, name: ep, detail: e.message });
    }
  }
  report('API endpoints', apiResults);

  if (consoleErrors.length) {
    report('Browser console errors', consoleErrors.slice(0, 10).map((e, i) => ({ ok: false, name: `#${i + 1}`, detail: e.slice(0, 120) })));
  } else {
    report('Browser console errors', [{ ok: true, name: 'none', detail: '' }]);
  }

  if (failedRequests.length) {
    report('Failed network requests', failedRequests.slice(0, 10).map((e, i) => ({ ok: false, name: `#${i + 1}`, detail: e.slice(0, 120) })));
  } else {
    report('Failed network requests', [{ ok: true, name: 'none', detail: '' }]);
  }

  const allOk =
    [...sidebarResults, ...tabResults, ...apiResults].every(r => r.ok)
    && consoleErrors.length === 0
    && failedRequests.length === 0;
  await browser.close();
  process.exit(allOk ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

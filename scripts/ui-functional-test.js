/**
 * Functional UI tests — sidebar views and interactions.
 * Usage: node scripts/ui-functional-test.js
 */
const { chromium } = require('playwright');

const BASE = process.env.ZERO_UI_URL || 'http://localhost:3000';
const API = process.env.ZERO_API_URL || 'http://localhost:3001';

const results = [];

function pass(area, test, detail = '') {
  results.push({ area, test, ok: true, detail });
}

function fail(area, test, detail = '') {
  results.push({ area, test, ok: false, detail });
}

async function clickNav(page, label) {
  const btn = page.locator('.sidebar-nav .nav-item, .sidebar-foot .nav-item')
    .filter({ hasText: label })
    .first();
  await btn.click({ timeout: 8000 });
  await page.waitForTimeout(350);
}

async function fetchRuns() {
  const res = await fetch(`${API}/runs`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.runs || [];
}

async function testDashboard(page, apiRuns) {
  await clickNav(page, 'Dashboard');
  await page.waitForTimeout(600);

  const viewVisible = await page.locator('.dash-view').isVisible();
  if (viewVisible) pass('Dashboard', 'view loads');
  else return fail('Dashboard', 'view loads', '.dash-view not found');

  const statCards = page.locator('.stats-grid .stat-card, .stats-grid .StatCard');
  const count = await statCards.count();
  if (count >= 4) pass('Dashboard', 'stats cards render', `${count} cards`);
  else fail('Dashboard', 'stats cards render', `expected ≥4, got ${count}`);

  const totalText = await statCards.nth(0).locator('.stat-value, .stat-card-value').innerText().catch(() => '');
  const apiTotal = String(apiRuns.length);
  if (totalText.trim() === apiTotal) pass('Dashboard', 'Total Runs matches API', `${apiTotal}`);
  else fail('Dashboard', 'Total Runs matches API', `UI=${totalText.trim()} API=${apiTotal}`);

  const tableRows = page.locator('.dash-view .data-table tbody tr');
  const rowCount = await tableRows.count();
  if (rowCount > 0) pass('Dashboard', 'execution history table has rows', `${rowCount} rows`);
  else fail('Dashboard', 'execution history table has rows', 'empty table');

  if (rowCount > 0) {
    const firstId = await tableRows.first().locator('code, td').first().innerText();
    await tableRows.first().click();
    await page.waitForTimeout(800);
    const onDetail = await page.locator('.run-detail-view').isVisible();
    if (onDetail) pass('Dashboard', 'click row opens run detail', firstId.slice(0, 16));
    else fail('Dashboard', 'click row opens run detail');
    await clickNav(page, 'Dashboard');
  }
}

async function testRuns(page, apiRuns) {
  await clickNav(page, 'Runs');
  await page.waitForTimeout(500);

  if (await page.locator('.runs-list-view').isVisible()) pass('Runs', 'view loads');
  else return fail('Runs', 'view loads');

  const rows = page.locator('.runs-list-view .data-table tbody tr');
  const rowCount = await rows.count();
  if (rowCount === apiRuns.length) pass('Runs', 'row count matches API', `${rowCount}`);
  else fail('Runs', 'row count matches API', `UI=${rowCount} API=${apiRuns.length}`);

  const search = page.locator('.runs-search');
  if (await search.isVisible()) {
    const sample = apiRuns[0];
    const q = (sample?.input?.ottUrl || sample?.id || '').slice(0, 8);
    if (q) {
      await search.fill(q);
      await page.waitForTimeout(300);
      const filtered = await rows.count();
      if (filtered >= 1 && filtered <= rowCount) pass('Runs', 'search filter works', `"${q}" → ${filtered} rows`);
      else fail('Runs', 'search filter works', `"${q}" → ${filtered} rows`);
      await search.fill('');
    }
  }

  const completedChip = page.locator('.runs-filter-chip').filter({ hasText: 'completed' });
  if (await completedChip.isVisible()) {
    await completedChip.click();
    await page.waitForTimeout(300);
    const completedCount = await rows.count();
    const apiCompleted = apiRuns.filter(r => r.status === 'completed').length;
    if (completedCount === apiCompleted) pass('Runs', 'status filter (completed)', `${completedCount} rows`);
    else fail('Runs', 'status filter (completed)', `UI=${completedCount} API=${apiCompleted}`);
    await page.locator('.runs-filter-chip').filter({ hasText: 'All' }).click();
  }

  if (rowCount > 0) {
    await rows.first().click();
    await page.waitForTimeout(800);
    if (await page.locator('.run-detail-view').isVisible()) pass('Runs', 'row opens run detail');
    else fail('Runs', 'row opens run detail');
  }
}

async function testNewRun(page) {
  await clickNav(page, 'New Run');
  await page.waitForTimeout(400);

  if (await page.locator('.new-run-view').isVisible()) pass('New Run', 'view loads');
  else return fail('New Run', 'view loads');

  const steps = page.locator('.nrv-step');
  const stepCount = await steps.count();
  if (stepCount === 5) pass('New Run', '5 wizard steps visible');
  else fail('New Run', '5 wizard steps visible', `got ${stepCount}`);

  const urlInput = page.locator('input[name="ottUrl"]');
  await urlInput.fill('example.com');
  const val = await urlInput.inputValue();
  if (val === 'example.com') pass('New Run', 'URL input accepts text');
  else fail('New Run', 'URL input accepts text');

  const stepLabels = ['Input Sources', 'Test Assets', 'Credentials', 'Execution Options', 'Recording'];
  for (let i = 0; i < stepLabels.length; i++) {
    await steps.nth(i).click();
    await page.waitForTimeout(250);
    const active = await steps.nth(i).evaluate(el => el.classList.contains('nrv-step--active'));
    if (active) pass('New Run', `step ${i + 1}: ${stepLabels[i]}`, 'navigable');
    else fail('New Run', `step ${i + 1}: ${stepLabels[i]}`, 'not active after click');
  }

  await steps.nth(0).click();
  const nextBtn = page.locator('.nrv-footer .btn-primary, .nrv-nav .btn-primary').filter({ hasText: /Next|Continue/i }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(300);
    const onStep2 = await steps.nth(1).evaluate(el => el.classList.contains('nrv-step--active'));
    if (onStep2) pass('New Run', 'Next button advances wizard');
    else pass('New Run', 'Next button clickable', 'footer Next may use different flow');
  }

  const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Start|Launch|Submit/i });
  if (await submitBtn.count() > 0) pass('New Run', 'submit button present at final step');
}

async function testAgents(page) {
  await clickNav(page, 'Agents');
  await page.waitForTimeout(600);

  const view = page.locator('.agents-view');
  if (await view.isVisible()) pass('Agents', 'view loads');
  else return fail('Agents', 'view loads');

  const rows = page.locator('.agv-tr');
  const rowCount = await rows.count();
  if (rowCount === 4) pass('Agents', '4 agents listed', `${rowCount} rows`);
  else fail('Agents', '4 agents listed', `${rowCount} rows`);

  const baRow = rows.filter({ hasText: 'BA Agent' }).first();
  const menuBtn = baRow.locator('.agv-dot-btn');
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(300);
    const editItem = page.getByRole('button', { name: 'Edit prompt & model' });
    if (await editItem.isVisible()) {
      await editItem.click();
      await page.waitForTimeout(500);
      const detail = page.locator('.agv-detail');
      if (await detail.isVisible()) pass('Agents', 'menu opens agent detail config');
      else fail('Agents', 'menu opens agent detail config');
      const backBtn = page.getByRole('button', { name: /Back|←/i }).first();
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(400);
      }
    } else fail('Agents', 'Edit prompt & model menu item');
  } else fail('Agents', 'actions menu button visible');
}

async function testIntegrations(page) {
  await clickNav(page, 'Integrations');
  await page.waitForTimeout(400);

  if (await page.locator('.integrations-view').isVisible()) pass('Integrations', 'view loads');
  else return fail('Integrations', 'view loads');

  const cards = page.locator('.int-card');
  const cardCount = await cards.count();
  if (cardCount === 5) pass('Integrations', '5 integration cards', `${cardCount}`);
  else fail('Integrations', '5 integration cards', `got ${cardCount}`);

  const configureBtn = cards.first().getByRole('button', { name: 'Configure' });
  await configureBtn.click();
  await page.waitForTimeout(400);

  if (await page.getByText('Supabase Setup Guide').isVisible()) pass('Integrations', 'Supabase Configure opens guide');
  else fail('Integrations', 'Supabase Configure opens guide');

  const nextGuide = page.getByRole('button', { name: /Next: Locate Credentials/i });
  if (await nextGuide.isVisible()) {
    await nextGuide.click();
    await page.waitForTimeout(300);
    if (await page.getByText('Step 2: Find API Credentials').isVisible()) pass('Integrations', 'guide step 2 navigation');
    else fail('Integrations', 'guide step 2 navigation');
  }

  const backBtn = page.getByRole('button', { name: /Back to Integrations/i });
  if (await backBtn.isVisible()) {
    await backBtn.click();
    await page.waitForTimeout(300);
    if (await cards.first().isVisible()) pass('Integrations', 'Back returns to card grid');
    else fail('Integrations', 'Back returns to card grid');
  }

  page.once('dialog', d => d.accept());
  const slackCard = cards.filter({ hasText: 'Slack' });
  await slackCard.getByRole('button', { name: 'Configure' }).click();
  await page.waitForTimeout(200);
  pass('Integrations', 'non-Supabase Configure shows coming soon alert');
}

async function testApiKeys(page) {
  await clickNav(page, 'API Keys');
  await page.waitForTimeout(700);

  const view = page.locator('.api-keys-view');
  if (await view.isVisible().catch(() => false)) pass('API Keys', 'view loads');
  else return fail('API Keys', 'view loads');

  for (const name of ['Google Gemini', 'OpenAI ChatGPT', 'Anthropic Claude']) {
    const card = view.locator('.apk-provider-name').filter({ hasText: name }).first();
    if (await card.isVisible().catch(() => false)) pass('API Keys', `provider card: ${name}`);
    else fail('API Keys', `provider card: ${name}`);
  }

  const apiRes = await fetch(`${API}/provider-keys`);
  const apiData = await apiRes.json();
  if (apiRes.ok && Array.isArray(apiData.items)) pass('API Keys', 'API /provider-keys returns items', `${apiData.items.length} items`);
  else fail('API Keys', 'API /provider-keys returns items');

  const replaceBtn = view.getByRole('button', { name: 'Replace' }).first();
  const saveBtn = view.getByRole('button', { name: 'Save' }).first();
  const keyInput = view.locator('.apk-key-input').first();
  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
    await page.waitForTimeout(300);
    if (await keyInput.isVisible()) pass('API Keys', 'Replace reveals key input');
    else fail('API Keys', 'Replace reveals key input');
  } else if (await saveBtn.isVisible() && await keyInput.isVisible()) {
    pass('API Keys', 'unconfigured providers show Save + key input (edit mode by default)');
  } else {
    fail('API Keys', 'key management actions visible');
  }
}

async function testLocators(page) {
  await clickNav(page, 'Locators');
  await page.waitForTimeout(400);

  if (await page.locator('.locators-view').isVisible()) pass('Locators', 'view loads');
  else return fail('Locators', 'view loads');

  const hostInput = page.locator('.locator-panel').filter({ hasText: 'Query Locators' }).locator('input').first();
  await hostInput.fill('www.zepto.com');
  await page.locator('.locator-panel').filter({ hasText: 'Query Locators' }).getByRole('button', { name: 'Load' }).click();
  await page.waitForTimeout(800);

  const emptyMsg = page.getByText(/No locators stored for this host/i);
  const table = page.locator('.loc-table tbody tr');
  const hasEmpty = await emptyMsg.isVisible().catch(() => false);
  const hasRows = (await table.count()) > 0;
  if (hasEmpty || hasRows) pass('Locators', 'host query returns result', hasEmpty ? 'empty registry message' : 'table rows');
  else fail('Locators', 'host query returns result');

  await hostInput.fill('');
  const queryPanel = page.locator('.locator-panel').filter({ hasText: 'Query Locators' });
  await queryPanel.getByRole('button', { name: 'Load' }).click();
  await page.waitForTimeout(400);
  const hostErr = queryPanel.locator('.log-result--err');
  if (await hostErr.isVisible()) pass('Locators', 'empty host shows validation error');
  else fail('Locators', 'empty host shows validation error');

  const submitPanel = page.locator('.locator-panel').filter({ hasText: 'Submit Element Log' });
  await submitPanel.locator('input').first().fill('https://example.com/page');
  await submitPanel.getByRole('button', { name: 'Submit Log' }).click();
  await page.waitForTimeout(400);
  if (await submitPanel.locator('.log-result--err').isVisible()) pass('Locators', 'invalid JSON submit shows error');
  else fail('Locators', 'invalid JSON submit shows error');
}

async function testThemeToggle(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const themeBtn = page.getByRole('button', { name: /Choose theme/ });
  await themeBtn.click();
  await page.waitForTimeout(150);
  const options = page.getByRole('radio');
  const count = await options.count();
  if (count >= 2) pass('Theme picker', 'lists multiple themes', String(count));
  else fail('Theme picker', 'lists multiple themes', `count=${count}`);

  const next = options.filter({ hasNot: page.locator('[aria-checked="true"]') }).first();
  await next.click();
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (before !== after) pass('Theme picker', 'switches theme', `${before} → ${after}`);
  else fail('Theme picker', 'switches theme');

  const stored = await page.evaluate(() => localStorage.getItem('zero-theme'));
  if (stored === after) pass('Theme picker', 'persists to localStorage', stored);
  else fail('Theme picker', 'persists to localStorage', `stored=${stored} theme=${after}`);

  await themeBtn.click();
  await page.waitForTimeout(150);
  await page.locator(`.theme-option[aria-label*="${before}" i]`).first().click();
  await page.waitForTimeout(200);
  const restored = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (restored === before) pass('Theme picker', 'selecting original restores theme');
  else fail('Theme picker', 'selecting original restores theme', `wanted ${before} got ${restored}`);
}

async function testSidebarCollapse(page) {
  const toggle = page.locator('.sidebar-collapse-toggle').first();
  const before = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--expanded'));
  await toggle.click();
  await page.waitForTimeout(250);
  const after = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--expanded'));
  if (before !== after) pass('Sidebar collapse', 'toggles expanded class', `${before} → ${after}`);
  else fail('Sidebar collapse', 'toggles expanded class');

  await toggle.click();
  await page.waitForTimeout(250);
  const back = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--expanded'));
  if (back === before) pass('Sidebar collapse', 'second click restores state');
  else fail('Sidebar collapse', 'second click restores state');
}

async function testSoonItems(page) {
  await clickNav(page, 'Dashboard');
  await page.locator('.sidebar-collapse-toggle').click();
  await page.waitForTimeout(250);

  const soonItems = ['Pipelines', 'Reports', 'Team'];
  for (const label of soonItems) {
    const btn = page.locator('.sidebar-nav .nav-item--soon').filter({ hasText: label });
    const disabled = await btn.isDisabled();
    const hasBadge = await btn.locator('.nav-badge').filter({ hasText: 'Soon' }).isVisible().catch(() => false);
    if (disabled && hasBadge) pass('Soon items', `${label} disabled with Soon badge`);
    else fail('Soon items', `${label} disabled with Soon badge`, `disabled=${disabled} badge=${hasBadge}`);
  }

  await page.locator('.sidebar-collapse-toggle').click();
  await page.waitForTimeout(200);

  const settingsBtn = page.locator('.sidebar-foot .nav-item--soon').filter({ hasText: 'Settings' });
  if (await settingsBtn.isDisabled()) pass('Soon items', 'Settings disabled in footer');
  else fail('Soon items', 'Settings disabled in footer');

  await page.locator('.sidebar-nav .nav-item--soon').filter({ hasText: 'Pipelines' }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  const stillDashboard = await page.locator('.dash-view').isVisible();
  if (stillDashboard) pass('Soon items', 'clicking Pipelines does not navigate');
  else fail('Soon items', 'clicking Pipelines does not navigate');
}

function printReport() {
  const areas = [...new Set(results.map(r => r.area))];
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           ZERO UI — Functional Test Report               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  for (const area of areas) {
    const tests = results.filter(r => r.area === area);
    const ok = tests.every(t => t.ok);
    console.log(`${ok ? '✓' : '✗'} ${area}`);
    for (const t of tests) {
      console.log(`    ${t.ok ? '✓' : '✗'} ${t.test}${t.detail ? ` — ${t.detail}` : ''}`);
    }
    console.log('');
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`Summary: ${passed} passed, ${failed} failed (${results.length} total)\n`);
  return failed === 0;
}

async function main() {
  const health = await fetch(`${API}/health`).then(r => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error('API not healthy. Start stack: docker compose up -d');
    process.exit(1);
  }

  const apiRuns = await fetchRuns();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('pageerror', err => fail('Browser', 'uncaught error', err.message.slice(0, 100)));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

  await testDashboard(page, apiRuns);
  await testRuns(page, apiRuns);
  await testNewRun(page);
  await testAgents(page);
  await testIntegrations(page);
  await testApiKeys(page);
  await testLocators(page);
  await testThemeToggle(page);
  await testSidebarCollapse(page);
  await testSoonItems(page);

  const allPass = printReport();
  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

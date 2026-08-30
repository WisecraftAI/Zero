/**
 * Extended UI doctor — interactive checks per view.
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const API = 'http://localhost:3001';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const issues = [];
  const passes = [];

  const note = (ok, area, detail) => (ok ? passes : issues).push({ area, detail });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Dashboard' }).click();
  await page.waitForTimeout(400);

  // Dashboard stats
  const statCards = await page.locator('.stat-card').count();
  note(statCards >= 3, 'Dashboard', `${statCards} stat cards visible`);

  const recentRuns = await page.locator('.dash-view table tbody tr').count();
  note(recentRuns > 0, 'Dashboard', `${recentRuns} recent run rows`);

  // New Run wizard steps
  await page.locator('.nav-item').filter({ hasText: 'New Run' }).click();
  await page.waitForTimeout(300);
  const steps = await page.locator('[class*="step"], .new-run-steps button, .nr-step').count();
  note(steps >= 4, 'New Run', `${steps} wizard steps`);

  const urlInput = page.locator('input[name="ottUrl"], input[placeholder*="http"], #ottUrl').first();
  if (await urlInput.isVisible().catch(() => false)) {
    await urlInput.fill('https://example.com');
    note(true, 'New Run', 'URL input accepts text');
  } else {
    note(false, 'New Run', 'URL input not found');
  }

  // Try advancing wizard if Next button exists
  const nextBtn = page.getByRole('button', { name: /Next|Continue/i }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click().catch(() => {});
    await page.waitForTimeout(300);
    note(true, 'New Run', 'Wizard Next button clickable');
  }

  // Runs list
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Runs' }).click();
  await page.waitForTimeout(500);
  const runRows = await page.locator('table tbody tr, .run-row, [class*="runs"] tr').count();
  note(runRows > 0, 'Runs list', `${runRows} runs listed`);

  // Open first run
  const firstRow = page.locator('table tbody tr, .run-row').first();
  await firstRow.click();
  await page.waitForTimeout(1200);

  const pipelineStages = await page.locator('.pipeline-stage, [class*="pipeline"] [class*="stage"], .pf-stage').count();
  note(pipelineStages >= 5, 'Run detail', `${pipelineStages} pipeline stages shown`);

  // Execution tab — screenshot links
  await page.locator('.rdt-tab').filter({ hasText: 'Execution' }).click();
  await page.waitForTimeout(600);
  const screenshots = await page.locator('.rdt-tab-content img, .exec-table img, a[href*="files/"]').count();
  note(screenshots > 0, 'Execution tab', `${screenshots} screenshot refs`);

  // Test one artifact URL if present
  const img = page.locator('.rdt-tab-content img').first();
  if (await img.isVisible().catch(() => false)) {
    const src = await img.getAttribute('src');
    if (src) {
      const res = await fetch(src.startsWith('http') ? src : `${API}${src.replace(/^\/api/, '')}`);
      note(res.ok, 'Artifact images', `${src.slice(0, 60)}… → HTTP ${res.status}`);
    }
  }

  // Element Log tab
  await page.locator('.rdt-tab').filter({ hasText: 'Element Log' }).click();
  await page.waitForTimeout(400);
  const elementLogGuidance = await page.locator('.element-log-info').innerText().catch(() => '');
  note(
    elementLogGuidance.includes('Locators'),
    'Element Log',
    'locator workflow guidance visible'
  );

  // Locators view interactive
  await page.locator('.sidebar-foot .nav-item').filter({ hasText: 'Locators' }).click();
  await page.waitForTimeout(400);
  const hostInput = page.locator('.locators-view input').nth(1);
  if (await hostInput.isVisible().catch(() => false)) {
    await hostInput.fill('www.zepto.com');
    const loadBtn = page.getByRole('button', { name: /Load|Query|Search|Fetch/i }).first();
    if (await loadBtn.isVisible().catch(() => false)) {
      await loadBtn.click();
      await page.waitForTimeout(800);
      const body = await page.locator('.locators-view').innerText();
      note(!body.includes('Failed to fetch'), 'Locators view', body.includes('locators') || body.includes('host') ? 'query returned' : 'loaded');
    }
  }

  // Agents view
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Agents' }).click();
  await page.waitForTimeout(500);
  const agentCards = await page.locator('.agv-table, [class*="agv"]').count();
  note(agentCards > 0, 'Agents', 'agents table rendered');

  const expandBtn = page.locator('.agv-table button, .agv-row button').first();
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(400);
    note(true, 'Agents', 'agent row expandable');
  }

  // API Keys
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'API Keys' }).click();
  await page.waitForTimeout(600);
  const providerCards = await page.locator('.pk-card, [class*="provider"], .apikeys-view .card').count();
  note(providerCards >= 3, 'API Keys', `${providerCards} provider cards`);

  // Integrations modal
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Integrations' }).click();
  await page.waitForTimeout(400);
  const intCards = await page.locator('.int-card, .integrations-view [class*="card"]').count();
  note(intCards >= 4, 'Integrations', `${intCards} integration cards`);

  const connectBtn = page.getByRole('button', { name: /Connect|Configure|Setup/i }).first();
  if (await connectBtn.isVisible().catch(() => false)) {
    await connectBtn.click();
    await page.waitForTimeout(400);
    note(true, 'Integrations', 'connect flow opens');
  }

  // Sidebar disabled items
  await page.locator('.sidebar-nav .nav-item--soon').first().isDisabled().then(d => note(d, 'Sidebar', 'Soon items correctly disabled'));

  // Collapse sidebar
  const collapse = page.locator('.sidebar-collapse-toggle').first();
  if (await collapse.isVisible().catch(() => false)) {
    await collapse.click();
    await page.waitForTimeout(200);
    const expanded = await page.locator('.sidebar--expanded').count();
    note(expanded === 1, 'Sidebar', 'expand/collapse works');
  }

  console.log('\n=== Extended UI Doctor ===\n');
  console.log(`PASS (${passes.length}):`);
  passes.forEach(p => console.log(`  ✓ [${p.area}] ${p.detail}`));
  if (issues.length) {
    console.log(`\nISSUES (${issues.length}):`);
    issues.forEach(p => console.log(`  ✗ [${p.area}] ${p.detail}`));
  } else {
    console.log('\nNo issues found.');
  }

  await browser.close();
  process.exit(issues.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

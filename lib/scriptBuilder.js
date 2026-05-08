/**
 * Framework script builder: generate Playwright .spec.ts from merged locators and test steps.
 * Scripts are built on the framework so they can be reused and stored in PostgreSQL.
 */

/**
 * Build a Playwright test script string using selector candidates (from registry + profile).
 */
function buildPlaywrightSpec(ottUrl, selectorCandidates, options = {}) {
  const { testName = "channel flow regression", extraSteps = [] } = options;

  const sel = selectorCandidates || {};
  const contentCard = (sel.contentCard || []).length ? sel.contentCard : ["main a", "article a"];
  const playCta = (sel.playCta || []).length ? sel.playCta : ["button:has-text('Play')", "button[aria-label*='Play']"];
  const continueCta = (sel.continueCta || []).length ? sel.continueCta : ["button:has-text('Continue')", "a:has-text('Continue')"];
  const loginCta = (sel.loginCta || []).length ? sel.loginCta : ["button:has-text('Sign in')", "button:has-text('Login')"];

  const lines = [
    "import { test, expect } from '@playwright/test';",
    "",
    `const OTT_URL = ${JSON.stringify(ottUrl)};`,
    "",
    "async function clickFirstAvailable(page, selectors) {",
    "  for (const sel of selectors || []) {",
    "    const loc = page.locator(sel).first();",
    "    if (await loc.isVisible().catch(() => false)) { await loc.click(); return true; }",
    "  }",
    "  return false;",
    "}",
    "",
    "async function expectFirstAvailable(page, selectors) {",
    "  for (const sel of selectors || []) {",
    "    const loc = page.locator(sel).first();",
    "    if (await loc.isVisible().catch(() => false)) { await expect(loc).toBeVisible(); return; }",
    "  }",
    "  throw new Error('No matching element found');",
    "}",
    "",
    `test(${JSON.stringify(testName)}, async ({ page }) => {`,
    "  await page.goto(OTT_URL, { waitUntil: 'domcontentloaded' });",
    "  await expect(page.locator('body')).toBeVisible();",
    "  await clickFirstAvailable(page, " + JSON.stringify(continueCta) + ");",
    "  await clickFirstAvailable(page, " + JSON.stringify(loginCta) + ");",
    "  await page.waitForTimeout(800);",
    "  await clickFirstAvailable(page, " + JSON.stringify(contentCard) + ");",
    "  await page.waitForTimeout(500);",
    "  await clickFirstAvailable(page, " + JSON.stringify(playCta) + ");",
    "  await page.waitForTimeout(1000);",
    "  await expectFirstAvailable(page, " + JSON.stringify(sel.pauseCta || sel.seekBar || ["[aria-label*='Pause']", "[role='slider']"]) + ");",
    ...extraSteps.map((s) => "  " + s),
    "});"
  ];

  return lines.join("\n");
}

/**
 * Build a Playwright spec from CSV test cases (Feature, Scenario, Expected Result).
 * One test per scenario, using shared helpers and selectors.
 */
function buildPlaywrightSpecFromTestCases(ottUrl, testCases, selectorCandidates) {
  const sel = selectorCandidates || {};
  const contentCard = (sel.contentCard || []).length ? sel.contentCard : ["main a", "article a"];
  const playCta = (sel.playCta || []).length ? sel.playCta : ["button:has-text('Play')", "button[aria-label*='Play']"];
  const continueCta = (sel.continueCta || []).length ? sel.continueCta : ["button:has-text('Continue')", "a:has-text('Continue')"];
  const loginCta = (sel.loginCta || []).length ? sel.loginCta : ["button:has-text('Sign in')", "button:has-text('Login')"];

  const lines = [
    "import { test, expect } from '@playwright/test';",
    "",
    `const OTT_URL = ${JSON.stringify(ottUrl)};`,
    "",
    "async function clickFirstAvailable(page, selectors) {",
    "  for (const s of selectors || []) {",
    "    const loc = page.locator(s).first();",
    "    if (await loc.isVisible().catch(() => false)) { await loc.click(); return true; }",
    "  }",
    "  return false;",
    "}",
    ""
  ];

  const cases = testCases.testCases || testCases;
  cases.forEach((tc, i) => {
    const safeTitle = (tc.title || tc.scenario || `TC ${i + 1}`).replace(/"/g, "'").slice(0, 80);
    lines.push(`test(${JSON.stringify(safeTitle)}, async ({ page }) => {`);
    lines.push("  await page.goto(OTT_URL, { waitUntil: 'domcontentloaded' });");
    lines.push("  await page.waitForLoadState('domcontentloaded');");
    lines.push("  await page.waitForTimeout(1500);");
    lines.push("  await expect(page.locator('body')).toBeVisible();");
    lines.push("  await clickFirstAvailable(page, " + JSON.stringify(continueCta) + ");");
    lines.push("  await clickFirstAvailable(page, " + JSON.stringify(loginCta) + ");");
    lines.push("  await page.waitForTimeout(1000);");
    lines.push("  await clickFirstAvailable(page, " + JSON.stringify(contentCard) + ");");
    lines.push("  await page.waitForTimeout(500);");
    lines.push("  await clickFirstAvailable(page, " + JSON.stringify(playCta) + ");");
    lines.push("  await page.waitForTimeout(1000);");
    lines.push("});");
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

/**
 * Build execution steps (for runtime execution service) from selector candidates.
 */
function buildExecutionSteps(selectorCandidates, ottUrl, baseTests) {
  return baseTests;
}

module.exports = {
  buildPlaywrightSpec,
  buildPlaywrightSpecFromTestCases,
  buildExecutionSteps
};

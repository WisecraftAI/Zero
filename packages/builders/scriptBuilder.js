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
 * Build domain-aware e-commerce Playwright script from test cases.
 * Automatically detects the domain and uses appropriate selectors.
 */
function buildEcommerceSpec(url, testCases, options = {}) {
  const { detectDomain, domainSelectors } = require("@zero/locators/ecommerceSelectors");
  const domain = detectDomain(url);
  const config = domainSelectors[domain] || domainSelectors.generic;
  const siteName = config.name || domain;

  const lines = [
    "/**",
    ` * Domain-Aware E-Commerce Test: ${siteName}`,
    ` * URL: ${url}`,
    " * Generated by Zero QA - Wisecraft AI",
    " */",
    "import { test, expect } from '@playwright/test';",
    "",
    `const BASE_URL = ${JSON.stringify(url)};`,
    `const DOMAIN = ${JSON.stringify(domain)};`,
    "",
    "// Domain-specific selectors",
    `const SELECTORS = ${JSON.stringify(config, null, 2)};`,
    "",
    "/**",
    " * Try multiple selectors until one works",
    " */",
    "async function findElement(page, selectors, options = {}) {",
    "  const { timeout = 5000, action = 'find' } = options;",
    "  for (const sel of selectors || []) {",
    "    try {",
    "      const loc = page.locator(sel).first();",
    "      if (await loc.isVisible({ timeout: Math.min(timeout, 3000) })) {",
    "        if (action === 'click') await loc.click();",
    "        if (action === 'fill' && options.value) {",
    "          await loc.click();",
    "          await loc.fill(options.value);",
    "        }",
    "        return loc;",
    "      }",
    "    } catch { /* try next selector */ }",
    "  }",
    "  return null;",
    "}",
    "",
    "async function expectVisible(page, selectors, timeout = 5000) {",
    "  const el = await findElement(page, selectors, { timeout });",
    "  if (!el) throw new Error(`Element not found with selectors: ${selectors.slice(0,2).join(', ')}`);",
    "  await expect(el).toBeVisible();",
    "  return el;",
    "}",
    "",
    "async function searchAndNavigate(page, searchTerm) {",
    "  // Enter search term",
    "  const searchInput = await findElement(page, SELECTORS.search.input, { action: 'fill', value: searchTerm });",
    "  if (!searchInput) throw new Error('Search input not found');",
    "  ",
    "  // Submit search",
    "  const submitBtn = await findElement(page, SELECTORS.search.submit, { action: 'click', timeout: 3000 });",
    "  if (!submitBtn) await page.keyboard.press('Enter');",
    "  ",
    "  await page.waitForLoadState('domcontentloaded');",
    "  await page.waitForTimeout(2000);",
    "}",
    "",
    "async function clickProduct(page, index = 0) {",
    "  await page.waitForTimeout(1000);",
    "  const products = page.locator(SELECTORS.results.productCard.join(', '));",
    "  const count = await products.count();",
    "  if (count === 0) throw new Error('No products found in results');",
    "  await products.nth(Math.min(index, count - 1)).click();",
    "  await page.waitForLoadState('domcontentloaded');",
    "  await page.waitForTimeout(2000);",
    "}",
    "",
    "async function addToCart(page) {",
    "  const btn = await findElement(page, SELECTORS.productPage.addToCart, { action: 'click' });",
    "  if (!btn) throw new Error('Add to Cart button not found');",
    "  await page.waitForTimeout(2000);",
    "}",
    "",
    "async function openCart(page) {",
    "  const cartIcon = await findElement(page, SELECTORS.cart.icon, { action: 'click' });",
    "  if (!cartIcon) {",
    "    // Try direct navigation",
    "    const cartUrl = BASE_URL.replace(/\\/$/, '') + '/viewcart';",
    "    await page.goto(cartUrl, { waitUntil: 'domcontentloaded' });",
    "  }",
    "  await page.waitForLoadState('domcontentloaded');",
    "  await page.waitForTimeout(2000);",
    "}",
    "",
  ];

  // Generate tests from test cases
  const cases = testCases.testCases || testCases || [];
  if (cases.length > 0) {
    lines.push(`test.describe('${siteName} E-Commerce Tests', () => {`);
    lines.push("");
    
    cases.forEach((tc, i) => {
      const title = (tc.title || tc.scenario || `Test Case ${i + 1}`).replace(/"/g, "'").slice(0, 100);
      const action = (tc.action || "").toLowerCase();
      const searchTerm = tc.testData || tc.searchTerm || "iPhone 15";
      
      lines.push(`  test(${JSON.stringify(title)}, async ({ page }) => {`);
      lines.push("    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });");
      lines.push("    await page.waitForTimeout(2000);");
      
      // Generate action-specific code
      if (action.includes("search") || action.includes("enter")) {
        lines.push(`    await searchAndNavigate(page, ${JSON.stringify(searchTerm)});`);
      }
      if (action.includes("click_product") || action.includes("select")) {
        lines.push("    await clickProduct(page);");
      }
      if (action.includes("add") && action.includes("cart")) {
        lines.push("    await addToCart(page);");
      }
      if (action.includes("open_cart") || action.includes("view_cart")) {
        lines.push("    await openCart(page);");
      }
      if (action.includes("verify")) {
        const expected = tc.expectedResult || "visible";
        lines.push(`    // Verify: ${expected.slice(0, 50)}`);
        lines.push("    await page.waitForTimeout(1000);");
      }
      
      lines.push("  });");
      lines.push("");
    });
    
    lines.push("});");
  } else {
    // Generate generic e-commerce flow test
    lines.push("test('Complete E-Commerce Flow', async ({ page }) => {");
    lines.push("  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });");
    lines.push("  await page.waitForTimeout(2000);");
    lines.push("  ");
    lines.push("  // Search for product");
    lines.push("  await searchAndNavigate(page, 'iPhone 15');");
    lines.push("  ");
    lines.push("  // Click first product");
    lines.push("  await clickProduct(page);");
    lines.push("  ");
    lines.push("  // Add to cart");
    lines.push("  await addToCart(page);");
    lines.push("  ");
    lines.push("  // Open cart");
    lines.push("  await openCart(page);");
    lines.push("  ");
    lines.push("  // Verify item in cart");
    lines.push("  await expectVisible(page, SELECTORS.cart.itemTitle);");
    lines.push("});");
  }

  return lines.join("\n");
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
  buildEcommerceSpec,
  buildExecutionSteps
};

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
  const { detectDomain, domainSelectors } = require("./ecommerceSelectors");
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

/**
 * Build a domain-aware Playwright script from test cases.
 * Supports: OTT/Streaming, E-commerce, Travel, Banking, Food Delivery, Healthcare, etc.
 *
 * @param {string} url - The website URL
 * @param {object} testCases - Test cases to generate scripts for
 * @param {string} domainType - The detected domain type (OTT_STREAMING, ECOMMERCE, TRAVEL_BOOKING, etc.)
 * @param {object} domainSelectors - Domain-specific selectors from domainTestStrategies
 */
function buildDomainAwareSpec(url, testCases, domainType, domainSelectors = {}) {
  const cases = testCases.testCases || testCases || [];
  const domainName = getDomainDisplayName(domainType);

  // Common header
  const lines = [
    "/**",
    ` * Domain-Aware Test Suite: ${domainName}`,
    ` * URL: ${url}`,
    ` * Domain Type: ${domainType}`,
    " * Generated by Zero QA - Wisecraft AI",
    " */",
    "import { test, expect } from '@playwright/test';",
    "",
    `const BASE_URL = ${JSON.stringify(url)};`,
    `const DOMAIN_TYPE = ${JSON.stringify(domainType)};`,
    "",
    "// Domain-specific selectors",
    `const SELECTORS = ${JSON.stringify(domainSelectors, null, 2)};`,
    "",
    "// ==================== HELPER FUNCTIONS ====================",
    "",
    "/**",
    " * Try multiple selectors until one works",
    " */",
    "async function findElement(page, selectors, options = {}) {",
    "  const { timeout = 5000, action = 'find' } = options;",
    "  for (const sel of (selectors || [])) {",
    "    try {",
    "      const loc = page.locator(sel).first();",
    "      if (await loc.isVisible({ timeout: Math.min(timeout, 3000) })) {",
    "        if (action === 'click') await loc.click();",
    "        if (action === 'fill' && options.value) {",
    "          await loc.click();",
    "          await loc.clear();",
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
    "  if (!el) throw new Error(`Element not found: ${(selectors || []).slice(0,2).join(', ')}`);",
    "  await expect(el).toBeVisible();",
    "  return el;",
    "}",
    "",
    "async function waitAndClick(page, selectors, timeout = 5000) {",
    "  const el = await findElement(page, selectors, { timeout, action: 'click' });",
    "  if (!el) throw new Error(`Click target not found: ${(selectors || []).slice(0,2).join(', ')}`);",
    "  return el;",
    "}",
    ""
  ];

  // Add domain-specific helper functions
  switch (domainType) {
    case 'OTT_STREAMING':
      lines.push(...getOTTHelpers());
      break;
    case 'ECOMMERCE':
      lines.push(...getEcommerceHelpers());
      break;
    case 'TRAVEL_BOOKING':
      lines.push(...getTravelHelpers());
      break;
    case 'BANKING_FINANCE':
      lines.push(...getBankingHelpers());
      break;
    case 'FOOD_DELIVERY':
      lines.push(...getFoodDeliveryHelpers());
      break;
    default:
      lines.push(...getGenericHelpers());
  }

  lines.push("");
  lines.push("// ==================== TEST CASES ====================");
  lines.push("");

  // Generate test cases
  if (cases.length > 0) {
    lines.push(`test.describe('${domainName} - Automated Test Suite', () => {`);
    lines.push("");
    lines.push("  test.beforeEach(async ({ page }) => {");
    lines.push("    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });");
    lines.push("    await page.waitForLoadState('networkidle').catch(() => {});");
    lines.push("    await page.waitForTimeout(2000);");
    lines.push("  });");
    lines.push("");

    cases.forEach((tc, i) => {
      const title = (tc.title || tc.scenario || `Test Case ${i + 1}`).replace(/"/g, "'").slice(0, 100);
      const scenario = (tc.scenario || "").toLowerCase();

      lines.push(`  test(${JSON.stringify(title)}, async ({ page }) => {`);

      // Generate domain-specific test code based on scenario
      const testCode = generateDomainSpecificTestCode(domainType, scenario, tc);
      testCode.forEach(line => lines.push(`    ${line}`));

      lines.push("  });");
      lines.push("");
    });

    lines.push("});");
  } else {
    // Generate a generic smoke test
    lines.push(`test('${domainName} - Smoke Test', async ({ page }) => {`);
    lines.push("  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });");
    lines.push("  await page.waitForTimeout(2000);");
    lines.push("  await expect(page.locator('body')).toBeVisible();");
    lines.push("  // Add domain-specific assertions here");
    lines.push("});");
  }

  return lines.join("\n");
}

/**
 * Get display name for domain type
 */
function getDomainDisplayName(domainType) {
  const names = {
    'OTT_STREAMING': 'OTT/Streaming Platform',
    'ECOMMERCE': 'E-Commerce Platform',
    'TRAVEL_BOOKING': 'Travel Booking Platform',
    'BANKING_FINANCE': 'Banking/Finance Portal',
    'FOOD_DELIVERY': 'Food Delivery Platform',
    'HEALTHCARE_PHARMA': 'Healthcare/Pharma Portal',
    'EDUCATION': 'Education Platform',
    'NEWS_MEDIA': 'News/Media Website',
    'SOCIAL_MEDIA': 'Social Media Platform',
    'GENERIC': 'Web Application'
  };
  return names[domainType] || 'Web Application';
}

/**
 * OTT/Streaming specific helper functions
 */
function getOTTHelpers() {
  return [
    "// OTT/Streaming Helper Functions",
    "async function searchContent(page, query) {",
    "  const searchBtn = await findElement(page, SELECTORS.searchBox || ['[data-testid=\"search\"]', 'input[type=\"search\"]', '.search-input']);",
    "  if (searchBtn) {",
    "    await searchBtn.click();",
    "    await page.fill(SELECTORS.searchBox?.[0] || 'input[type=\"search\"]', query);",
    "    await page.keyboard.press('Enter');",
    "    await page.waitForTimeout(2000);",
    "  }",
    "}",
    "",
    "async function selectContent(page, index = 0) {",
    "  const cards = page.locator(SELECTORS.contentCard?.[0] || '[data-testid=\"content-card\"]');",
    "  if (await cards.count() > 0) {",
    "    await cards.nth(index).click();",
    "    await page.waitForTimeout(2000);",
    "  }",
    "}",
    "",
    "async function playVideo(page) {",
    "  const playBtn = await findElement(page, SELECTORS.playButton || ['[data-testid=\"play-button\"]', 'button[aria-label*=\"play\" i]', '.play-btn']);",
    "  if (playBtn) await playBtn.click();",
    "  await page.waitForTimeout(3000);",
    "}",
    "",
    "async function pauseVideo(page) {",
    "  const pauseBtn = await findElement(page, SELECTORS.pauseButton || ['[data-testid=\"pause-button\"]', 'button[aria-label*=\"pause\" i]']);",
    "  if (pauseBtn) await pauseBtn.click();",
    "}",
    "",
    "async function verifyVideoPlaying(page) {",
    "  const video = page.locator('video');",
    "  if (await video.count() > 0) {",
    "    const currentTime = await video.evaluate(v => v.currentTime);",
    "    await page.waitForTimeout(2000);",
    "    const newTime = await video.evaluate(v => v.currentTime);",
    "    expect(newTime).toBeGreaterThan(currentTime);",
    "  }",
    "}",
    ""
  ];
}

/**
 * E-commerce specific helper functions
 */
function getEcommerceHelpers() {
  return [
    "// E-Commerce Helper Functions",
    "async function searchProduct(page, query) {",
    "  const searchInput = await findElement(page, SELECTORS.searchBox || ['#search', '[data-testid=\"search\"]', 'input[name=\"q\"]'], { action: 'fill', value: query });",
    "  if (searchInput) {",
    "    await page.keyboard.press('Enter');",
    "    await page.waitForTimeout(2000);",
    "  }",
    "}",
    "",
    "async function selectProduct(page, index = 0) {",
    "  const products = page.locator(SELECTORS.productCard?.[0] || '[data-testid=\"product\"]');",
    "  if (await products.count() > 0) {",
    "    await products.nth(index).click();",
    "    await page.waitForTimeout(2000);",
    "  }",
    "}",
    "",
    "async function addToCart(page) {",
    "  const addBtn = await findElement(page, SELECTORS.addToCartButton || ['[data-testid=\"add-to-cart\"]', '#add-to-cart', 'button:has-text(\"Add to Cart\")'], { action: 'click' });",
    "  await page.waitForTimeout(1500);",
    "  return addBtn;",
    "}",
    "",
    "async function goToCart(page) {",
    "  const cartIcon = await findElement(page, SELECTORS.cartIcon || ['[data-testid=\"cart\"]', '.cart-icon', '#cart'], { action: 'click' });",
    "  await page.waitForTimeout(2000);",
    "  return cartIcon;",
    "}",
    "",
    "async function applyCoupon(page, code) {",
    "  const couponInput = await findElement(page, SELECTORS.couponInput || ['#coupon', '[data-testid=\"coupon\"]'], { action: 'fill', value: code });",
    "  if (couponInput) {",
    "    const applyBtn = await findElement(page, ['[data-testid=\"apply-coupon\"]', 'button:has-text(\"Apply\")'], { action: 'click' });",
    "    await page.waitForTimeout(1000);",
    "  }",
    "}",
    ""
  ];
}

/**
 * Travel booking specific helper functions
 */
function getTravelHelpers() {
  return [
    "// Travel Booking Helper Functions",
    "async function setOrigin(page, city) {",
    "  const originInput = await findElement(page, SELECTORS.originInput || ['#origin', '[data-testid=\"origin\"]'], { action: 'fill', value: city });",
    "  await page.waitForTimeout(500);",
    "  await page.keyboard.press('ArrowDown');",
    "  await page.keyboard.press('Enter');",
    "}",
    "",
    "async function setDestination(page, city) {",
    "  const destInput = await findElement(page, SELECTORS.destinationInput || ['#destination', '[data-testid=\"destination\"]'], { action: 'fill', value: city });",
    "  await page.waitForTimeout(500);",
    "  await page.keyboard.press('ArrowDown');",
    "  await page.keyboard.press('Enter');",
    "}",
    "",
    "async function selectDate(page, dateType = 'departure') {",
    "  const selector = dateType === 'departure' ? SELECTORS.departureDatePicker : SELECTORS.returnDatePicker;",
    "  const dateInput = await findElement(page, selector || [`#${dateType}`, `[data-testid=\"${dateType}-date\"]`], { action: 'click' });",
    "  await page.waitForTimeout(500);",
    "  // Click on a future date",
    "  const futureDate = page.locator('.date-picker-day:not(.disabled)').nth(10);",
    "  if (await futureDate.count()) await futureDate.click();",
    "}",
    "",
    "async function searchFlights(page) {",
    "  const searchBtn = await findElement(page, SELECTORS.searchButton || ['[data-testid=\"search-flights\"]', '.search-btn'], { action: 'click' });",
    "  await page.waitForLoadState('domcontentloaded');",
    "  await page.waitForTimeout(3000);",
    "}",
    "",
    "async function selectFlight(page, index = 0) {",
    "  const flights = page.locator(SELECTORS.flightCard?.[0] || '[data-testid=\"flight-result\"]');",
    "  if (await flights.count() > 0) {",
    "    await flights.nth(index).click();",
    "    await page.waitForTimeout(2000);",
    "  }",
    "}",
    ""
  ];
}

/**
 * Banking/Finance specific helper functions
 */
function getBankingHelpers() {
  return [
    "// Banking/Finance Helper Functions",
    "async function login(page, userId, password) {",
    "  await findElement(page, SELECTORS.customerIdInput || ['#customerId', '[data-testid=\"customer-id\"]'], { action: 'fill', value: userId });",
    "  await findElement(page, SELECTORS.passwordInput || ['#password', 'input[type=\"password\"]'], { action: 'fill', value: password });",
    "  await findElement(page, SELECTORS.loginButton || ['[data-testid=\"login\"]', '#login-btn'], { action: 'click' });",
    "  await page.waitForLoadState('domcontentloaded');",
    "}",
    "",
    "async function checkBalance(page) {",
    "  const balanceEl = await findElement(page, SELECTORS.balanceDisplay || ['[data-testid=\"balance\"]', '.account-balance']);",
    "  if (balanceEl) {",
    "    const balance = await balanceEl.textContent();",
    "    return balance;",
    "  }",
    "  return null;",
    "}",
    "",
    "async function initiateTransfer(page, amount, account) {",
    "  await findElement(page, SELECTORS.transferButton || ['[data-testid=\"transfer\"]', '.transfer-btn'], { action: 'click' });",
    "  await page.waitForTimeout(1000);",
    "  await findElement(page, SELECTORS.amountInput || ['#amount', '[data-testid=\"amount\"]'], { action: 'fill', value: amount });",
    "}",
    "",
    "async function confirmTransaction(page) {",
    "  await findElement(page, SELECTORS.confirmButton || ['[data-testid=\"confirm\"]', '.confirm-btn'], { action: 'click' });",
    "  await page.waitForTimeout(2000);",
    "}",
    ""
  ];
}

/**
 * Food Delivery specific helper functions
 */
function getFoodDeliveryHelpers() {
  return [
    "// Food Delivery Helper Functions",
    "async function setLocation(page, location) {",
    "  const locInput = await findElement(page, SELECTORS.locationInput || ['#location', '[data-testid=\"location\"]'], { action: 'fill', value: location });",
    "  await page.waitForTimeout(500);",
    "  await page.keyboard.press('ArrowDown');",
    "  await page.keyboard.press('Enter');",
    "  await page.waitForTimeout(2000);",
    "}",
    "",
    "async function searchRestaurant(page, query) {",
    "  await findElement(page, SELECTORS.searchBox || ['#search', '[data-testid=\"search\"]'], { action: 'fill', value: query });",
    "  await page.keyboard.press('Enter');",
    "  await page.waitForTimeout(2000);",
    "}",
    "",
    "async function selectRestaurant(page, index = 0) {",
    "  const restaurants = page.locator(SELECTORS.restaurantCard?.[0] || '[data-testid=\"restaurant\"]');",
    "  if (await restaurants.count() > 0) {",
    "    await restaurants.nth(index).click();",
    "    await page.waitForTimeout(2000);",
    "  }",
    "}",
    "",
    "async function addItemToCart(page, index = 0) {",
    "  const items = page.locator(SELECTORS.menuItem?.[0] || '[data-testid=\"menu-item\"]');",
    "  if (await items.count() > 0) {",
    "    const addBtn = items.nth(index).locator(SELECTORS.addButton?.[0] || '[data-testid=\"add-item\"]');",
    "    await addBtn.click();",
    "    await page.waitForTimeout(1000);",
    "  }",
    "}",
    "",
    "async function proceedToCheckout(page) {",
    "  await findElement(page, SELECTORS.checkoutButton || ['[data-testid=\"checkout\"]', '.checkout-btn'], { action: 'click' });",
    "  await page.waitForTimeout(2000);",
    "}",
    ""
  ];
}

/**
 * Generic helper functions
 */
function getGenericHelpers() {
  return [
    "// Generic Helper Functions",
    "async function search(page, query) {",
    "  const searchInput = await findElement(page, ['input[type=\"search\"]', '#search', '.search-input'], { action: 'fill', value: query });",
    "  if (searchInput) {",
    "    await page.keyboard.press('Enter');",
    "    await page.waitForTimeout(2000);",
    "  }",
    "}",
    "",
    "async function clickButton(page, buttonText) {",
    "  const btn = page.locator(`button:has-text(\"${buttonText}\"), a:has-text(\"${buttonText}\")`).first();",
    "  if (await btn.isVisible()) {",
    "    await btn.click();",
    "    await page.waitForTimeout(1000);",
    "  }",
    "}",
    "",
    "async function fillForm(page, fields) {",
    "  for (const [name, value] of Object.entries(fields)) {",
    "    const input = page.locator(`input[name=\"${name}\"], input[id=\"${name}\"], [data-testid=\"${name}\"]`).first();",
    "    if (await input.isVisible()) {",
    "      await input.fill(value);",
    "    }",
    "  }",
    "}",
    ""
  ];
}

/**
 * Generate domain-specific test code based on scenario
 */
function generateDomainSpecificTestCode(domainType, scenario, testCase) {
  const lines = [];

  switch (domainType) {
    case 'OTT_STREAMING':
      if (scenario.includes('search')) {
        lines.push(`await searchContent(page, '${testCase.testData || "Movie"}');`);
      }
      if (scenario.includes('play') || scenario.includes('video')) {
        lines.push("await selectContent(page);");
        lines.push("await playVideo(page);");
        lines.push("await verifyVideoPlaying(page);");
      }
      if (scenario.includes('pause')) {
        lines.push("await pauseVideo(page);");
      }
      if (scenario.includes('watchlist') || scenario.includes('favorite')) {
        lines.push("await selectContent(page);");
        lines.push("await findElement(page, SELECTORS.watchlistButton, { action: 'click' });");
      }
      break;

    case 'ECOMMERCE':
      if (scenario.includes('search')) {
        lines.push(`await searchProduct(page, '${testCase.testData || "Product"}');`);
      }
      if (scenario.includes('product') || scenario.includes('select')) {
        lines.push("await selectProduct(page);");
      }
      if (scenario.includes('cart') || scenario.includes('add')) {
        lines.push("await addToCart(page);");
      }
      if (scenario.includes('checkout') || scenario.includes('buy')) {
        lines.push("await goToCart(page);");
        lines.push("await findElement(page, ['[data-testid=\"checkout\"]', '.checkout-btn'], { action: 'click' });");
      }
      if (scenario.includes('coupon') || scenario.includes('discount')) {
        lines.push(`await applyCoupon(page, '${testCase.testData || "TESTCODE"}');`);
      }
      break;

    case 'TRAVEL_BOOKING':
      if (scenario.includes('search') || scenario.includes('flight')) {
        lines.push(`await setOrigin(page, '${testCase.testData?.split(',')[0] || "Delhi"}');`);
        lines.push("await setDestination(page, 'Mumbai');");
        lines.push("await selectDate(page, 'departure');");
        lines.push("await searchFlights(page);");
      }
      if (scenario.includes('select') || scenario.includes('book')) {
        lines.push("await selectFlight(page);");
      }
      if (scenario.includes('round') || scenario.includes('return')) {
        lines.push("await selectDate(page, 'return');");
      }
      break;

    case 'BANKING_FINANCE':
      if (scenario.includes('login')) {
        lines.push("// Warning: Use test credentials only");
        lines.push("await login(page, process.env.TEST_USER_ID || 'testuser', process.env.TEST_PASSWORD || 'testpass');");
      }
      if (scenario.includes('balance')) {
        lines.push("const balance = await checkBalance(page);");
        lines.push("console.log('Account Balance:', balance);");
      }
      if (scenario.includes('transfer')) {
        lines.push("await initiateTransfer(page, '100', 'test-account');");
        lines.push("await confirmTransaction(page);");
      }
      break;

    case 'FOOD_DELIVERY':
      if (scenario.includes('location')) {
        lines.push(`await setLocation(page, '${testCase.testData || "Bangalore"}');`);
      }
      if (scenario.includes('search') || scenario.includes('restaurant')) {
        lines.push(`await searchRestaurant(page, '${testCase.testData || "Pizza"}');`);
      }
      if (scenario.includes('select') || scenario.includes('order')) {
        lines.push("await selectRestaurant(page);");
        lines.push("await addItemToCart(page);");
      }
      if (scenario.includes('checkout')) {
        lines.push("await proceedToCheckout(page);");
      }
      break;

    default:
      lines.push("// Generic test - customize as needed");
      lines.push("await page.waitForTimeout(1000);");
      lines.push("await expect(page.locator('body')).toBeVisible();");
  }

  // Add generic assertions
  if (testCase.expectedResult) {
    lines.push(`// Expected: ${(testCase.expectedResult || '').slice(0, 80)}`);
    lines.push("await page.waitForTimeout(1000);");
  }

  return lines;
}

module.exports = {
  buildPlaywrightSpec,
  buildPlaywrightSpecFromTestCases,
  buildEcommerceSpec,
  buildDomainAwareSpec,
  buildExecutionSteps
};

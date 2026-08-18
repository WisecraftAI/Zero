const PLAYWRIGHT_IMPORT = "import { test, expect } from '@playwright/test';";

const PLAYWRIGHT_HELPER_FUNCTIONS = [
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
  "}"
].join("\n");

function buildPlaywrightHeader(urlConstantName, url) {
  return [
    PLAYWRIGHT_IMPORT,
    "",
    `const ${urlConstantName} = ${JSON.stringify(url)};`,
    "",
    PLAYWRIGHT_HELPER_FUNCTIONS,
    ""
  ];
}

module.exports = {
  PLAYWRIGHT_IMPORT,
  PLAYWRIGHT_HELPER_FUNCTIONS,
  buildPlaywrightHeader
};

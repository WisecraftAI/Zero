const { resolveOttSelectors } = require("../shared/selectors");
const { buildPlaywrightHeader } = require("./helpers");

function buildChannelFlowSteps(selectors, extraSteps = []) {
  return [
    "  await page.goto(OTT_URL, { waitUntil: 'domcontentloaded' });",
    "  await expect(page.locator('body')).toBeVisible();",
    `  await clickFirstAvailable(page, ${JSON.stringify(selectors.continueCta)});`,
    `  await clickFirstAvailable(page, ${JSON.stringify(selectors.loginCta)});`,
    "  await page.waitForTimeout(800);",
    `  await clickFirstAvailable(page, ${JSON.stringify(selectors.contentCard)});`,
    "  await page.waitForTimeout(500);",
    `  await clickFirstAvailable(page, ${JSON.stringify(selectors.playCta)});`,
    "  await page.waitForTimeout(1000);",
    `  await expectFirstAvailable(page, ${JSON.stringify(selectors.pauseCta)});`,
    ...extraSteps.map((step) => `  ${step}`)
  ];
}

/**
 * Build a Playwright test script string using selector candidates.
 */
function buildPlaywrightSpec(ottUrl, selectorCandidates, options = {}) {
  const { testName = "channel flow regression", extraSteps = [] } = options;
  const selectors = resolveOttSelectors(selectorCandidates);

  return [
    ...buildPlaywrightHeader("OTT_URL", ottUrl),
    `test(${JSON.stringify(testName)}, async ({ page }) => {`,
    ...buildChannelFlowSteps(selectors, extraSteps),
    "});"
  ].join("\n");
}

module.exports = {
  buildPlaywrightSpec,
  buildChannelFlowSteps
};

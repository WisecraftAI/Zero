const { resolveOttSelectors } = require("../shared/selectors");
const { sanitizeTestTitle } = require("../shared/text");
const { buildPlaywrightHeader } = require("./helpers");
const { buildChannelFlowSteps } = require("./channelSpec");

function normalizeTestCases(testCases) {
  return testCases?.testCases || testCases || [];
}

/**
 * Build a Playwright spec from CSV/manual test cases.
 */
function buildPlaywrightSpecFromTestCases(ottUrl, testCases, selectorCandidates) {
  const selectors = resolveOttSelectors(selectorCandidates);
  const lines = buildPlaywrightHeader("OTT_URL", ottUrl);

  normalizeTestCases(testCases).forEach((testCase, index) => {
    const title = sanitizeTestTitle(testCase.title || testCase.scenario, `TC ${index + 1}`, 80);

    lines.push(`test(${JSON.stringify(title)}, async ({ page }) => {`);
    lines.push("  await page.goto(OTT_URL, { waitUntil: 'domcontentloaded' });");
    lines.push("  await page.waitForLoadState('domcontentloaded');");
    lines.push("  await page.waitForTimeout(1500);");
    lines.push(...buildChannelFlowSteps(selectors).slice(1));
    lines.push("});");
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

module.exports = {
  buildPlaywrightSpecFromTestCases,
  normalizeTestCases
};

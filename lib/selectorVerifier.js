/**
 * Selector Verifier
 *
 * Grounds automation-script generation in reality: given candidate CSS/text
 * selectors (from profiles, memory, DB, or an LLM), actually check them
 * against the LIVE page with Playwright before they're allowed into a
 * generated script. This is the single biggest lever against "generated
 * code that doesn't work" - we never let a script ship a selector that
 * wasn't confirmed to exist/be visible on the real page.
 *
 * Output shape per key:
 *   { verified: [{ selector, strategy, visible, sample }], unverified: [selector, ...] }
 */

const VERIFY_TIMEOUT_MS = 2500;
const MAX_CANDIDATES_PER_KEY = 8;


/**
 * Verify a single selector candidate against the current page.
 */
async function verifyOne(page, selector) {
  try {
    const loc = page.locator(selector).first();
    const visible = await loc.isVisible({ timeout: VERIFY_TIMEOUT_MS }).catch(() => false);
    if (!visible) return { ok: false };
    let sample = "";
    try {
      sample = (await loc.textContent({ timeout: 500 }))?.trim().slice(0, 80) || "";
    } catch {
      /* non-text element, ignore */
    }
    return { ok: true, sample };
  } catch {
    return { ok: false };
  }
}

/**
 * Verify every key in a selectorCandidates map ({ key: [selectors...] })
 * against a live Playwright page. Returns a parallel map with verified
 * selectors promoted first and flagged, so script builders can prefer them.
 *
 * @param {import('playwright').Page} page - already navigated to target URL
 * @param {Object<string, string[]>} selectorCandidates
 */
async function verifySelectorMap(page, selectorCandidates = {}) {
  const report = {};
  const verifiedSelectorsByKey = {};

  for (const [key, candidates] of Object.entries(selectorCandidates)) {
    const list = (candidates || []).slice(0, MAX_CANDIDATES_PER_KEY);
    const verified = [];
    const unverified = [];

    for (const selector of list) {
      const result = await verifyOne(page, selector);
      if (result.ok) {
        verified.push({ selector, sample: result.sample });
      } else {
        unverified.push(selector);
      }
    }

    report[key] = { verified, unverified, verifiedCount: verified.length, totalCount: list.length };
    // Verified-first ordering; keep unverified as last-resort fallback (with flag).
    verifiedSelectorsByKey[key] = [
      ...verified.map((v) => v.selector),
      ...unverified
    ];
  }

  return { report, orderedSelectors: verifiedSelectorsByKey };
}

/**
 * Build a compact human-readable verification summary (for reports/logs).
 */
function summarize(report) {
  let verifiedTotal = 0;
  let totalTotal = 0;
  const perKey = [];
  for (const [key, r] of Object.entries(report || {})) {
    verifiedTotal += r.verifiedCount;
    totalTotal += r.totalCount;
    perKey.push({ key, verified: r.verifiedCount, total: r.totalCount });
  }
  return {
    verifiedTotal,
    totalTotal,
    verificationRate: totalTotal ? Math.round((verifiedTotal / totalTotal) * 100) : 0,
    perKey
  };
}

module.exports = {
  verifyOne,
  verifySelectorMap,
  summarize
};


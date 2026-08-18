const DEFAULT_OTT_SELECTORS = {
  contentCard: ["main a", "article a"],
  playCta: ["button:has-text('Play')", "button[aria-label*='Play']"],
  continueCta: ["button:has-text('Continue')", "a:has-text('Continue')"],
  loginCta: ["button:has-text('Sign in')", "button:has-text('Login')"],
  pauseCta: ["[aria-label*='Pause']", "[role='slider']"]
};

function pickSelectors(candidates, fallback) {
  return (candidates || []).length ? candidates : fallback;
}

/**
 * Normalize merged locator candidates with OTT defaults.
 *
 * @param {Record<string, string[]>} selectorCandidates
 */
function resolveOttSelectors(selectorCandidates = {}) {
  return {
    contentCard: pickSelectors(selectorCandidates.contentCard, DEFAULT_OTT_SELECTORS.contentCard),
    playCta: pickSelectors(selectorCandidates.playCta, DEFAULT_OTT_SELECTORS.playCta),
    continueCta: pickSelectors(selectorCandidates.continueCta, DEFAULT_OTT_SELECTORS.continueCta),
    loginCta: pickSelectors(selectorCandidates.loginCta, DEFAULT_OTT_SELECTORS.loginCta),
    pauseCta: pickSelectors(
      selectorCandidates.pauseCta || selectorCandidates.seekBar,
      DEFAULT_OTT_SELECTORS.pauseCta
    )
  };
}

/**
 * Flatten locator registry entries to plain selector strings.
 *
 * @param {Record<string, Array<string|{ selectorValue?: string }>>} locatorsByKey
 */
function flattenLocatorValues(locatorsByKey = {}) {
  const flatten = (entries = []) =>
    entries
      .map((entry) => (typeof entry === "string" ? entry : entry?.selectorValue))
      .filter(Boolean);

  return {
    playCta: flatten(locatorsByKey.playCta),
    contentCard: flatten(locatorsByKey.contentCard)
  };
}

module.exports = {
  DEFAULT_OTT_SELECTORS,
  pickSelectors,
  resolveOttSelectors,
  flattenLocatorValues
};

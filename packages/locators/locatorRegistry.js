/**
 * Locator registry: merge profile selector candidates with DB-stored locators for script generation.
 */

const db = require("@zero/db");

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Convert DB locators (array of { selectorType, selectorValue, ... }) into
 * same shape as appProfiles.selectorCandidates: { key: ["selector1", "selector2"] }
 */
function dbLocatorsToCandidates(dbLocatorsByKey) {
  const out = {};
  for (const [key, list] of Object.entries(dbLocatorsByKey || {})) {
    out[key] = list
      .map((l) => {
        if (l.selectorType === "xpath") return l.selectorValue;
        return l.selectorValue;
      })
      .filter(Boolean);
  }
  return out;
}

/**
 * Merge: (1) in-memory learned selectors, (2) DB locators for host, (3) profile fallback.
 * DB and learned take precedence; profile fills gaps.
 */
function mergeSelectorCandidates(host, profileSelectors, memorySelectors, dbLocatorsByKey) {
  const dbCandidates = dbLocatorsToCandidates(dbLocatorsByKey);
  const merged = {};
  const allKeys = new Set([
    ...Object.keys(profileSelectors || {}),
    ...Object.keys(memorySelectors || {}),
    ...Object.keys(dbCandidates || {})
  ]);

  for (const key of allKeys) {
    const fromDb = (dbCandidates && dbCandidates[key]) || [];
    const fromMemory = (memorySelectors && memorySelectors[key]) || [];
    const fromProfile = (profileSelectors && profileSelectors[key]) || [];
    const combined = [...fromDb, ...fromMemory, ...fromProfile];
    merged[key] = combined.filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 10);
  }

  return merged;
}

/**
 * Get merged selector candidates for a run: profile + memory + DB.
 */
async function getMergedSelectors(pool, host, profileSelectors, memorySelectors) {
  let dbLocators = {};
  if (pool) {
    try {
      dbLocators = await db.getLocatorsByHost(pool, host);
    } catch (_) {
      // ignore
    }
  }
  return mergeSelectorCandidates(host, profileSelectors, memorySelectors, dbLocators);
}

module.exports = {
  hostFromUrl,
  mergeSelectorCandidates,
  getMergedSelectors,
  dbLocatorsToCandidates
};

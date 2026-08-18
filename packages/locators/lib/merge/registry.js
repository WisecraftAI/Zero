const db = require("@zero/db");

function dbLocatorsToCandidates(dbLocatorsByKey) {
  const out = {};
  for (const [key, list] of Object.entries(dbLocatorsByKey || {})) {
    out[key] = list
      .map((entry) => entry.selectorValue)
      .filter(Boolean);
  }
  return out;
}

function mergeSelectorCandidates(host, profileSelectors, memorySelectors, dbLocatorsByKey) {
  const dbCandidates = dbLocatorsToCandidates(dbLocatorsByKey);
  const merged = {};
  const allKeys = new Set([
    ...Object.keys(profileSelectors || {}),
    ...Object.keys(memorySelectors || {}),
    ...Object.keys(dbCandidates || {})
  ]);

  for (const key of allKeys) {
    const fromDb = dbCandidates[key] || [];
    const fromMemory = (memorySelectors && memorySelectors[key]) || [];
    const fromProfile = (profileSelectors && profileSelectors[key]) || [];
    merged[key] = [...fromDb, ...fromMemory, ...fromProfile]
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 10);
  }

  return merged;
}

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

async function hydrateSelectorMemory(pool, memoryMap, host) {
  if (!pool || !host || !memoryMap) return { host, keys: [] };

  const dbLocators = await db.getLocatorsByHost(pool, host);
  const fromDb = dbLocatorsToCandidates(dbLocators);
  const current = memoryMap.get(host) || {};
  const keys = new Set([...Object.keys(current), ...Object.keys(fromDb)]);

  for (const key of keys) {
    current[key] = [...(fromDb[key] || []), ...(current[key] || [])]
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 6);
  }

  if (keys.size > 0) memoryMap.set(host, current);
  return { host, keys: [...keys] };
}

module.exports = {
  mergeSelectorCandidates,
  getMergedSelectors,
  dbLocatorsToCandidates,
  hydrateSelectorMemory
};

"use strict";

/**
 * Word-aware indicator matching shared by domain and sub-domain classification.
 *
 * Plain `String.includes` produced false positives that flipped whole domains:
 * "exam" matched "examples", "like" matched "likely". Matching is therefore
 * anchored to word edges, tolerant of simple plurals, and tolerant of the
 * separators sites use interchangeably ("sign up" / "sign-up" / "signup").
 */

const PATTERN_CACHE = new Map();

/** Multi-word indicators are far more specific, so they carry more weight. */
const MULTI_WORD_WEIGHT = 2;
const SINGLE_WORD_WEIGHT = 1;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function indicatorWeight(indicator) {
  return /[\s_-]/.test(String(indicator).trim()) ? MULTI_WORD_WEIGHT : SINGLE_WORD_WEIGHT;
}

/**
 * Compile an indicator into a word-boundary regex.
 * `(?<![a-z0-9])` / `(?![a-z0-9])` are used instead of `\b` so that digits and
 * letters both count as "inside a word", while punctuation does not.
 */
function indicatorPattern(indicator) {
  const key = String(indicator).trim().toLowerCase();
  if (!key) return null;

  const cached = PATTERN_CACHE.get(key);
  if (cached) return cached;

  const body = escapeRegExp(key).replace(/(\\?[\s_-])+/g, "[\\s_-]*");
  const pattern = new RegExp(`(?<![a-z0-9])${body}(?:es|s)?(?![a-z0-9])`, "i");
  PATTERN_CACHE.set(key, pattern);
  return pattern;
}

function matchesIndicator(text, indicator) {
  const pattern = indicatorPattern(indicator);
  if (!pattern) return false;
  return pattern.test(text);
}

/**
 * Score a text blob against an indicator list.
 * @returns {{ matched: string[], weighted: number, maxWeight: number, normalized: number }}
 */
function scoreIndicators(text, indicators = []) {
  const haystack = String(text || "").toLowerCase();
  const matched = [];
  let weighted = 0;
  let maxWeight = 0;

  for (const indicator of indicators) {
    const weight = indicatorWeight(indicator);
    maxWeight += weight;
    if (haystack && matchesIndicator(haystack, indicator)) {
      matched.push(indicator);
      weighted += weight;
    }
  }

  return {
    matched,
    weighted,
    maxWeight,
    normalized: maxWeight > 0 ? weighted / maxWeight : 0,
  };
}

/** Whether any hostname fragment hint appears in the host. */
function matchesUrlPattern(hostname, patterns = []) {
  const host = String(hostname || "").toLowerCase();
  if (!host) return null;
  for (const pattern of patterns) {
    const needle = String(pattern || "").toLowerCase();
    if (needle && host.includes(needle)) return needle;
  }
  return null;
}

/**
 * Safer hostname match for sub-domain lift. Bare `includes` lets `exam` select
 * `example.com`. A pattern hits when it equals a DNS label, or (length >= 5)
 * prefixes one. Dotted patterns (`app.`) still match as substrings.
 */
function matchesHostnameLabel(hostname, patterns = []) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host) return null;
  const labels = host.split(".").filter((label) => label && label !== "www");

  for (const pattern of patterns) {
    const needle = String(pattern || "").toLowerCase();
    if (!needle) continue;
    if (needle.includes(".")) {
      if (host.includes(needle)) return needle;
      continue;
    }
    const hit = labels.some(
      (label) => label === needle || (needle.length >= 5 && label.startsWith(needle))
    );
    if (hit) return needle;
  }
  return null;
}

module.exports = {
  scoreIndicators,
  matchesIndicator,
  matchesUrlPattern,
  matchesHostnameLabel,
  indicatorWeight,
  indicatorPattern,
  MULTI_WORD_WEIGHT,
  SINGLE_WORD_WEIGHT,
};

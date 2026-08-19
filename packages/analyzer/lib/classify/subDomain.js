"use strict";

const { getSubDomains } = require("./domainTaxonomy");
const { scoreIndicators, matchesUrlPattern } = require("./indicatorMatch");

/** A hostname hit is strong evidence; body text alone is weaker. */
const URL_HIT_BONUS = 0.35;
const URL_HIT_CONFIDENCE_FLOOR = 0.6;
/** Nav labels and URL paths are curated by the site itself, so they count extra. */
const STRUCTURAL_MATCH_BONUS = 0.06;
const MAX_STRUCTURAL_BONUS = 0.24;
const CONFIDENCE_BASE = 0.3;
const MAX_CONFIDENCE = 0.95;
/** Body text on its own needs corroboration before it can name a sub-domain. */
const MIN_TEXT_MATCHES = 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rank the sub-domains of a domain against crawl signals. Pure and page-free so
 * it can be unit tested and reused by the orchestrator.
 *
 * @returns {{ subDomain: object|null, candidates: object[] }}
 */
function scoreSubDomains(signals = {}) {
  const {
    domainKey,
    text = "",
    hostname = "",
    navLabels = [],
    paths = [],
    formPurposes = [],
  } = signals;

  const configs = getSubDomains(domainKey);
  if (!Object.keys(configs).length) return { subDomain: null, candidates: [] };

  const structuralText = [...navLabels, ...paths, ...formPurposes].join(" ");
  const fullText = [text, structuralText].join(" ");

  const candidates = [];

  for (const [key, config] of Object.entries(configs)) {
    const textScore = scoreIndicators(fullText, config.indicators);
    const structuralScore = scoreIndicators(structuralText, config.indicators);
    const urlHit = matchesUrlPattern(hostname, config.urlPatterns);

    const structuralBonus = Math.min(
      structuralScore.matched.length * STRUCTURAL_MATCH_BONUS,
      MAX_STRUCTURAL_BONUS
    );
    const urlBonus = urlHit ? URL_HIT_BONUS : 0;
    const evidence = textScore.normalized + structuralBonus + urlBonus;

    // A hostname hint alone is enough; text alone must corroborate itself.
    const admissible = Boolean(urlHit) || textScore.matched.length >= MIN_TEXT_MATCHES;
    if (!admissible || evidence <= 0) continue;

    let confidence = clamp(CONFIDENCE_BASE + evidence, 0, MAX_CONFIDENCE);
    if (urlHit) confidence = Math.max(confidence, URL_HIT_CONFIDENCE_FLOOR);

    candidates.push({
      key,
      name: config.name,
      confidence: Number(confidence.toFixed(3)),
      matchedIndicators: textScore.matched.slice(0, 8),
      urlPattern: urlHit || null,
      testPriorities: config.testPriorities || [],
      criticalFlows: config.criticalFlows || [],
      source: "rules",
    });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);

  return {
    subDomain: candidates[0] || null,
    candidates: candidates.slice(0, 3),
  };
}

async function readSubDomainText(page) {
  const body = await page
    .evaluate(() => document.body?.innerText || "")
    .catch(() => "");
  const title = await page.title().catch(() => "");
  const description = await page
    .$eval('meta[name="description"]', (m) => m.content || "")
    .catch(() => "");
  const keywords = await page
    .$eval('meta[name="keywords"]', (m) => m.content || "")
    .catch(() => "");

  return `${body} ${title} ${description} ${keywords}`;
}

/**
 * Detect the business sub-domain (Banking → Insurance) for an already-classified
 * domain. Returns null when the domain has no sub-domains or evidence is thin.
 */
async function detectSubDomain(page, url, websiteType = {}, extraSignals = {}) {
  const domainKey = websiteType.type;
  if (!domainKey || !Object.keys(getSubDomains(domainKey)).length) {
    return { subDomain: null, candidates: [] };
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    /* hostname stays empty; text signals still apply */
  }

  let text = "";
  try {
    text = await readSubDomainText(page);
  } catch (error) {
    console.error("Sub-domain text read error:", error.message);
  }

  return scoreSubDomains({
    domainKey,
    text,
    hostname,
    navLabels: extraSignals.navLabels || [],
    paths: extraSignals.paths || [],
    formPurposes: extraSignals.formPurposes || [],
  });
}

module.exports = {
  detectSubDomain,
  scoreSubDomains,
};

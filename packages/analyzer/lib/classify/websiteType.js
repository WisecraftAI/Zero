const { WEBSITE_TYPES } = require('../constants');
const { scoreIndicators, matchesUrlPattern } = require('./indicatorMatch');
const { getSubDomains } = require('./domainTaxonomy');

/** Hostname hits are treated as near-certain. */
const URL_MATCH_CONFIDENCE = 0.9;
/** Page-text classification needs corroborating evidence, not a single hit. */
const MIN_TEXT_MATCHES = 2;
const MIN_NORMALIZED_SCORE = 0.25;
const CONFIDENCE_BASE = 0.3;
const MAX_TEXT_CONFIDENCE = 0.85;

async function detectWebsiteType(page, url) {
  const result = {
    type: 'GENERIC',
    typeName: 'Website',
    confidence: 0,
    indicators: [],
    candidates: []
  };

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // First check URL patterns (highest confidence)
    for (const [type, config] of Object.entries(WEBSITE_TYPES)) {
      const hit = matchesUrlPattern(hostname, config.urlPatterns);
      if (hit) {
        result.type = type;
        result.typeName = config.name;
        result.confidence = URL_MATCH_CONFIDENCE;
        result.indicators.push(`URL pattern match: ${hostname}`);
        break;
      }
    }

    // If not matched by URL, analyze page content
    if (result.confidence < 0.5) {
      const pageText = await page.evaluate(() => {
        return document.body?.innerText?.toLowerCase() || '';
      }).catch(() => '');

      const pageTitle = await page.title().catch(() => '');
      const metaDescription = await page.$eval('meta[name="description"]', m => m.content?.toLowerCase()).catch(() => '');
      const combinedText = `${pageText} ${pageTitle} ${metaDescription}`.toLowerCase();

      const ranked = [];

      for (const [type, config] of Object.entries(WEBSITE_TYPES)) {
        // Score the domain's own vocabulary and each of its sub-domains'
        // separately, then keep the best. Insurance sites, for example, contain
        // none of the generic banking words but plenty of insurance ones — and
        // pooling every set into one list would just dilute the score.
        const indicatorSets = [];
        if (config.indicators.length) {
          indicatorSets.push({ label: 'domain', indicators: config.indicators });
        }
        for (const sub of Object.values(getSubDomains(type))) {
          if (sub.indicators && sub.indicators.length) {
            indicatorSets.push({ label: sub.name, indicators: sub.indicators });
          }
        }
        if (!indicatorSets.length) continue;

        let best = null;
        for (const set of indicatorSets) {
          const score = scoreIndicators(combinedText, set.indicators);
          if (!score.matched.length) continue;
          if (!best || score.normalized > best.score.normalized) best = { set, score };
        }
        if (!best) continue;

        ranked.push({
          type,
          typeName: config.name,
          matched: best.score.matched,
          normalized: best.score.normalized,
          via: best.set.label,
          confidence: Math.min(MAX_TEXT_CONFIDENCE, CONFIDENCE_BASE + best.score.normalized)
        });
      }

      ranked.sort((a, b) => b.normalized - a.normalized || b.matched.length - a.matched.length);
      result.candidates = ranked.slice(0, 3).map((entry) => ({
        type: entry.type,
        typeName: entry.typeName,
        confidence: Number(entry.confidence.toFixed(3)),
        matchedIndicators: entry.matched.slice(0, 8),
        matchedVia: entry.via
      }));

      // Require several distinct, word-boundary matches before naming a domain.
      // A single loose hit used to be enough, which is how a two-sentence page
      // became an "Education Platform".
      const best = ranked[0];
      if (best && best.matched.length >= MIN_TEXT_MATCHES && best.normalized > MIN_NORMALIZED_SCORE) {
        result.type = best.type;
        result.typeName = best.typeName;
        result.confidence = best.confidence;
        result.indicators = best.matched;
      }
    }

    // Special handling for retail stores
    if (hostname.includes('saravana') || hostname.includes('supersaravana')) {
      result.type = 'RETAIL_STORE';
      result.typeName = 'Retail Store (Super Saravana Stores)';
      result.confidence = 0.95;
      result.indicators = ['saravana stores brand'];
    }

    // Add testing priorities and critical flows
    const typeConfig = WEBSITE_TYPES[result.type];
    result.testPriorities = typeConfig.testPriorities;
    result.criticalFlows = typeConfig.criticalFlows;

  } catch (error) {
    console.error('Website type detection error:', error.message);
  }

  return result;
}

module.exports = { detectWebsiteType };

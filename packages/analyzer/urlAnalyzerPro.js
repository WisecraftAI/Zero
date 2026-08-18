/**
 * @zero/analyzer — URL Analyzer Pro (default package entry).
 * Deep Playwright crawl that seeds BA when the pipeline selects webAnalyzer.
 */
const { analyzeUrlPro } = require('./lib/strategies/pro');
const { formatForBAAgent } = require('./lib/format/baPro');
const { detectWebsiteType } = require('./lib/classify/websiteType');
const { generateTestCases } = require('./lib/generate/proTestCases');
const { generateBRD } = require('./lib/generate/proBrd');
const { WEBSITE_TYPES, ELEMENT_CATEGORIES } = require('./lib/constants');

module.exports = {
  analyzeUrlPro,
  formatForBAAgent,
  detectWebsiteType,
  generateTestCases,
  generateBRD,
  WEBSITE_TYPES,
  ELEMENT_CATEGORIES
};

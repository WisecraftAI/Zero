/**
 * @zero/analyzer — URL Analyzer Pro (default package entry).
 * Deep Playwright crawl that seeds BA when the pipeline selects webAnalyzer.
 */
const { analyzeUrlPro } = require('./lib/strategies/pro');
const { formatForBAAgent } = require('./lib/format/baPro');
const { detectWebsiteType, matchHostnameToDomain } = require('./lib/classify/websiteType');
const { detectSubDomain, scoreSubDomains } = require('./lib/classify/subDomain');
const {
  SUB_DOMAINS,
  getSubDomains,
  hasSubDomains,
  subDomainNames,
  resolveSubDomain
} = require('./lib/classify/domainTaxonomy');
const { generateTestCases } = require('./lib/generate/proTestCases');
const { generateBRD } = require('./lib/generate/proBrd');
const { WEBSITE_TYPES, ELEMENT_CATEGORIES } = require('./lib/constants');
const { ANALYZER_USER_AGENT, ANALYZER_BROWSER_CONTEXT } = require('./lib/crawl/settle');

module.exports = {
  analyzeUrlPro,
  formatForBAAgent,
  detectWebsiteType,
  matchHostnameToDomain,
  detectSubDomain,
  scoreSubDomains,
  generateTestCases,
  generateBRD,
  WEBSITE_TYPES,
  ELEMENT_CATEGORIES,
  SUB_DOMAINS,
  getSubDomains,
  hasSubDomains,
  subDomainNames,
  resolveSubDomain,
  ANALYZER_USER_AGENT,
  ANALYZER_BROWSER_CONTEXT
};

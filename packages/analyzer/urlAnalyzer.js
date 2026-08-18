/**
 * @zero/analyzer — light URL Analyzer strategy.
 * Heuristic crawl (Playwright) with a smaller category set and legacy result shape.
 */
const { analyzeUrl } = require('./lib/strategies/light');
const { generateBRD } = require('./lib/generate/lightBrd');
const { generateTestCasesFromAnalysis } = require('./lib/generate/lightTestCases');
const { formatObservationsForBA } = require('./lib/format/baLight');
const { LIGHT_ELEMENT_CATEGORIES, ACTION_TYPES } = require('./lib/constants');

module.exports = {
  analyzeUrl,
  generateBRD,
  generateTestCasesFromAnalysis,
  formatObservationsForBA,
  ELEMENT_CATEGORIES: LIGHT_ELEMENT_CATEGORIES,
  ACTION_TYPES
};

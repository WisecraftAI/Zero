const { ELEMENT_CATEGORIES } = require('../constants');
const { analyzeElements } = require('../crawl/elements');
const { analyzePageStructure } = require('../crawl/pageStructure');
const { analyzeFormsDeep } = require('../crawl/forms');
const { detectAntiBot, detectDynamicContent } = require('../crawl/signals');
const { detectWebsiteType } = require('../classify/websiteType');
const { detectUserFlows } = require('../flows/proFlows');
const { generateBRD } = require('../generate/proBrd');
const { generateTestCases } = require('../generate/proTestCases');

/**
 * Main URL Analyzer Pro entry — Playwright deep crawl.
 */
async function analyzeUrlPro(page, url, options = {}) {
  const startTime = Date.now();

  const result = {
    url,
    analyzedAt: new Date().toISOString(),
    source: 'URL Analyzer Pro',
    version: '2.0',
    websiteType: null,
    pageStructure: null,
    elements: [],
    forms: [],
    userFlows: [],
    brd: null,
    testCases: [],
    observations: [],
    warnings: [],
    pagesAnalyzed: 1,
    analysisTime: 0,
    antiBot: false,
    dynamicContent: false
  };

  try {
    console.log(`[URL Analyzer Pro] Analyzing: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    result.websiteType = await detectWebsiteType(page, url);
    console.log(
      `[URL Analyzer Pro] Detected type: ${result.websiteType.typeName} (${Math.round(result.websiteType.confidence * 100)}% confidence)`
    );

    result.observations.push({
      type: 'info',
      category: 'Detection',
      message: `Website identified as: ${result.websiteType.typeName}`,
      confidence: result.websiteType.confidence,
      indicators: result.websiteType.indicators
    });

    result.antiBot = await detectAntiBot(page);
    if (result.antiBot) {
      result.warnings.push(
        'Anti-bot protection detected. Some automated tests may fail. Consider using headed browser mode.'
      );
      result.observations.push({
        type: 'warning',
        category: 'Security',
        message: 'Anti-bot protection detected on website'
      });
    }

    result.pageStructure = await analyzePageStructure(page);

    const allElements = [];
    for (const [category, config] of Object.entries(ELEMENT_CATEGORIES)) {
      const categoryElements = await analyzeElements(page, category, config.selectors);
      allElements.push(...categoryElements);

      if (categoryElements.length > 0) {
        result.observations.push({
          type: 'info',
          category,
          message: `Found ${categoryElements.length} ${category.toLowerCase()} elements`,
          count: categoryElements.length,
          priority: config.priority,
          samples: categoryElements.slice(0, 3).map((e) => e.selector)
        });
      }
    }
    result.elements = allElements;

    result.forms = await analyzeFormsDeep(page);
    if (result.forms.length > 0) {
      result.observations.push({
        type: 'info',
        category: 'Forms',
        message: `Found ${result.forms.length} forms: ${result.forms.map((f) => f.purpose).join(', ')}`,
        forms: result.forms.map((f) => ({ id: f.id, purpose: f.purpose, fields: f.fieldCount }))
      });
    }

    result.dynamicContent = await detectDynamicContent(page);
    if (result.dynamicContent) {
      result.observations.push({
        type: 'info',
        category: 'Technical',
        message: 'Dynamic content framework detected (React/Angular/Vue/Next.js)',
        recommendation: 'Use data-testid selectors for more stable automation'
      });
    }

    result.userFlows = detectUserFlows(result.websiteType, result.elements, result.forms);

    if (result.userFlows.length > 0) {
      result.observations.push({
        type: 'info',
        category: 'Flows',
        message: `Detected ${result.userFlows.length} user flows`,
        flows: result.userFlows.map((f) => ({ name: f.name, priority: f.priority }))
      });
    }

    result.brd = generateBRD(result);
    result.testCases = generateTestCases(result);
    result.analysisTime = Date.now() - startTime;

    result.observations.unshift({
      type: 'summary',
      category: 'Analysis Complete',
      message: `Website analysis completed in ${result.analysisTime}ms`,
      stats: {
        websiteType: result.websiteType.typeName,
        elementsFound: result.elements.length,
        formsFound: result.forms.length,
        userFlowsDetected: result.userFlows.length,
        testCasesGenerated: result.testCases.length,
        brdRequirements: result.brd?.functionalRequirements?.length || 0
      }
    });

    console.log(
      `[URL Analyzer Pro] Analysis complete: ${result.elements.length} elements, ${result.userFlows.length} flows, ${result.testCases.length} test cases`
    );
  } catch (error) {
    console.error(`[URL Analyzer Pro] Error: ${error.message}`);
    result.error = error.message;
    result.warnings.push(`Analysis error: ${error.message}`);
  }

  return result;
}

module.exports = { analyzeUrlPro };

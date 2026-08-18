const { getDomainConfig } = require('@zero/locators/ecommerceSelectors');
const { LIGHT_ELEMENT_CATEGORIES } = require('../constants');
const { analyzeElementLight } = require('../crawl/elements');
const { analyzePageStructure } = require('../crawl/pageStructure');
const { analyzeFormsDeep } = require('../crawl/forms');
const { detectAntiBot, detectDynamicContent } = require('../crawl/signals');
const { detectUserFlows } = require('../flows/lightFlows');
const { generateBRD } = require('../generate/lightBrd');
const { generateTestCasesFromAnalysis } = require('../generate/lightTestCases');
const { detectFeatures, generateAutomationSelectors } = require('../generate/lightFeatures');

/**
 * Light URL Analyzer — heuristic crawl that seeds BA when notes are short.
 */
async function analyzeUrl(page, url, options = {}) {
  const startTime = Date.now();
  const result = {
    metadata: {
      url,
      analyzedAt: new Date().toISOString(),
      source: 'URL Analyzer Agent',
      duration: 0
    },
    siteOverview: {},
    pageStructure: {},
    discoveredFeatures: [],
    discoveredForms: [],
    discoveredElements: {},
    userFlows: [],
    selectors: {},
    brd: null,
    generatedTestCases: [],
    observations: [],
    warnings: [],
    domainConfig: {}
  };

  try {
    const domainConfig = getDomainConfig(url);
    result.domainConfig = domainConfig;
    result.metadata.domain = domainConfig.domain;
    result.metadata.siteName = domainConfig.name;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    result.antiBot = await detectAntiBot(page);
    if (result.antiBot) {
      result.warnings.push('Anti-bot protection detected. Some automated tests may fail.');
      result.observations.push({
        type: 'warning',
        category: 'Security',
        message: 'Website has anti-bot protection that may interfere with automated testing'
      });
    }

    const pageTitle = await page.title();
    const metaDescription = await page
      .$eval('meta[name="description"]', (m) => m.content)
      .catch(() => '');

    result.siteOverview = {
      title: pageTitle,
      description: metaDescription,
      url,
      type: domainConfig.name,
      pagesDiscovered: 1
    };

    result.pageStructure = await analyzePageStructure(page);

    for (const [category, selectors] of Object.entries(LIGHT_ELEMENT_CATEGORIES)) {
      const elements = [];
      for (const selector of selectors) {
        const found = await analyzeElementLight(page, selector, category);
        elements.push(...found);
      }
      const unique = elements.filter(
        (el, i, arr) => arr.findIndex((e) => e.selector === el.selector) === i
      );
      result.discoveredElements[category] = unique;

      if (unique.length > 0) {
        result.observations.push({
          type: 'info',
          category,
          message: `Found ${unique.length} ${category.toLowerCase()} elements`,
          count: unique.length,
          samples: unique.slice(0, 3).map((e) => e.selector)
        });
      }
    }

    result.discoveredForms = await analyzeFormsDeep(page);

    const allElements = Object.values(result.discoveredElements).flat();
    result.discoveredFeatures = detectFeatures(allElements, result.discoveredForms, domainConfig);
    result.userFlows = detectUserFlows(domainConfig, allElements);
    result.selectors = generateAutomationSelectors(allElements, domainConfig);

    result.dynamicContent = await detectDynamicContent(page);
    if (result.dynamicContent) {
      result.observations.push({
        type: 'info',
        category: 'Technical',
        message: 'Dynamic content framework detected (React/Angular/Vue/Next.js)',
        recommendation: 'Use data-testid selectors when available for more stable automation'
      });
    }

    const navLinks = result.discoveredElements.NAVIGATION || [];
    const hostname = new URL(url).hostname;
    const internalLinks = navLinks
      .filter((l) => l.href && l.href.includes(hostname) && !l.href.includes('#'))
      .slice(0, 5);

    for (const link of internalLinks) {
      try {
        await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        const subTitle = await page.title();
        result.siteOverview.pagesDiscovered++;
        result.observations.push({
          type: 'info',
          category: 'Navigation',
          message: `Discovered page: ${link.text} -> ${subTitle}`,
          url: link.href
        });
      } catch (_) { /* skip failed pages */ }
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    result.brd = generateBRD(result);
    result.generatedTestCases = generateTestCasesFromAnalysis(result);
    result.metadata.duration = Date.now() - startTime;

    result.observations.unshift({
      type: 'summary',
      category: 'Analysis',
      message: `Website analysis completed in ${result.metadata.duration}ms`,
      stats: {
        featuresFound: result.discoveredFeatures.length,
        formsFound: result.discoveredForms.length,
        userFlowsDetected: result.userFlows.length,
        testCasesGenerated: result.generatedTestCases.length,
        pagesAnalyzed: result.siteOverview.pagesDiscovered
      }
    });
  } catch (error) {
    result.error = error.message;
    result.warnings.push(`Analysis error: ${error.message}`);
  }

  return result;
}

module.exports = { analyzeUrl };

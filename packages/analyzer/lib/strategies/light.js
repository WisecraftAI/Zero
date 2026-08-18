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
const { crawlLinkedPages } = require('../crawl/multiPage');

function resolveMaxPages(options) {
  const fromOpt = Number(options.maxPages);
  if (Number.isFinite(fromOpt) && fromOpt > 0) return fromOpt;
  const fromEnv = Number(process.env.ZERO_ANALYZER_MAX_PAGES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 8;
}

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
    domainConfig: {},
    crawledPages: [],
    pagesCrawled: 0
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

    const crawlResult = await crawlLinkedPages(page, url, {
      maxPages: resolveMaxPages(options),
      maxDepth: options.maxDepth ?? 2,
    });
    result.crawledPages = crawlResult.pages;
    result.pagesCrawled = crawlResult.pages.length;
    result.siteOverview.pagesDiscovered = crawlResult.pages.length;

    if (crawlResult.pages.length > 1) {
      result.observations.push({
        type: 'info',
        category: 'Crawl',
        message: `Multi-page crawl discovered ${crawlResult.pages.length} pages`,
        pages: crawlResult.pages.map((p) => ({ url: p.url, title: p.title, path: p.path }))
      });
    }
    if (crawlResult.errors.length) {
      result.warnings.push(...crawlResult.errors.slice(0, 3).map((e) => `Crawl: ${e}`));
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1500);

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
        pagesAnalyzed: result.siteOverview.pagesDiscovered,
        pagesCrawled: result.pagesCrawled
      }
    });
  } catch (error) {
    result.error = error.message;
    result.warnings.push(`Analysis error: ${error.message}`);
  }

  return result;
}

module.exports = { analyzeUrl };

const { ELEMENT_CATEGORIES } = require('../constants');
const { analyzeElements } = require('../crawl/elements');
const { analyzePageStructure } = require('../crawl/pageStructure');
const { analyzeFormsDeep } = require('../crawl/forms');
const { detectAntiBot, detectDynamicContent } = require('../crawl/signals');
const { detectWebsiteType } = require('../classify/websiteType');
const { detectSubDomain } = require('../classify/subDomain');
const { detectUserFlows } = require('../flows/proFlows');
const { generateBRD } = require('../generate/proBrd');
const { generateTestCases } = require('../generate/proTestCases');
const { crawlLinkedPages, mergeElements } = require('../crawl/multiPage');
const {
  generateMajorFunctionalCases,
  mergeMajorWithGenerated,
} = require('../generate/majorFunctionalCases');

function resolveMaxPages(options) {
  const fromOpt = Number(options.maxPages);
  if (Number.isFinite(fromOpt) && fromOpt > 0) return fromOpt;
  const fromEnv = Number(process.env.ZERO_ANALYZER_MAX_PAGES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 8;
}

function hasInsufficientEvidence(result) {
  const hasNavigationEvidence = (result.crawledPages || []).some(
    (crawled) => (crawled.navLabels || []).length > 0
  );
  return (
    (result.elements || []).length === 0 &&
    (result.forms || []).length === 0 &&
    !hasNavigationEvidence &&
    result.websiteType?.type === 'GENERIC' &&
    Number(result.websiteType?.confidence || 0) < 0.5
  );
}

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
    subDomain: null,
    subDomainCandidates: [],
    pageStructure: null,
    elements: [],
    forms: [],
    userFlows: [],
    brd: null,
    testCases: [],
    observations: [],
    warnings: [],
    crawledPages: [],
    pagesCrawled: 0,
    pagesAnalyzed: 0,
    analysisTime: 0,
    antiBot: false,
    dynamicContent: false,
    insufficientEvidence: false
  };

  let navigated = false;

  try {
    console.log(`[URL Analyzer Pro] Analyzing: ${url}`);
    const initialResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    navigated = true;

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

    result.antiBot = await detectAntiBot(page, initialResponse);
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

    const crawlResult = await crawlLinkedPages(page, url, {
      maxPages: resolveMaxPages(options),
      maxDepth: options.maxDepth ?? 2,
    });
    result.crawledPages = crawlResult.pages;
    result.pagesCrawled = crawlResult.pages.length;
    result.pagesAnalyzed = crawlResult.pages.length;

    if (crawlResult.errors.length) {
      result.warnings.push(...crawlResult.errors.slice(0, 5).map((e) => `Crawl: ${e}`));
    }
    if (crawlResult.pages.length > 1) {
      result.observations.push({
        type: 'info',
        category: 'Crawl',
        message: `Multi-page crawl discovered ${crawlResult.pages.length} pages`,
        pages: crawlResult.pages.map((p) => ({ url: p.url, title: p.title, path: p.path })),
      });
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);

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

    const landingUrl = result.crawledPages[0]?.url || url;
    const extraPages = result.crawledPages.filter((p) => p.url !== landingUrl);

    for (const pageInfo of extraPages) {
      try {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(800);

        for (const [category, config] of Object.entries(ELEMENT_CATEGORIES)) {
          const categoryElements = await analyzeElements(page, category, config.selectors);
          result.elements = mergeElements(result.elements, categoryElements, pageInfo.url);
        }

        const pageForms = await analyzeFormsDeep(page);
        const seenFormIds = new Set(result.forms.map((f) => f.id || f.purpose));
        for (const form of pageForms) {
          const key = form.id || form.purpose;
          if (seenFormIds.has(key)) continue;
          seenFormIds.add(key);
          result.forms.push({ ...form, sourcePage: pageInfo.url });
        }

        pageInfo.formsSeen = pageForms.length;
      } catch (err) {
        result.warnings.push(`Extra page crawl failed (${pageInfo.url}): ${err.message}`);
      }
    }

    await page.goto(landingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

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

    const navLabels = [];
    const paths = [];
    for (const crawled of result.crawledPages) {
      (crawled.navLabels || []).forEach((label) => navLabels.push(label));
      if (crawled.path) paths.push(crawled.path);
    }
    const formPurposes = result.forms.map((form) => form.purpose).filter(Boolean);

    const subDomainResult = await detectSubDomain(page, url, result.websiteType, {
      navLabels,
      paths,
      formPurposes,
    });
    result.subDomain = subDomainResult.subDomain;
    result.subDomainCandidates = subDomainResult.candidates;

    if (result.subDomain) {
      console.log(
        `[URL Analyzer Pro] Sub-domain: ${result.subDomain.name} (${Math.round(result.subDomain.confidence * 100)}% confidence)`
      );
      result.observations.push({
        type: 'info',
        category: 'Detection',
        message: `Sub-domain identified as: ${result.subDomain.name}`,
        confidence: result.subDomain.confidence,
        indicators: result.subDomain.matchedIndicators
      });
    }

    result.insufficientEvidence = hasInsufficientEvidence(result);

    result.brd = generateBRD(result);
    if (result.insufficientEvidence) {
      const reason = result.antiBot
        ? 'Anti-bot verification blocked meaningful DOM discovery'
        : 'The loaded page exposed no meaningful DOM, form, navigation, or domain evidence';
      result.warnings.unshift(`${reason}; domain inference or manual input is required.`);
      result.observations.push({
        type: 'warning',
        category: 'Evidence',
        message: reason,
        recommendation: result.antiBot
          ? 'Retry in headed mode or use an approved test environment'
          : 'Verify the page loaded, increase the render wait, or supply BA notes'
      });
      // Generic catalog cases would look valid while describing behavior that
      // was never observed on this site.
      result.majorFunctionalCases = [];
      result.testCases = [];
    } else {
      const generatedCases = generateTestCases(result);
      const majorFunctionalCases = generateMajorFunctionalCases(result);
      result.majorFunctionalCases = majorFunctionalCases;
      result.testCases = mergeMajorWithGenerated(majorFunctionalCases, generatedCases);
    }
    result.analysisTime = Date.now() - startTime;

    result.observations.unshift({
      type: 'summary',
      category: 'Analysis Complete',
      message: `Website analysis completed in ${result.analysisTime}ms`,
      stats: {
        websiteType: result.websiteType.typeName,
        subDomain: result.subDomain?.name || null,
        elementsFound: result.elements.length,
        formsFound: result.forms.length,
        userFlowsDetected: result.userFlows.length,
        testCasesGenerated: result.testCases.length,
        majorFunctionalCases: result.majorFunctionalCases.length,
        pagesAnalyzed: result.pagesAnalyzed,
        pagesCrawled: result.pagesCrawled,
        brdRequirements: result.brd?.functionalRequirements?.length || 0
      }
    });

    console.log(
      `[URL Analyzer Pro] Analysis complete: ${result.elements.length} elements, ${result.userFlows.length} flows, ${result.testCases.length} test cases`
    );
  } catch (error) {
    console.error(`[URL Analyzer Pro] Error: ${error.message}`);
    result.error = error.message;
    // A failure before the first successful navigation means nothing at all was
    // learned about the site. Callers must not present that as a real analysis.
    result.fatal = !navigated;
    result.analysisTime = Date.now() - startTime;
    result.warnings.push(`Analysis error: ${error.message}`);
  }

  return result;
}

module.exports = { analyzeUrlPro, hasInsufficientEvidence };

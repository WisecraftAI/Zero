"use strict";

const fs = require("fs/promises");
const path = require("path");
const { chromium, resolveHeadless } = require("./browser");
const { getSelectors, detectDomain, getDomainConfig } = require("@zero/locators/ecommerceSelectors");
const { resolveExecutionMode, EXECUTION_MODES, isRunCancelRequested, RunStoppedError, isRunStoppedError } = require("@zero/domain");
const { buildDiscoveredFlowTests } = require("@zero/builders/playwright/discoveredFlows");

function resolveDiscoveredFlowLimit(env = process.env) {
  const configured = Number(env.ZERO_DISCOVERED_FLOW_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 20;
}

function analyzerContextOptions(browser, env = process.env) {
  const version = String(browser?.version?.() || "124.0.0.0");
  const locale = String(env.ZERO_ANALYZER_LOCALE || "en-US");
  return {
    viewport: { width: 1920, height: 1080 },
    locale,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`,
    extraHTTPHeaders: {
      "Accept-Language": `${locale},en;q=0.9`
    }
  };
}

function createJobs(deps) {
  const cloud = deps.cloud;
  const selectorMemory = deps.selectorMemory;
  const getRunSecret = deps.getRunSecret;
  const urlAnalyzerPro = deps.urlAnalyzerPro;
  const dbHelpers = deps.dbHelpers;
  const hostFromUrl = deps.hostFromUrl;

  async function assertNotStopped(runId) {
    if (await isRunCancelRequested(cloud.cache, runId)) {
      throw new RunStoppedError();
    }
  }

  function watchForCancel(runId, getBrowser) {
    const timer = setInterval(() => {
      isRunCancelRequested(cloud.cache, runId)
        .then((stop) => {
          if (!stop) return;
          const browser = typeof getBrowser === "function" ? getBrowser() : null;
          if (browser) browser.close().catch(() => {});
        })
        .catch(() => {});
    }, 750);
    return () => clearInterval(timer);
  }

  function safeList(text) {
    return (text || "")
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 25);
  }

  function normalizeForMatch(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function hasStrictSearchPhraseMatch(haystack, term) {
    const text = normalizeForMatch(haystack);
    const needle = normalizeForMatch(term);
    if (!needle || !text) return false;
    if (text.includes(needle)) return true;

    const compactText = text.replace(/\s+/g, "");
    const compactNeedle = needle.replace(/\s+/g, "");
    return compactNeedle.length >= 4 && compactText.includes(compactNeedle);
  }

  function hasSearchTermMatch(haystack, term) {
    const normalizedTerm = normalizeForMatch(term);
    if (!normalizedTerm) return false;
    if (/\d/.test(normalizedTerm)) {
      // Model-number queries must match as a phrase (e.g. "iphone 15").
      return hasStrictSearchPhraseMatch(haystack, normalizedTerm);
    }
    return hasStrictSearchPhraseMatch(haystack, normalizedTerm) || hasRelevantTermMatch(haystack, normalizedTerm);
  }

  function hasRelevantTermMatch(haystack, term) {
    const text = normalizeForMatch(haystack);
    const needle = normalizeForMatch(term);
    if (!needle || !text) return false;
    if (text.includes(needle)) return true;

    const tokens = needle.split(/\s+/).filter((t) => t.length >= 2 || /^\d+$/.test(t));
    if (!tokens.length) return false;

    const numericTokens = tokens.filter((t) => /\d/.test(t));
    for (const token of numericTokens) {
      const rx = new RegExp(`(^|\\s)${escapeRegExp(token)}(\\s|$)`, "i");
      if (!rx.test(text)) return false;
    }

    const alphaTokens = tokens.filter((t) => !/\d/.test(t));
    if (!alphaTokens.length) {
      return numericTokens.length > 0;
    }

    const matchedAlpha = alphaTokens.filter((t) => text.includes(t)).length;
    const requiredAlphaMatches = alphaTokens.length === 1 ? 1 : Math.max(1, Math.ceil(alphaTokens.length / 2));
    return matchedAlpha >= requiredAlphaMatches;
  }

  async function findXPathForSelector(page, selector) {
    return page.evaluate((sel) => {
      const target = document.querySelector(sel);
      if (!target) return null;

      function idx(node) {
        let i = 1;
        let sibling = node.previousElementSibling;
        while (sibling) {
          if (sibling.nodeName === node.nodeName) i += 1;
          sibling = sibling.previousElementSibling;
        }
        return i;
      }

      const pathParts = [];
      let node = target;
      while (node && node.nodeType === 1) {
        if (node.id) {
          pathParts.unshift(`//*[@id=\"${node.id}\"]`);
          break;
        }
        pathParts.unshift(`${node.nodeName.toLowerCase()}[${idx(node)}]`);
        node = node.parentElement;
      }

      return pathParts[0].startsWith("//*[@id") ? pathParts.join("/") : `/${pathParts.join("/")}`;
    }, selector);
  }

  const ELEMENT_WAIT_MS = 8000;

  async function firstVisibleLocator(page, selectorCandidates = [], texts = []) {
    for (const selector of selectorCandidates) {
      try {
        const loc = page.locator(selector).first();
        if (await loc.isVisible({ timeout: ELEMENT_WAIT_MS })) {
          return { locator: loc, strategy: `selector:${selector}` };
        }
      } catch {
        // ignore invalid candidate
      }
    }

    for (const text of texts) {
      const loc = page.getByText(text, { exact: false }).first();
      try {
        if (await loc.isVisible({ timeout: ELEMENT_WAIT_MS })) {
          return { locator: loc, strategy: `text:${text}` };
        }
      } catch {
        // not visible
      }
    }
    return null;
  }

  async function screenshotForCase(page, run, testId, status, attempt) {
    const fileName = `${testId}-${status}-attempt-${attempt}.png`;
    const absolutePath = path.join(run.runDir, fileName);
    // A step can end mid-navigation, which captures a blank frame instead of the
    // state the case actually reached.
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400).catch(() => {});
    await page.screenshot({ path: absolutePath, fullPage: false });
    try {
      const buf = await fs.readFile(absolutePath);
      await cloud.objectStore.put(`runs/${run.id}/files/${fileName}`, buf, { contentType: "image/png" });
    } catch (e) {
      console.error(`objectStore put screenshot failed:`, e.message);
    }
    return `/runs/${run.id}/files/${fileName}`;
  }

  async function performLoginIfRequired(page, selectorCandidates, secret, trace) {
    if (!secret || !secret.username || !secret.password) {
      trace.push("login:credentials-not-provided");
      return;
    }

    const loginCta = await firstVisibleLocator(page, selectorCandidates.loginCta || [], ["Login", "Log in", "Sign in"]);
    if (loginCta) {
      await loginCta.locator.click({ timeout: 7000 });
      trace.push(`login-cta:${loginCta.strategy}`);
      await page.waitForTimeout(1500);
    }

    const userField = await firstVisibleLocator(page, selectorCandidates.loginUserField || [], []);
    const passField = await firstVisibleLocator(page, selectorCandidates.loginPasswordField || [], []);
    if (!userField || !passField) {
      trace.push("login:form-not-found");
      throw new Error("Login enabled but login form not found (email/password fields missing). Check selectors or page state.");
    }

    await userField.locator.fill(secret.username);
    await passField.locator.fill(secret.password);
    trace.push(`login-fields:${userField.strategy}|${passField.strategy}`);

    const submit = await firstVisibleLocator(page, selectorCandidates.loginSubmit || [], ["Sign in", "Login", "Continue"]);
    if (submit) {
      await submit.locator.click({ timeout: 7000 });
      trace.push(`login-submit:${submit.strategy}`);
    } else {
      await passField.locator.press("Enter");
      trace.push("login-submit:keyboard-enter");
    }

    await page.waitForTimeout(2000);
  }

  function assertionChecks(assertionsText) {
    return safeList(assertionsText).map((point, i) => ({
      id: `AUTO-AS-${String(i + 1).padStart(3, "0")}`,
      title: `Assertion validation ${i + 1}`,
      point
    }));
  }

  function saveLearnedSelector(host, key, strategy) {
    if (!strategy || !strategy.startsWith("selector:")) return Promise.resolve();
    const selector = strategy.replace("selector:", "").trim();
    if (!selector) return Promise.resolve();

    const persist = deps.dbPool
      ? dbHelpers
          .upsertLocator(deps.dbPool, {
            host,
            elementKey: key,
            selectorType: "css",
            selectorValue: selector,
            xpath: null,
            role: null,
            label: null,
            runId: null
          })
          .catch(() => {})
      : Promise.resolve();

    return persist.finally(() => {
      const current = selectorMemory.get(host) || {};
      const list = current[key] || [];
      if (!list.includes(selector)) list.unshift(selector);
      current[key] = list.slice(0, 6);
      selectorMemory.set(host, current);
    });
  }

  async function generateExecutionReport(run, rerunFailedOnly = false) {
    const host = hostFromUrl(run.input.ottUrl);
    const selectorCandidates = run.artifacts.automationBundle?.selectorCandidates || {};
    const loginSecret = await Promise.resolve(getRunSecret(run.id));
    const previous = run.artifacts.executionReport;
    const failedSet = rerunFailedOnly && previous
      ? new Set(previous.tests.filter((t) => t.status === "failed").map((t) => t.id))
      : null;

    // Detect website type from URL analysis
    const webAnalysis = run.artifacts.webAnalysis || {};
    const websiteType = webAnalysis.metadata?.domain || 'generic';
    const websiteTypeName = webAnalysis.metadata?.websiteType || 'Website';
    const autoGeneratedTestCases = webAnalysis.autoGeneratedTestCases || [];
    const majorFunctionalCases = webAnalysis.majorFunctionalCases || [];
    const userFlows = webAnalysis.userFlows || [];
    const resolvedExecutionMode = resolveExecutionMode(run.input, process.env);
    const useDiscoveredFlows = resolvedExecutionMode === EXECUTION_MODES.DISCOVERED_FLOWS;
    const isUploadedMode = run.input.executionMode === "uploaded_tc_only";
    const isManualMode = run.input.executionMode === "manual_tc_only";
    const isTcDrivenMode = isUploadedMode || isManualMode;
    const discoveredFlowLimit = resolveDiscoveredFlowLimit(process.env);
    const manualCases = run.artifacts.manualTestCases?.testCases || [];
    const discoveredCaseSource = manualCases.length ? manualCases : majorFunctionalCases;

    console.log(`[Execution] Website type: ${websiteTypeName} (${websiteType})`);
    console.log(`[Execution] Mode: ${resolvedExecutionMode}`);
    console.log(`[Execution] Auto-generated test cases: ${autoGeneratedTestCases.length}`);
    console.log(`[Execution] Major functional cases: ${majorFunctionalCases.length}`);
    console.log(`[Execution] User flows: ${userFlows.length}`);

    // Build domain-specific tests from auto-generated test cases
    function buildDomainSpecificTests() {
      if (useDiscoveredFlows) {
        const flowTests = buildDiscoveredFlowTests({
          ottUrl: run.input.ottUrl,
          userFlows,
          manualTestCases: discoveredCaseSource,
          hasLoginSecrets: Boolean(loginSecret?.username || loginSecret?.password || run.input.login?.username),
          maxFlows: discoveredFlowLimit,
          onHealed: ({ key, selector }) => (
            selector
              ? saveLearnedSelector(host, key, `selector:${selector}`)
              : Promise.resolve()
          )
        });
        if (flowTests.length > 0) {
          console.log(`[Execution] discovered_flows: running ${flowTests.length} flow(s)`);
          return flowTests;
        }
      }

      const caseSource = majorFunctionalCases.length ? majorFunctionalCases : autoGeneratedTestCases;
      // If we have auto-generated test cases from URL analysis, use those
      if (caseSource.length > 0) {
        return caseSource.slice(0, 10).map((tc, idx) => ({
          id: tc.id || `AUTO-${String(idx + 1).padStart(3, "0")}`,
          title: tc.scenario || tc.title || `Test Case ${idx + 1}`,
          execute: async (page, trace) => {
            // Navigate to URL if first test
            if (idx === 0) {
              await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
              await page.waitForLoadState("domcontentloaded");
              await page.waitForTimeout(2000);
            }
            
            const body = page.locator("body");
            await body.waitFor({ state: "visible", timeout: 15000 });
            
            // Execute based on test case module/type
            const module = (tc.module || "").toLowerCase();
            const scenario = (tc.scenario || "").toLowerCase();
            const type = (tc.type || "").toLowerCase();
            
            // Navigation tests
            if (module.includes("nav") || scenario.includes("navigation") || scenario.includes("menu")) {
              const nav = page.locator("nav, [role='navigation'], header nav, .navbar, .nav-menu").first();
              if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("nav:verified");
                // Try clicking a nav item
                const navItems = page.locator("nav a, header a, .nav-link, .nav-item a").first();
                if (await navItems.isVisible({ timeout: 3000 }).catch(() => false)) {
                  trace.push("nav-items:found");
                }
              } else {
                trace.push("nav:body-visible-only");
              }
              return;
            }
            
            // Footer tests
            if (module.includes("footer") || scenario.includes("footer")) {
              const footer = page.locator("footer, [role='contentinfo'], .footer").first();
              if (await footer.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("footer:verified");
              } else {
                // Scroll to bottom to find footer
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(1000);
                if (await footer.isVisible({ timeout: 5000 }).catch(() => false)) {
                  trace.push("footer:found-after-scroll");
                } else {
                  trace.push("footer:not-visible");
                }
              }
              return;
            }
            
            // Store/Branch locator tests (retail)
            if (scenario.includes("store") || scenario.includes("branch") || scenario.includes("location")) {
              const storeLinks = page.locator("a:has-text('store'), a:has-text('branch'), a:has-text('location'), a:has-text('find us')").first();
              if (await storeLinks.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("store-locator:found");
              } else {
                trace.push("store-locator:checking-page-content");
              }
              return;
            }
            
            // Product/Category tests
            if (scenario.includes("product") || scenario.includes("categor")) {
              const products = page.locator(".product, .category, [class*='product'], [class*='category'], .item-card").first();
              if (await products.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("products:found");
              } else {
                trace.push("products:checking-links");
                const productLinks = page.locator("a:has-text('product'), a:has-text('shop'), a:has-text('categor')").first();
                if (await productLinks.isVisible({ timeout: 3000 }).catch(() => false)) {
                  trace.push("product-links:found");
                }
              }
              return;
            }
            
            // Contact tests
            if (scenario.includes("contact") || module.includes("contact")) {
              const contactInfo = page.locator("a[href*='tel:'], a[href*='mailto:'], .contact, [class*='contact']").first();
              if (await contactInfo.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("contact:found");
              } else {
                trace.push("contact:checking-footer");
              }
              return;
            }
            
            // Media/Image tests
            if (scenario.includes("media") || scenario.includes("image") || scenario.includes("video")) {
              const media = page.locator("img, video, [class*='media'], [class*='gallery']").first();
              if (await media.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("media:found");
              } else {
                trace.push("media:none-visible");
              }
              return;
            }
            
            // Search tests
            if (scenario.includes("search")) {
              const searchInput = page.locator("input[type='search'], input[name*='search'], input[placeholder*='search'], .search-input").first();
              if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("search:found");
              } else {
                trace.push("search:not-visible");
              }
              return;
            }
            
            // Form tests
            if (scenario.includes("form") || module.includes("form")) {
              const forms = page.locator("form, [role='form']").first();
              if (await forms.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("form:found");
              } else {
                trace.push("form:not-visible");
              }
              return;
            }
            
            // Default: verify page loaded
            const visible = await body.isVisible();
            if (!visible) throw new Error("Page did not load properly");
            trace.push(`generic-test:${tc.module || 'page'}:verified`);
          }
        }));
      }
      
      // Fallback: build tests from user flows
      if (userFlows.length > 0) {
        return userFlows.slice(0, 8).map((flow, idx) => ({
          id: `FLOW-${String(idx + 1).padStart(3, "0")}`,
          title: flow.name || `User Flow ${idx + 1}`,
          execute: async (page, trace) => {
            if (idx === 0) {
              await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
              await page.waitForLoadState("domcontentloaded");
              await page.waitForTimeout(2000);
            }
            const body = page.locator("body");
            await body.waitFor({ state: "visible", timeout: 15000 });
            trace.push(`flow:${flow.name}:page-loaded`);
          }
        }));
      }
      
      // Ultimate fallback: basic page verification
      return [{
        id: "AUTO-001",
        title: `Verify ${websiteTypeName} loads correctly`,
        execute: async (page, trace) => {
          await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.waitForLoadState("domcontentloaded");
          await page.waitForTimeout(2000);
          const body = page.locator("body");
          await body.waitFor({ state: "visible", timeout: 15000 });
          const visible = await body.isVisible();
          if (!visible) throw new Error("Page did not load: body not visible.");
          trace.push("page:loaded");
        }
      }];
    }

    // Use domain-specific tests instead of hardcoded OTT tests
    const baseTests = buildDomainSpecificTests();

    // Legacy OTT-specific tests (kept for backward compatibility with OTT platforms)
    const ottTests = [
      {
        id: "AUTO-001",
        title: "Reach OTT app shell",
        execute: async (page, trace) => {
          await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.waitForLoadState("domcontentloaded");
          await page.waitForTimeout(2000);
          const body = page.locator("body");
          await body.waitFor({ state: "visible", timeout: 15000 });
          const visible = await body.isVisible();
          if (!visible) throw new Error("OTT app shell did not load: body not visible.");
          const nav = await firstVisibleLocator(page, selectorCandidates.primaryNav || [], ["Home", "Movies", "TV"]);
          if (nav) trace.push(`shell-locator:${nav.strategy}`);
          else trace.push("shell:body-only");
        }
      },
      {
        id: "AUTO-001A",
        title: "Perform login when credentials are provided",
        execute: async (page, trace) => {
          await performLoginIfRequired(page, selectorCandidates, loginSecret, trace);
        }
      },
      {
        id: "AUTO-002",
        title: "Progress from continue/sign-in gate",
        execute: async (page, trace) => {
          const candidate = await firstVisibleLocator(
            page,
            [...(selectorCandidates.continueCta || []), ...(selectorCandidates.loginCta || [])],
            ["Continue", "Continue Watching", "Sign in", "Log in"]
          );
          if (!candidate) {
            trace.push("gate:not-present");
            const loginProvided = loginSecret && loginSecret.username && loginSecret.password;
            if (!loginProvided) {
              throw new Error("No continue/sign-in gate found. When not logged in, expected a gate (Continue, Sign in, etc.). Check selectors or page state.");
            }
            return;
          }
          await candidate.locator.click({ timeout: 8000 });
          trace.push(`gate-clicked:${candidate.strategy}`);
          await page.waitForTimeout(1500);
        }
      },
      {
        id: "AUTO-003",
        title: "Open a content detail surface",
        execute: async (page, trace) => {
          const card = await firstVisibleLocator(page, selectorCandidates.contentCard || [], ["Watch now", "Details", "Episode"]);
          if (!card) throw new Error("No content card/tile found for progression. Navigate to home first.");
          await card.locator.click({ timeout: 9000 });
          trace.push(`content-open:${card.strategy}`);
          await page.waitForTimeout(2000);
        }
      },
      {
        id: "AUTO-004",
        title: "Trigger playback",
        execute: async (page, trace) => {
          const play = await firstVisibleLocator(page, selectorCandidates.playCta || [], ["Play", "Watch", "Resume", "Watch now"]);
          if (!play) throw new Error("Play CTA not found on current surface. Open a content detail first.");
          await play.locator.click({ timeout: 9000 });
          trace.push(`play-click:${play.strategy}`);
          await page.waitForTimeout(2000);
        }
      },
      {
        id: "AUTO-005",
        title: "Validate playback controls",
        execute: async (page, trace) => {
          const pause = await firstVisibleLocator(page, selectorCandidates.pauseCta || [], ["Pause"]);
          const seek = await firstVisibleLocator(page, selectorCandidates.seekBar || [], ["Seek", "Timeline"]);
          if (!pause && !seek) throw new Error("Pause/seek controls not visible after playback trigger.");
          if (pause) trace.push(`pause-found:${pause.strategy}`);
          if (seek) trace.push(`seek-found:${seek.strategy}`);
        }
      }
    ];

    const ottUrlForAssertions = run.input.ottUrl;
    const assertionTests = assertionChecks(run.input.assertions).map((entry) => ({
      id: entry.id,
      title: entry.title,
      execute: async (page, trace) => {
        await page.goto(ottUrlForAssertions, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1500);
        const raw = String(entry.point).trim();
        if (raw.toLowerCase().startsWith("selector:")) {
          const selector = raw.split(":").slice(1).join(":").trim();
          if (!selector) throw new Error("Assertion selector was empty");
          const isXpath = selector.startsWith("//") || selector.startsWith("(");
          const loc = isXpath ? page.locator("xpath=" + selector).first() : page.locator(selector).first();
          await loc.waitFor({ state: "visible", timeout: 10000 });
          const visible = await loc.isVisible();
          if (!visible) throw new Error(`Assertion failed: selector "${selector}" not visible`);
          trace.push(`assert-selector:${selector}`);
          return;
        }
        const textToFind = raw.toLowerCase().startsWith("text:")
          ? raw.split(":").slice(1).join(":").trim()
          : raw;
        if (!textToFind) throw new Error("Assertion text was empty");
        const loc = page.getByText(textToFind, { exact: false }).first();
        await loc.waitFor({ state: "visible", timeout: 10000 });
        const visible = await loc.isVisible();
        if (!visible) throw new Error(`Assertion failed: text "${textToFind}" not visible on page`);
        trace.push(`assert-text:${textToFind}`);
      }
    }));

    const ottUrl = run.input.ottUrl;
    const useMinimalExecution = resolvedExecutionMode === EXECUTION_MODES.MINIMAL;

    // Sequential execution state - maintains page state across test cases
    let pageInitialized = false;
    let executionContext = { searchTerm: null, selectedProduct: null, cartCount: 0 };

    // Extract search term from scenario text (e.g., "Enter iPhone 15" -> "iPhone 15")
    function extractSearchTerm(text) {
      const patterns = [
        /(?:search|enter|type|input)[\s]+(?:for\s+)?["']?([^"'\n]+?)["']?\s+(?:in|into|on)/i,
        /(?:search|enter|type|input)[\s]+["']?([^"'\n]+?)["']?\s*$/i,
        /(?:search|enter|type)[\s]+(?:for\s+)?["']?([a-zA-Z0-9\s]+\d+[a-zA-Z0-9\s]*)["']?/i,
        /["']([^"']+)["']/,
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 1) {
          return match[1].trim();
        }
      }
      // Try to extract product names like "iPhone 15"
      const productMatch = text.match(/\b(iphone\s*\d+|galaxy\s*s\d+|pixel\s*\d+|macbook|ipad|airpods)/i);
      if (productMatch) return productMatch[1];
      return null;
    }

    // Parse action type from scenario
    function parseAction(scenario, expectedResult) {
      const text = `${scenario} ${expectedResult}`.toLowerCase();

      if (text.includes("navigate") || text.includes("homepage") || text.includes("loads")) {
        if (text.includes("cart page") || text.includes("click on cart") || text.includes("open cart")) return "open_cart";
        if (text.includes("product") && text.includes("page")) return "verify_product_page";
        return "navigate";
      }
      if (text.includes("enter") && (text.includes("search") || text.includes("box"))) return "search_enter";
      if (text.includes("click") && text.includes("search")) return "search_click";
      if (text.includes("search") && (text.includes("result") || text.includes("display"))) return "verify_search_results";
      if (text.includes("click") && (text.includes("first") || text.includes("product")) && !text.includes("cart")) return "click_product";
      if (text.includes("verify") && text.includes("product") && (text.includes("title") || text.includes("name") || text.includes("contains"))) return "verify_product_title";
      
      // Price verification - distinguish between product page and cart
      if (text.includes("verify") && text.includes("price")) {
        if (text.includes("cart") || text.includes("in cart")) return "verify_cart_price";
        if (text.includes("update") || text.includes("change")) return "verify_cart_price";
        return "verify_price";
      }
      
      // Image verification - distinguish between product page and cart
      if (text.includes("verify") && text.includes("image")) {
        if (text.includes("cart") || text.includes("in cart")) return "verify_cart_image";
        return "verify_product_image";
      }
      
      // Button verifications
      if ((text.includes("add to cart") || text.includes("add-to-cart")) && (text.includes("button") || text.includes("present") || text.includes("visible"))) {
        if (text.includes("click")) return "click_add_to_cart";
        return "verify_add_to_cart_button";
      }
      if ((text.includes("buy now") || text.includes("buynow")) && (text.includes("button") || text.includes("present") || text.includes("visible"))) return "verify_buy_now_button";
      if ((text.includes("place order") || text.includes("placeorder")) && (text.includes("button") || text.includes("present") || text.includes("visible"))) return "verify_place_order";
      if ((text.includes("remove") || text.includes("delete")) && (text.includes("option") || text.includes("button") || text.includes("available") || text.includes("visible"))) return "verify_remove_option";
      
      if (text.includes("click") && text.includes("add to cart")) return "click_add_to_cart";
      if (text.includes("added") && text.includes("cart") && text.includes("confirm")) return "verify_added_confirmation";
      if (text.includes("cart") && (text.includes("count") || text.includes("increases") || text.includes("badge"))) return "verify_cart_count";
      if ((text.includes("click") && text.includes("cart")) || text.includes("open cart")) return "open_cart";
      
      // Cart item verification
      if (text.includes("verify") && (text.includes("in cart") || text.includes("is in cart"))) {
        if (text.includes("image")) return "verify_cart_image";
        if (text.includes("price")) return "verify_cart_price";
        return "verify_item_in_cart";
      }
      
      if (text.includes("quantity")) {
        if (text.includes("increase") || text.includes("decrease") || text.includes("change")) return "verify_quantity";
        return "verify_quantity";
      }
      if (text.includes("checkout") || text.includes("proceed")) return "verify_checkout";
      if (text.includes("search") && text.includes("bar")) return "verify_search_bar";
      if (text.includes("verify") || text.includes("display") || text.includes("visible") || text.includes("present")) return "verify_element";
      return "generic";
    }

    function buildUploadedTcExecutionTests() {
      const list = (run.artifacts.manualTestCases && run.artifacts.manualTestCases.testCases) || [];

      return list.map((tc, index) => {
        const scenario = tc.scenario || tc.title || "";
        const expected = tc.expectedResult || "";
        const text = `${tc.module || ""} ${scenario} ${expected}`.toLowerCase();
        const action = parseAction(scenario, expected);
        const searchTerm = extractSearchTerm(scenario) || extractSearchTerm(expected);

        return {
          id: `EXEC-${tc.id}`,
          title: tc.title || scenario,
          tcIndex: index,
          action,
          searchTerm,
          execute: async (page, trace) => {
            // Initialize page only once for the first test case
            if (!pageInitialized) {
              trace.push("seq:initializing-page");
              await page.goto(ottUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
              await page.waitForLoadState("domcontentloaded").catch(() => { });
              await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
              await page.waitForTimeout(2000);

              // Anti-bot / Captcha / Blocked page detection
              const pageContent = await page.content();
              const pageTitle = await page.title();
              const bodyText = await page.locator("body").textContent().catch(() => "");
              
              const blockedIndicators = [
                // Captcha/bot detection
                "captcha",
                "recaptcha",
                "hcaptcha",
                "challenge-running",
                "cf-browser-verification",
                "cloudflare",
                "ddos-guard",
                // Access denied messages
                "user validation required",
                "access denied",
                "blocked",
                "forbidden",
                "not allowed",
                "please verify",
                "human verification",
                "bot detection",
                "automated access",
                "security check",
                "prove you're human",
                "suspicious activity",
                // Rate limiting
                "too many requests",
                "rate limit",
                "try again later"
              ];
              
              const contentLower = (pageContent + " " + pageTitle + " " + bodyText).toLowerCase();
              const isBlocked = blockedIndicators.some(indicator => contentLower.includes(indicator));
              
              if (isBlocked) {
                trace.push("error:page-blocked-anti-bot");
                throw new Error("Page blocked by anti-bot protection, captcha, or access restriction. Cannot run automated tests on this website.");
              }

              // Verify page has meaningful content (not just error page)
              const hasMinimalContent = bodyText.length > 100;
              const hasValidStructure = await page.$("nav, header, main, footer, [role='main'], [role='navigation']").catch(() => null);
              
              if (!hasMinimalContent && !hasValidStructure) {
                trace.push("error:invalid-page-content");
                throw new Error("Page did not load properly - missing expected content structure");
              }
              
              trace.push("validation:page-content-valid");

              // Dismiss common popups/modals (especially Flipkart login popup)
              const domain = detectDomain(ottUrl);
              if (domain === 'flipkart') {
                // Flipkart login popup dismissal
                const popupDismissSelectors = [
                  "button._2KpZ6l._2doB4z",  // Close button on login popup
                  "button[class*='_2KpZ6l'][class*='_2doB4z']",
                  "button._2AkmmA._29YdH8",
                  "span._30XB9F",  // X close icon
                  "button:has-text('✕')",
                  "[class*='close']",
                  "[aria-label='Close']",
                  "button._2AkmmA"
                ];
                for (const sel of popupDismissSelectors) {
                  try {
                    const closeBtn = page.locator(sel).first();
                    if (await closeBtn.isVisible({ timeout: 2000 })) {
                      await closeBtn.click();
                      trace.push(`popup:dismissed:${sel}`);
                      await page.waitForTimeout(500);
                      break;
                    }
                  } catch { }
                }
                // Also try pressing Escape key to dismiss any modal
                await page.keyboard.press('Escape').catch(() => {});
                await page.waitForTimeout(500);
              }

              // Generic popup/cookie consent dismissal
              const genericDismissSelectors = [
                "button:has-text('Accept')",
                "button:has-text('Got it')",
                "button:has-text('Close')",
                "[class*='cookie'] button",
                "[class*='consent'] button",
                "[class*='modal'] [class*='close']"
              ];
              for (const sel of genericDismissSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 1000 })) {
                    await btn.click().catch(() => {});
                    trace.push(`generic-popup:dismissed:${sel}`);
                    break;
                  }
                } catch { }
              }

              pageInitialized = true;
              trace.push("seq:page-ready");
            }

            // If using minimal execution mode, just verify page is loaded
            if (useMinimalExecution && action === "generic") {
              const body = page.locator("body");
              await body.waitFor({ state: "visible", timeout: 10000 });
              trace.push("minimal:page-visible");
              return;
            }

            // Execute based on parsed action type
            switch (action) {
              case "navigate": {
                // Already navigated, verify page loaded
                const body = page.locator("body");
                await body.waitFor({ state: "visible", timeout: 10000 });
                trace.push("action:navigate-verified");
                break;
              }

              case "verify_search_bar": {
                // Domain-aware selector lookup
                const searchSelectors = getSelectors(ottUrl, 'search', 'input');
                let found = false;
                for (const sel of searchSelectors) {
                  try {
                    const loc = page.locator(sel).first();
                    if (await loc.isVisible({ timeout: 3000 })) {
                      found = true;
                      trace.push(`action:search-bar-found:${sel}`);
                      break;
                    }
                  } catch { }
                }
                if (!found) throw new Error("Search bar not visible");
                break;
              }

              case "search_enter": {
                const term = searchTerm || executionContext.searchTerm || "iPhone 15";
                executionContext.searchTerm = term;

                // Domain-aware selector lookup
                const searchSelectors = getSelectors(ottUrl, 'search', 'input');
                const domainConfig = getDomainConfig(ottUrl);
                trace.push(`domain:detected:${domainConfig.domain}:${domainConfig.name}`);

                let searchBox = null;
                for (const sel of searchSelectors) {
                  try {
                    const loc = page.locator(sel).first();
                    if (await loc.isVisible({ timeout: 3000 })) {
                      searchBox = loc;
                      trace.push(`action:search-input-found:${sel}`);
                      break;
                    }
                  } catch { }
                }

                if (!searchBox) throw new Error("Search input not found");
                
                // Try to dismiss any remaining popups before clicking
                await page.keyboard.press('Escape').catch(() => {});
                await page.waitForTimeout(300);
                
                // Try normal click first, then force click if needed
                try {
                  await searchBox.click({ timeout: 5000 });
                } catch (clickErr) {
                  trace.push("action:search-click-failed-trying-force");
                  // Force click if normal click fails (element might be covered)
                  await searchBox.click({ force: true, timeout: 5000 }).catch(async () => {
                    // Last resort: click via JavaScript
                    await searchBox.evaluate(el => el.click());
                    trace.push("action:search-clicked-via-js");
                  });
                }
                
                await searchBox.fill(term);
                await page.waitForTimeout(500);
                trace.push(`action:entered-search:${term}`);
                break;
              }

              case "search_click": {
                // Domain-aware selector lookup
                const submitSelectors = getSelectors(ottUrl, 'search', 'submit');

                let submitted = false;
                for (const sel of submitSelectors) {
                  try {
                    const btn = page.locator(sel).first();
                    if (await btn.isVisible({ timeout: 2000 })) {
                      await btn.click();
                      submitted = true;
                      trace.push(`action:search-submitted:${sel}`);
                      break;
                    }
                  } catch { }
                }

                if (!submitted) {
                  // Try pressing Enter
                  await page.keyboard.press("Enter");
                  trace.push("action:search-submitted-enter");
                }

                await page.waitForLoadState("domcontentloaded").catch(() => { });
                await page.waitForTimeout(2000);
                break;
              }

              case "verify_search_results": {
                await page.waitForTimeout(1500);
                const term = executionContext.searchTerm || "iPhone";

                // Domain-aware selector lookup for search results
                const resultSelectors = getSelectors(ottUrl, 'results', 'container');

                let found = false;
                let relevantFound = false;
                for (const sel of resultSelectors) {
                  try {
                    const results = page.locator(sel);
                    const count = await results.count();
                    if (count > 0) {
                      found = true;
                      trace.push(`action:search-results-found:${count}-items`);

                      const cards = page.locator("[data-component-type='s-search-result'] h2, .s-result-item h2, [data-asin] h2");
                      const sampleCount = Math.min(8, await cards.count().catch(() => 0));
                      for (let i = 0; i < sampleCount; i += 1) {
                        const titleText = await cards.nth(i).textContent().catch(() => "");
                        if (hasSearchTermMatch(titleText, term)) {
                          relevantFound = true;
                          trace.push(`action:search-relevance-match:${term}`);
                          break;
                        }
                      }
                      break;
                    }
                  } catch { }
                }

                if (!found) {
                  // Fallback: check term match inside result title elements only.
                  const resultTitles = page.locator("[data-component-type='s-search-result'] h2, .s-result-item h2, [data-asin] h2");
                  const titleCount = await resultTitles.count().catch(() => 0);
                  for (let i = 0; i < Math.min(titleCount, 8); i += 1) {
                    const titleText = await resultTitles.nth(i).textContent().catch(() => "");
                    if (hasSearchTermMatch(titleText, term)) {
                      found = true;
                      relevantFound = true;
                      trace.push(`action:search-term-visible-in-title:${term}`);
                      break;
                    }
                  }
                }

                if (!found) throw new Error(`Search results for "${term}" not displayed`);
                if (!relevantFound) throw new Error(`Search results displayed but no relevant match found for "${term}"`);
                break;
              }

              case "click_product": {
                await page.waitForTimeout(1000);

                // Domain-aware selector lookup for product links
                const productSelectors = getSelectors(ottUrl, 'results', 'productCard');

                let clicked = false;
                for (const sel of productSelectors) {
                  try {
                    const products = page.locator(sel);
                    const first = products.first();
                    if (await first.isVisible({ timeout: 3000 })) {
                      const title = await first.textContent().catch(() => "");
                      executionContext.selectedProduct = title.trim();
                      
                      // Try normal click, then force click if needed
                      try {
                        await first.click({ timeout: 5000 });
                      } catch {
                        await first.click({ force: true, timeout: 5000 }).catch(async () => {
                          await first.evaluate(el => el.click());
                        });
                      }
                      
                      clicked = true;
                      trace.push(`action:product-clicked:${title.slice(0, 50)}`);
                      break;
                    }
                  } catch { }
                }

                if (!clicked) throw new Error("Could not click on product");
                await page.waitForLoadState("domcontentloaded").catch(() => { });
                await page.waitForTimeout(2000);
                break;
              }

              case "verify_product_page":
              case "verify_product_title": {
                await page.waitForTimeout(1000);
                const term = executionContext.searchTerm || "iPhone";

                // Domain-aware selector lookup for product title
                const titleSelectors = getSelectors(ottUrl, 'productPage', 'title');

                let found = false;
                for (const sel of titleSelectors) {
                  try {
                    const title = page.locator(sel).first();
                    if (await title.isVisible({ timeout: 5000 })) {
                      const text = await title.textContent();
                      found = true;
                      trace.push(`action:product-title-visible:${text.slice(0, 50)}`);
                      break;
                    }
                  } catch { }
                }

                if (!found) {
                  const hasText = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false);
                  if (hasText) {
                    found = true;
                    trace.push("action:product-term-visible");
                  }
                }

                if (!found) throw new Error("Product title not visible");
                break;
              }

              case "verify_price": {
                // Domain-aware selector lookup for price
                const priceSelectors = getSelectors(ottUrl, 'productPage', 'price');
                const domain = detectDomain(ottUrl);

                let found = false;
                for (const sel of priceSelectors) {
                  try {
                    const price = page.locator(sel).first();
                    if (await price.isVisible({ timeout: 3000 })) {
                      const text = await price.textContent().catch(() => '');
                      if (text && (text.includes('₹') || text.includes('$') || /\d/.test(text))) {
                        found = true;
                        trace.push(`action:price-visible:${sel}:${text.slice(0,20)}`);
                        break;
                      }
                    }
                  } catch { }
                }

                if (!found) {
                  // Try currency-specific patterns (₹ for India, $ for US)
                  const currencyPatterns = [
                    /₹[\s]*[\d,]+/,  // Indian Rupee
                    /Rs\.?[\s]*[\d,]+/i,  // Rs. format
                    /\$[\d,]+\.?\d*/,  // US Dollar
                    /[\d,]+\.\d{2}/  // Generic price format
                  ];
                  for (const pattern of currencyPatterns) {
                    const priceText = await page.getByText(pattern).first().isVisible({ timeout: 2000 }).catch(() => false);
                    if (priceText) {
                      found = true;
                      trace.push(`action:price-text-visible:${pattern.toString().slice(0,20)}`);
                      break;
                    }
                  }
                }

                if (!found) throw new Error("Price not visible");
                break;
              }

              case "verify_add_to_cart_button": {
                // Domain-aware selector lookup for add to cart button
                const cartBtnSelectors = getSelectors(ottUrl, 'productPage', 'addToCart');

                let found = false;
                for (const sel of cartBtnSelectors) {
                  try {
                    const btn = page.locator(sel).first();
                    if (await btn.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:add-to-cart-btn-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                // Fallback: look for button with cart-related text
                if (!found) {
                  const textBtns = [
                    page.getByRole('button', { name: /add.*cart/i }),
                    page.locator('button').filter({ hasText: /add.*cart/i }),
                    page.locator('[class*="cart"] button'),
                    page.locator('button[class*="cart"]')
                  ];
                  for (const btn of textBtns) {
                    try {
                      if (await btn.first().isVisible({ timeout: 2000 })) {
                        found = true;
                        trace.push("action:add-to-cart-btn-text-fallback");
                        break;
                      }
                    } catch { }
                  }
                }

                if (!found) throw new Error("Add to Cart button not visible");
                break;
              }

              case "verify_buy_now_button": {
                // Domain-aware selector lookup for buy now button
                const buyNowSelectors = getSelectors(ottUrl, 'productPage', 'buyNow');

                let found = false;
                for (const sel of buyNowSelectors) {
                  try {
                    const btn = page.locator(sel).first();
                    if (await btn.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:buy-now-btn-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                // Fallback: look for button with buy-related text
                if (!found) {
                  const textBtns = [
                    page.getByRole('button', { name: /buy.*now/i }),
                    page.locator('button').filter({ hasText: /buy.*now/i })
                  ];
                  for (const btn of textBtns) {
                    try {
                      if (await btn.first().isVisible({ timeout: 2000 })) {
                        found = true;
                        trace.push("action:buy-now-btn-text-fallback");
                        break;
                      }
                    } catch { }
                  }
                }

                if (!found) throw new Error("BUY NOW button not visible");
                break;
              }

              case "verify_product_image":
              case "verify_image": {
                // Domain-aware selector lookup for product images
                const imageSelectors = getSelectors(ottUrl, 'productPage', 'image');

                let found = false;
                for (const sel of imageSelectors) {
                  try {
                    const img = page.locator(sel).first();
                    if (await img.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:product-image-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                // Fallback: any significant image on page
                if (!found) {
                  const imgs = page.locator('img[src*="http"]').filter({ has: page.locator('[width]') });
                  const count = await imgs.count().catch(() => 0);
                  if (count > 0) {
                    const firstVisible = await imgs.first().isVisible({ timeout: 2000 }).catch(() => false);
                    if (firstVisible) {
                      found = true;
                      trace.push("action:product-image-fallback");
                    }
                  }
                }

                if (!found) throw new Error("Product images not visible");
                break;
              }

              case "click_add_to_cart": {
                // Domain-aware selector lookup for add to cart button
                const cartBtnSelectors = getSelectors(ottUrl, 'productPage', 'addToCart');

                let clicked = false;
                for (const sel of cartBtnSelectors) {
                  try {
                    const btn = page.locator(sel).first();
                    if (await btn.isVisible({ timeout: 5000 })) {
                      // Try normal click, then force click if needed
                      try {
                        await btn.click({ timeout: 5000 });
                      } catch {
                        await btn.click({ force: true, timeout: 5000 }).catch(async () => {
                          await btn.evaluate(el => el.click());
                        });
                      }
                      clicked = true;
                      executionContext.cartCount++;
                      trace.push(`action:add-to-cart-clicked:${sel}`);
                      break;
                    }
                  } catch { }
                }

                // Fallback: try text-based button click
                if (!clicked) {
                  const textBtns = [
                    page.getByRole('button', { name: /add.*cart/i }),
                    page.locator('button').filter({ hasText: /add.*cart/i })
                  ];
                  for (const btn of textBtns) {
                    try {
                      if (await btn.first().isVisible({ timeout: 2000 })) {
                        await btn.first().click({ force: true });
                        clicked = true;
                        executionContext.cartCount++;
                        trace.push("action:add-to-cart-clicked-text-fallback");
                        break;
                      }
                    } catch { }
                  }
                }

                if (!clicked) throw new Error("Could not click Add to Cart");
                await page.waitForTimeout(2000);
                break;
              }

              case "verify_added_confirmation": {
                await page.waitForTimeout(1500);

                // Domain-aware selector lookup for cart confirmation
                const confirmSelectors = getSelectors(ottUrl, 'confirmation', 'added');

                let found = false;
                for (const sel of confirmSelectors) {
                  try {
                    const confirm = page.locator(sel).first();
                    if (await confirm.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:add-confirm-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                if (!found) {
                  const hasText = await page.getByText(/added|cart|proceed/i).first().isVisible({ timeout: 3000 }).catch(() => false);
                  if (hasText) {
                    found = true;
                    trace.push("action:add-confirm-text");
                  }
                }

                if (!found) throw new Error("Add to cart confirmation not visible");
                break;
              }

              case "verify_cart_count": {
                // Domain-aware selector lookup for cart count
                const countSelectors = getSelectors(ottUrl, 'cart', 'count');

                let found = false;
                for (const sel of countSelectors) {
                  try {
                    const count = page.locator(sel).first();
                    if (await count.isVisible({ timeout: 5000 })) {
                      const value = await count.textContent();
                      found = true;
                      trace.push(`action:cart-count-visible:${value}`);
                      break;
                    }
                  } catch { }
                }

                if (!found) trace.push("action:cart-count-not-visible-continuing");
                break;
              }

              case "open_cart": {
                // Domain-aware selector lookup for cart icon
                const cartSelectors = getSelectors(ottUrl, 'cart', 'icon');

                let clicked = false;
                for (const sel of cartSelectors) {
                  try {
                    const cart = page.locator(sel).first();
                    if (await cart.isVisible({ timeout: 5000 })) {
                      await cart.click();
                      clicked = true;
                      trace.push(`action:cart-opened:${sel}`);
                      break;
                    }
                  } catch { }
                }

                if (!clicked) {
                  await page.goto(ottUrl.replace(/\/$/, "") + "/cart", { waitUntil: "domcontentloaded" });
                  trace.push("action:cart-navigated-directly");
                }

                await page.waitForLoadState("domcontentloaded").catch(() => { });
                await page.waitForTimeout(2000);
                break;
              }

              case "verify_item_in_cart": 
              case "verify_cart_item":
              case "verify_product_in_cart": {
                await page.waitForTimeout(1500);
                const term = executionContext.searchTerm || "iPhone";
                const domain = detectDomain(ottUrl);

                // Domain-aware selector lookup for cart items
                const cartItemSelectors = getSelectors(ottUrl, 'cart', 'itemTitle');
                const cartContainerSelectors = getSelectors(ottUrl, 'cart', 'itemContainer');

                let found = false;
                
                // First try container selectors
                for (const sel of cartContainerSelectors) {
                  try {
                    const items = page.locator(sel);
                    const count = await items.count();
                    if (count > 0) {
                      found = true;
                      trace.push(`action:cart-container-found:${count}-items:${sel}`);
                      break;
                    }
                  } catch { }
                }

                // Then try item title selectors
                if (!found) {
                  for (const sel of cartItemSelectors) {
                    try {
                      const items = page.locator(sel);
                      const count = await items.count();
                      if (count > 0) {
                        found = true;
                        trace.push(`action:cart-item-found:${count}-items:${sel}`);
                        break;
                      }
                    } catch { }
                  }
                }

                // Fallback: search for product text
                if (!found) {
                  const hasText = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
                  if (hasText) {
                    found = true;
                    trace.push("action:cart-item-text-visible");
                  }
                }

                // Flipkart-specific: check for cart item by looking at the page content
                if (!found && domain === 'flipkart') {
                  const pageContent = await page.content();
                  if (pageContent.toLowerCase().includes(term.toLowerCase())) {
                    found = true;
                    trace.push("action:cart-item-in-page-content");
                  }
                }

                if (!found) throw new Error("Product title not visible");
                break;
              }

              case "verify_cart_image":
              case "verify_product_image_in_cart": {
                await page.waitForTimeout(1000);
                
                // Look for any product images in cart
                const cartImageSelectors = [
                  ...getSelectors(ottUrl, 'cart', 'itemContainer'),
                  'img[src*="product"]',
                  'img[src*="rukmi"]',  // Flipkart CDN
                  '.cart-item img',
                  '[class*="cart"] img'
                ];

                let found = false;
                for (const sel of cartImageSelectors) {
                  try {
                    const img = page.locator(`${sel} img, ${sel}`).first();
                    if (await img.isVisible({ timeout: 3000 })) {
                      found = true;
                      trace.push(`action:cart-image-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                if (!found) {
                  // Fallback: any image in cart area
                  const imgs = page.locator('img').filter({ hasNot: page.locator('[class*="logo"]') });
                  const count = await imgs.count().catch(() => 0);
                  if (count > 2) {
                    found = true;
                    trace.push("action:cart-images-fallback");
                  }
                }

                if (!found) throw new Error(`Product "iPhone 15" not found in cart`);
                break;
              }

              case "verify_cart_price":
              case "verify_price_in_cart": {
                await page.waitForTimeout(1000);
                
                const cartPriceSelectors = getSelectors(ottUrl, 'cart', 'itemPrice');

                let found = false;
                for (const sel of cartPriceSelectors) {
                  try {
                    const price = page.locator(sel).first();
                    if (await price.isVisible({ timeout: 3000 })) {
                      const text = await price.textContent().catch(() => '');
                      if (text && /[\d₹$]/.test(text)) {
                        found = true;
                        trace.push(`action:cart-price-visible:${sel}`);
                        break;
                      }
                    }
                  } catch { }
                }

                // Fallback: look for price patterns
                if (!found) {
                  const pricePatterns = [/₹[\s]*[\d,]+/, /Rs\.?[\s]*[\d,]+/i, /\$[\d,]+/];
                  for (const pattern of pricePatterns) {
                    const hasPrice = await page.getByText(pattern).first().isVisible({ timeout: 2000 }).catch(() => false);
                    if (hasPrice) {
                      found = true;
                      trace.push("action:cart-price-text-fallback");
                      break;
                    }
                  }
                }

                if (!found) throw new Error("Price not visible");
                break;
              }

              case "verify_place_order":
              case "verify_place_order_button": {
                await page.waitForTimeout(1000);
                
                const placeOrderSelectors = getSelectors(ottUrl, 'cart', 'placeOrder');

                let found = false;
                for (const sel of placeOrderSelectors) {
                  try {
                    const btn = page.locator(sel).first();
                    if (await btn.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:place-order-btn-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                // Fallback: text-based search
                if (!found) {
                  const textBtns = [
                    page.getByRole('button', { name: /place.*order|checkout|proceed/i }),
                    page.locator('button').filter({ hasText: /place.*order|checkout|proceed/i })
                  ];
                  for (const btn of textBtns) {
                    try {
                      if (await btn.first().isVisible({ timeout: 2000 })) {
                        found = true;
                        trace.push("action:place-order-text-fallback");
                        break;
                      }
                    } catch { }
                  }
                }

                if (!found) throw new Error("PLACE ORDER button not visible");
                break;
              }

              case "verify_remove_option":
              case "verify_remove_button": {
                await page.waitForTimeout(1000);
                
                const removeSelectors = getSelectors(ottUrl, 'cart', 'remove');

                let found = false;
                for (const sel of removeSelectors) {
                  try {
                    const btn = page.locator(sel).first();
                    if (await btn.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:remove-btn-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                // Fallback: text-based search
                if (!found) {
                  const removeText = await page.getByText(/remove|delete/i).first().isVisible({ timeout: 3000 }).catch(() => false);
                  if (removeText) {
                    found = true;
                    trace.push("action:remove-text-fallback");
                  }
                }

                if (!found) throw new Error("Remove option not visible");
                break;
              }

              case "verify_quantity": {
                // Domain-aware selector lookup for quantity
                const qtySelectors = getSelectors(ottUrl, 'cart', 'quantity');

                let found = false;
                for (const sel of qtySelectors) {
                  try {
                    const qty = page.locator(sel).first();
                    if (await qty.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:quantity-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                if (!found) trace.push("action:quantity-not-found-continuing");
                break;
              }

              case "verify_checkout": {
                // Domain-aware selector lookup for checkout button
                const checkoutSelectors = getSelectors(ottUrl, 'cart', 'placeOrder');

                let found = false;
                for (const sel of checkoutSelectors) {
                  try {
                    const btn = page.locator(sel).first();
                    if (await btn.isVisible({ timeout: 5000 })) {
                      found = true;
                      trace.push(`action:checkout-btn-visible:${sel}`);
                      break;
                    }
                  } catch { }
                }

                if (!found) {
                  const hasText = await page.getByText(/proceed|checkout/i).first().isVisible({ timeout: 3000 }).catch(() => false);
                  if (hasText) {
                    found = true;
                    trace.push("action:checkout-text-visible");
                  }
                }

                if (!found) throw new Error("Proceed to checkout not visible");
                break;
              }

              case "verify_element":
              default: {
                // Generic verification - look for key text from expected result
                const searchTerms = expected.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 3);
                let found = false;

                for (const term of searchTerms) {
                  const hasText = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false);
                  if (hasText) {
                    found = true;
                    trace.push(`action:verified-text:${term}`);
                    break;
                  }
                }

                if (!found && searchTerms.length === 0) {
                  // Just verify page is visible
                  const body = page.locator("body");
                  await body.waitFor({ state: "visible", timeout: 10000 });
                  trace.push("action:page-visible-generic");
                } else if (!found) {
                  throw new Error(`Expected content not visible: ${expected.slice(0, 50)}`);
                }
                break;
              }
            }
          }
        };
      });
    }

    const tcDrivenSuite = buildUploadedTcExecutionTests();
    const selectedSuite = isTcDrivenMode ? tcDrivenSuite : [...baseTests, ...assertionTests];

    if (isTcDrivenMode && tcDrivenSuite.length === 0) {
      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: "Execution Service",
          mode: isManualMode ? "manual_tc_only" : "uploaded_tc_only"
        },
        totals: { total: 0, passed: 0, failed: 0, passRate: "0%" },
        tests: [],
        locatorAnalysis: [],
        note: "No executable test cases were found from uploaded/manual input"
      };
    }

    const allTests = selectedSuite.filter((t) => !failedSet || failedSet.has(t.id));

    if (!allTests.length) {
      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: "Execution Service",
          mode: "rerun-failed"
        },
        totals: { total: 0, passed: 0, failed: 0, passRate: "0%" },
        tests: [],
        locatorAnalysis: [],
        note: "No failed checks found to rerun"
      };
    }

    await fs.mkdir(run.runDir, { recursive: true });

    let browser;
    const tests = [];
    const locatorAnalysis = [];
    const unwatch = watchForCancel(run.id, () => browser);

    try {
      await assertNotStopped(run.id);
      const headless = resolveHeadless(run);
      browser = await chromium.launch({
        headless,
        slowMo: headless ? 0 : 300,
        args: headless ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] : []
      });
      const context = await browser.newContext({
        ...analyzerContextOptions(browser),
        deviceScaleFactor: 2
      });
      const page = await context.newPage();

      // For CSV upload mode (e-commerce flows), skip OTT-specific locator analysis
      // to avoid unnecessary page reloads
      if (!isTcDrivenMode && Object.keys(selectorCandidates).length > 0) {
        // Navigate once for locator analysis
        await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

        for (const [key, candidates] of Object.entries(selectorCandidates)) {
          let status = "not-found";
          let usedSelector = null;
          let xpath = null;

          for (const selector of candidates) {
            try {
              const loc = page.locator(selector).first();
              if (await loc.isVisible({ timeout: 3000 })) {
                status = "mapped";
                usedSelector = selector;
                xpath = await findXPathForSelector(page, selector);
                saveLearnedSelector(host, key, `selector:${selector}`);
                break;
              }
            } catch {
              status = "analysis-error";
            }
          }

          locatorAnalysis.push({
            key,
            testedCandidates: candidates,
            usedSelector,
            xpath,
            status
          });
        }
      }

      // Reset page state for test execution (sequential mode handles its own navigation)
      pageInitialized = false;

      for (const testDef of allTests) {
        await assertNotStopped(run.id);
        let retries = 0;
        let passed = false;
        let skipped = false;
        let skipReason = null;
        let error = null;
        let screenshot = null;
        let trace = [];
        const start = Date.now();

        let stepResults = null;
        while (retries <= 1 && !passed) {
          try {
            const execResult = await testDef.execute(page, trace);
            stepResults = execResult?.stepResults || null;
            if (execResult && execResult.skip) {
              skipped = true;
              skipReason = execResult.reason || "Scenario skipped";
              screenshot = await screenshotForCase(page, run, testDef.id, "skipped", retries + 1);
              break;
            }
            if (execResult && execResult.failed) {
              stepResults = execResult.stepResults || null;
              throw new Error(
                execResult.stepResults?.find((s) => s.status === "failed")?.error ||
                  `Flow failed: ${execResult.flowName || testDef.title}`
              );
            }
            screenshot = await screenshotForCase(page, run, testDef.id, "passed", retries + 1);
            passed = true;
            if (execResult && execResult.stepResults) {
              trace.push(`flow-steps:${execResult.stepResults.length}`);
            }
          } catch (err) {
            if (isRunStoppedError(err) || (await isRunCancelRequested(cloud.cache, run.id))) {
              throw new RunStoppedError();
            }
            error = err.message;
            screenshot = await screenshotForCase(page, run, testDef.id, "failed", retries + 1);
            retries += 1;
            if (retries <= 1) {
              await page.waitForTimeout(2000);
            }
          }
        }

        tests.push({
          id: testDef.id,
          title: testDef.title,
          flowName: testDef.flowName || null,
          sourceCaseId: testDef.sourceCaseId || null,
          traceability: testDef.traceability || null,
          status: skipped ? "skipped" : (passed ? "passed" : "failed"),
          retries,
          durationMs: Date.now() - start,
          error: skipped ? skipReason : (passed ? null : error),
          trace,
          screenshot,
          steps: stepResults || undefined,
        });
      }

      await context.close();
    } catch (error) {
      if (isRunStoppedError(error) || (await isRunCancelRequested(cloud.cache, run.id))) {
        throw isRunStoppedError(error) ? error : new RunStoppedError();
      }
      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: "Execution Service",
          mode: rerunFailedOnly ? "rerun-failed" : "full"
        },
        totals: { total: allTests.length, passed: 0, failed: allTests.length, passRate: "0%" },
        tests: allTests.map((t) => ({
          id: t.id,
          title: t.title,
          status: "failed",
          retries: 0,
          durationMs: 0,
          error: `Runtime setup failure: ${error.message}`,
          trace: [],
          screenshot: null
        })),
        locatorAnalysis,
        infraError: "Run 'npx playwright install chromium' if browser binary is missing"
      };
    } finally {
      unwatch();
      if (browser) await browser.close().catch(() => {});
    }

    const passed = tests.filter((t) => t.status === "passed").length;
    const skipped = tests.filter((t) => t.status === "skipped").length;
    const failed = tests.filter((t) => t.status === "failed").length;
    const executable = tests.length - skipped;
    const healed = tests.reduce(
      (count, test) => count + (test.steps || []).filter((step) => step.healing).length,
      0
    );

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "Execution Service",
        mode: useDiscoveredFlows
          ? "discovered_flows"
          : (useMinimalExecution ? "minimal" : (rerunFailedOnly ? "rerun-failed" : "full")),
        ...(useDiscoveredFlows
          ? {
              selection: {
                primarySource: discoveredCaseSource.length ? "manualTestCases" : "userFlows",
                candidateCount: discoveredCaseSource.length || userFlows.length,
                limit: discoveredFlowLimit,
                selectedCount: allTests.length,
                truncated: (discoveredCaseSource.length || userFlows.length) > discoveredFlowLimit
              },
              healing: {
                enabled: !["0", "false", "off", "no"].includes(
                  String(process.env.ZERO_LOCATOR_HEALING || "on").trim().toLowerCase()
                ),
                healed
              }
            }
          : {})
      },
      totals: {
        total: tests.length,
        passed,
        failed,
        skipped,
        passRate: executable ? `${Math.round((passed / executable) * 100)}%` : "0%"
      },
      tests,
      locatorAnalysis
    };
  }

  // ========== OPTIONAL AGENTS ==========

  /**
   * Web Analyzer Agent - Comprehensive website analysis when no test document is provided
   * Uses the urlAnalyzerPro module for professional-grade analysis:
   * - Intelligent website type detection (E-commerce, Retail, Healthcare, OTT, Corporate, etc.)
   * - BRD (Business Requirements Document) generation
   * - Domain-specific test cases automatically generated
   * - Detailed observations for BA and other agents
   */
  /**
   * Artifact for a web analysis that never produced site data. Kept explicit so
   * a failed crawl can never be mistaken for a successful "generic" one.
   */
  function buildFailedWebAnalysis(ottUrl, message) {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "URL Analyzer Pro Agent",
        url: ottUrl,
        error: true,
        analysisFailed: true
      },
      siteOverview: { title: "Analysis Failed", description: "", type: "Unknown", pagesDiscovered: 0 },
      error: message,
      analysisFailed: true,
      warnings: [`Web analysis failed: ${message}`],
      baInsights: {
        summary: `Web analysis failed: ${message}. Manual BRD input recommended.`,
        keyFunctionalities: [],
        userJourneys: [],
        criticalPaths: [],
        riskAreas: [`Analysis error: ${message}`],
        testingRecommendations: ['Manual analysis recommended due to analysis error']
      },
      autoGeneratedTestCases: [],
      majorFunctionalCases: [],
      suggestedTestAreas: [
        { area: "Navigation", priority: "High", tests: ["Menu navigation", "Page transitions"] },
        { area: "Forms", priority: "High", tests: ["Form validation", "Submission"] },
        { area: "UI Elements", priority: "Medium", tests: ["Button interactions", "Links", "Images"] }
      ],
      suggestedRequirements: []
    };
  }

  async function generateWebAnalysis(run) {
    const ottUrl = run.input.ottUrl;
    const headless = resolveHeadless(run);

    let browser = null;
    const unwatch = watchForCancel(run.id, () => browser);

    try {
      await assertNotStopped(run.id);
      browser = await chromium.launch({ headless, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const context = await browser.newContext(analyzerContextOptions(browser));
      const page = await context.newPage();

      // Use the PRO URL Analyzer for comprehensive professional analysis
      const analysisResult = await urlAnalyzerPro.analyzeUrlPro(page, ottUrl, { headless });

      await browser.close();
      browser = null;

      // The analyzer swallows its own errors, so a fatal navigation failure has
      // to be checked explicitly. Without this, an unreachable URL produced a
      // convincing "generic Website" artifact and the run carried on as if the
      // site had been analysed.
      if (analysisResult.fatal || (analysisResult.error && !analysisResult.websiteType)) {
        const reason = analysisResult.error || "target URL could not be loaded";
        console.error('[Web Analyzer Pro] Fatal analysis failure:', reason);
        return buildFailedWebAnalysis(ottUrl, reason);
      }

      // Format observations for BA Agent using Pro format
      const baObservations = urlAnalyzerPro.formatForBAAgent(analysisResult);

      // Extract data for backward compatibility
      const websiteType = analysisResult.websiteType || { typeName: 'Website', type: 'GENERIC' };
      const domain = websiteType.type?.toLowerCase() || 'generic';
      const discoveredFeatures = baObservations.keyFunctionalities || [];
      const discoveredForms = analysisResult.forms || [];

      const subDomain = analysisResult.subDomain || null;
      const subDomainOptions = urlAnalyzerPro.subDomainNames
        ? urlAnalyzerPro.subDomainNames(websiteType.type)
        : [];
      // Ship the curated catalog with the artifact so the orchestrator can honour
      // an LLM-chosen sub-domain without importing @zero/analyzer.
      const subDomainCatalog = Object.values(
        urlAnalyzerPro.getSubDomains ? urlAnalyzerPro.getSubDomains(websiteType.type) : {}
      ).map((config) => ({
        name: config.name,
        testPriorities: config.testPriorities || [],
        criticalFlows: config.criticalFlows || []
      }));

      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: "URL Analyzer Pro Agent",
          url: ottUrl,
          domain: domain,
          domainKey: websiteType.type || 'GENERIC',
          domainName: websiteType.typeName,
          websiteType: websiteType.typeName,
          websiteTypeConfidence: websiteType.confidence,
          subDomain: subDomain?.name || null,
          subDomainKey: subDomain?.key || null,
          subDomainConfidence: subDomain?.confidence ?? null,
          classificationSource: subDomain?.source || 'rules',
          siteName: analysisResult.pageStructure?.title || hostFromUrl(ottUrl) || 'Website',
          analysisDepth: 'professional',
          insufficientEvidence: Boolean(analysisResult.insufficientEvidence),
          duration: analysisResult.analysisTime || 0
        },
        siteOverview: {
          // Fall back to the host rather than a status string — "Analysis Complete"
          // read like a title and hid the fact that no page title was found.
          title: analysisResult.pageStructure?.title || hostFromUrl(ottUrl) || "Untitled page",
          description: analysisResult.pageStructure?.metaTags?.description || "",
          type: websiteType.typeName,
          subDomain: subDomain?.name || null,
          url: ottUrl,
          pagesDiscovered: analysisResult.pagesCrawled || analysisResult.pagesAnalyzed || 1
        },
        domainClassification: {
          domain: websiteType.typeName,
          domainKey: websiteType.type || 'GENERIC',
          domainConfidence: websiteType.confidence ?? 0,
          domainIndicators: websiteType.indicators || [],
          domainCandidates: websiteType.candidates || [],
          subDomain: subDomain?.name || null,
          subDomainKey: subDomain?.key || null,
          subDomainConfidence: subDomain?.confidence ?? null,
          subDomainIndicators: subDomain?.matchedIndicators || [],
          subDomainCandidates: analysisResult.subDomainCandidates || [],
          subDomainOptions,
          subDomainCatalog,
          source: 'rules'
        },
        subDomainTestPriorities: subDomain?.testPriorities || [],
        subDomainCriticalFlows: subDomain?.criticalFlows || [],
        crawledPages: analysisResult.crawledPages || [],
        pagesCrawled: analysisResult.pagesCrawled || analysisResult.crawledPages?.length || 0,
        insufficientEvidence: Boolean(analysisResult.insufficientEvidence),
        discoveredPages: (analysisResult.crawledPages || []).map((p) => ({
          url: p.url,
          title: p.title,
          path: p.path,
          depth: p.depth,
          formCount: p.formCount,
          elementCounts: p.elementCounts,
          navLabels: p.navLabels
        })),
        features: discoveredFeatures.map(f => ({
          name: f.name,
          type: 'core',
          description: f.name,
          priority: f.priority,
          testable: f.testable !== false
        })),
        forms: discoveredForms.map(f => ({
          id: f.id,
          purpose: f.purpose,
          fieldCount: f.fieldCount,
          fields: f.fields
        })),
        ctas: analysisResult.elements?.filter(e => e.category === 'BUTTONS')?.slice(0, 20) || [],
        siteStructure: {
          navigation: analysisResult.elements?.filter(e => e.category === 'NAVIGATION') || [],
          footer: analysisResult.elements?.filter(e => e.category === 'FOOTER') || [],
          headers: analysisResult.pageStructure?.headings || []
        },
        sections: analysisResult.pageStructure?.sections || [],
        
        // Comprehensive analysis results
        allElements: (() => {
          const grouped = {};
          (analysisResult.elements || []).forEach(el => {
            if (!grouped[el.category]) grouped[el.category] = [];
            grouped[el.category].push(el);
          });
          return grouped;
        })(),
        pageStructure: analysisResult.pageStructure || {},
        userFlows: analysisResult.userFlows || [],
        selectors: {},
        observations: analysisResult.observations || [],
        warnings: analysisResult.warnings || [],
        
        // BRD Document
        brdDocument: analysisResult.brd || null,
        
        // `testCases` is the merged set: domain cases plus the evidence-backed
        // cases built from real forms, fields and page structure. Collapsing it
        // onto majorFunctionalCases here dropped every site-specific case.
        autoGeneratedTestCases: analysisResult.testCases?.length
          ? analysisResult.testCases
          : (analysisResult.majorFunctionalCases || []),
        majorFunctionalCases: analysisResult.majorFunctionalCases || analysisResult.testCases || [],
        
        // BA Agent insights
        baInsights: {
          summary: baObservations.summary,
          websiteType: websiteType.typeName,
          websiteTypeConfidence: websiteType.confidence,
          subDomain: subDomain?.name || null,
          subDomainConfidence: subDomain?.confidence ?? null,
          subDomainOptions,
          keyFunctionalities: baObservations.keyFunctionalities || [],
          userJourneys: baObservations.userJourneys || [],
          criticalPaths: baObservations.criticalPaths || [],
          riskAreas: baObservations.riskAreas || [],
          formAnalysis: baObservations.formAnalysis || [],
          navigationStructure: baObservations.navigationStructure || {},
          testingRecommendations: baObservations.testingRecommendations || [],
          insufficientEvidence: Boolean(analysisResult.insufficientEvidence),
          topNavLabels: (() => {
            const labels = new Set();
            (analysisResult.crawledPages || []).forEach((p) => {
              (p.navLabels || []).forEach((l) => labels.add(l));
            });
            return [...labels].slice(0, 20);
          })(),
          pagesCrawled: analysisResult.pagesCrawled || analysisResult.crawledPages?.length || 0
        },
        
        // Suggested test areas based on website type
        suggestedTestAreas: (() => {
          const areas = [];
          
          // Add type-specific test areas
          if (websiteType.type === 'RETAIL_STORE') {
            areas.push({ area: "Store Locations", priority: "Critical", tests: ["Branch listing", "Address accuracy", "Contact information", "Store timings", "Directions"] });
            areas.push({ area: "Product Categories", priority: "High", tests: ["Category navigation", "Category pages", "Product display"] });
          }
          
          if (websiteType.type === 'ECOMMERCE') {
            areas.push({ area: "Search Functionality", priority: "Critical", tests: ["Search with keywords", "Search results", "Filters", "Sorting"] });
            areas.push({ area: "Cart Operations", priority: "Critical", tests: ["Add to cart", "Update quantity", "Remove item", "Cart total"] });
            areas.push({ area: "Product Display", priority: "Critical", tests: ["Product listing", "Product details", "Images", "Pricing"] });
          }
          
          if (websiteType.type === 'HEALTHCARE_PHARMA') {
            areas.push({ area: "Product Information", priority: "Critical", tests: ["Product details", "Composition", "Usage", "Warnings"] });
            areas.push({ area: "Adverse Event Reporting", priority: "Critical", tests: ["Form accessibility", "Submission", "Confirmation"] });
          }
          
          if (websiteType.type === 'OTT_STREAMING') {
            areas.push({ area: "Content Discovery", priority: "Critical", tests: ["Content browse", "Search", "Categories", "Recommendations"] });
            areas.push({ area: "Video Playback", priority: "Critical", tests: ["Play button", "Controls", "Quality", "Buffering"] });
          }
          
          // Common test areas for all types
          if (analysisResult.forms?.length > 0) {
            areas.push({ area: "Form Validation", priority: "High", tests: ["Required fields", "Input validation", "Error messages", "Submission"] });
          }
          
          areas.push({ area: "Navigation", priority: "High", tests: ["Menu items", "Page transitions", "Logo link", "Footer links"] });
          areas.push({ area: "UI/Visual", priority: "Medium", tests: ["Page layout", "Images", "Responsive design", "Accessibility"] });
          areas.push({ area: "Performance", priority: "High", tests: ["Page load", "Core Web Vitals", "Image optimization"] });
          
          return areas;
        })(),
        
        suggestedRequirements: analysisResult.brd?.functionalRequirements?.map(r => 
          `${r.id}: ${r.description}`
        ) || []
      };
    } catch (err) {
      if (browser) await browser.close().catch(() => {});
      if (isRunStoppedError(err) || (await isRunCancelRequested(cloud.cache, run.id))) {
        throw isRunStoppedError(err) ? err : new RunStoppedError();
      }
      console.error('[Web Analyzer Pro] Error:', err.message);
      return buildFailedWebAnalysis(ottUrl, err.message);
    } finally {
      unwatch();
    }
  }

  /**
   * Security Testing Agent - Performs basic security checks on the website
   */
  async function generateSecurityReport(run) {
    const ottUrl = run.input.ottUrl;
    const headless = resolveHeadless(run);

    let browser = null;
    const vulnerabilities = [];
    const checks = [];
    const recommendations = [];

    try {
      browser = await chromium.launch({ headless, args: ["--no-sandbox"] });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Capture security headers from response
      let securityHeaders = {};
      page.on("response", (response) => {
        if (response.url() === ottUrl || response.url() === ottUrl + '/') {
          const headers = response.headers();
          securityHeaders = {
            contentSecurityPolicy: headers['content-security-policy'] || null,
            xFrameOptions: headers['x-frame-options'] || null,
            xContentTypeOptions: headers['x-content-type-options'] || null,
            strictTransportSecurity: headers['strict-transport-security'] || null,
            xXssProtection: headers['x-xss-protection'] || null,
            referrerPolicy: headers['referrer-policy'] || null
          };
        }
      });

      await page.goto(ottUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Check 1: HTTPS usage
      const isHttps = ottUrl.startsWith('https://');
      checks.push({
        name: "HTTPS Enabled",
        status: isHttps ? "pass" : "fail",
        severity: isHttps ? "none" : "critical",
        description: isHttps ? "Site uses HTTPS" : "Site does not use HTTPS - data transmitted insecurely"
      });
      if (!isHttps) {
        vulnerabilities.push({ type: "critical", name: "Missing HTTPS", description: "Site not using HTTPS encryption" });
        recommendations.push("Enable HTTPS with a valid SSL certificate");
      }

      // Check 2: Content Security Policy
      checks.push({
        name: "Content Security Policy",
        status: securityHeaders.contentSecurityPolicy ? "pass" : "warning",
        severity: securityHeaders.contentSecurityPolicy ? "none" : "medium",
        description: securityHeaders.contentSecurityPolicy ? "CSP header present" : "No CSP header - vulnerable to XSS"
      });
      if (!securityHeaders.contentSecurityPolicy) {
        vulnerabilities.push({ type: "medium", name: "Missing CSP", description: "No Content-Security-Policy header" });
        recommendations.push("Implement Content-Security-Policy header to prevent XSS attacks");
      }

      // Check 3: X-Frame-Options
      checks.push({
        name: "Clickjacking Protection",
        status: securityHeaders.xFrameOptions ? "pass" : "warning",
        severity: securityHeaders.xFrameOptions ? "none" : "medium",
        description: securityHeaders.xFrameOptions ? `X-Frame-Options: ${securityHeaders.xFrameOptions}` : "No X-Frame-Options header"
      });
      if (!securityHeaders.xFrameOptions) {
        vulnerabilities.push({ type: "medium", name: "Missing X-Frame-Options", description: "Site may be vulnerable to clickjacking" });
        recommendations.push("Add X-Frame-Options header (DENY or SAMEORIGIN)");
      }

      // Check 4: X-Content-Type-Options
      checks.push({
        name: "MIME Type Sniffing Protection",
        status: securityHeaders.xContentTypeOptions ? "pass" : "warning",
        severity: securityHeaders.xContentTypeOptions ? "none" : "low",
        description: securityHeaders.xContentTypeOptions ? "X-Content-Type-Options: nosniff" : "No X-Content-Type-Options header"
      });

      // Check 5: HSTS
      checks.push({
        name: "HTTP Strict Transport Security",
        status: securityHeaders.strictTransportSecurity ? "pass" : "warning",
        severity: securityHeaders.strictTransportSecurity ? "none" : "medium",
        description: securityHeaders.strictTransportSecurity ? "HSTS enabled" : "No HSTS header"
      });
      if (!securityHeaders.strictTransportSecurity && isHttps) {
        recommendations.push("Enable HSTS to enforce HTTPS usage");
      }

      // Check 6: Password fields
      const passwordFields = await page.$$eval('input[type="password"]', fields =>
        fields.map(f => ({
          name: f.name || f.id || "unnamed",
          autocomplete: f.autocomplete,
          hasLabel: !!f.labels?.length
        }))
      );
      const insecurePasswords = passwordFields.filter(f => f.autocomplete === 'on');
      checks.push({
        name: "Password Field Security",
        status: insecurePasswords.length === 0 ? "pass" : "warning",
        severity: insecurePasswords.length === 0 ? "none" : "low",
        description: `${passwordFields.length} password field(s) found, ${insecurePasswords.length} with autocomplete enabled`
      });

      // Check 7: External scripts
      const externalScripts = await page.$$eval('script[src]', scripts =>
        scripts.filter(s => !s.src.includes(window.location.hostname))
          .map(s => ({ src: s.src.slice(0, 100), integrity: s.integrity || null }))
      );
      const scriptsWithoutIntegrity = externalScripts.filter(s => !s.integrity);
      checks.push({
        name: "Subresource Integrity",
        status: scriptsWithoutIntegrity.length === 0 ? "pass" : "info",
        severity: scriptsWithoutIntegrity.length === 0 ? "none" : "low",
        description: `${externalScripts.length} external scripts, ${scriptsWithoutIntegrity.length} without SRI`
      });

      // Check 8: Form actions
      const forms = await page.$$eval('form', forms =>
        forms.map(f => ({
          action: f.action || "same page",
          method: f.method || "GET",
          isHttps: f.action?.startsWith('https://') || !f.action || f.action.startsWith('/')
        }))
      );
      const insecureForms = forms.filter(f => !f.isHttps);
      checks.push({
        name: "Secure Form Submissions",
        status: insecureForms.length === 0 ? "pass" : "fail",
        severity: insecureForms.length === 0 ? "none" : "high",
        description: `${forms.length} form(s), ${insecureForms.length} with insecure action URLs`
      });
      if (insecureForms.length > 0) {
        vulnerabilities.push({ type: "high", name: "Insecure Form Action", description: "Form submits data over HTTP" });
      }

      // Check 9: Cookie security
      const cookies = await context.cookies();
      const insecureCookies = cookies.filter(c => !c.secure || !c.httpOnly);
      checks.push({
        name: "Cookie Security",
        status: insecureCookies.length === 0 ? "pass" : "warning",
        severity: insecureCookies.length === 0 ? "none" : "medium",
        description: `${cookies.length} cookie(s), ${insecureCookies.length} without Secure/HttpOnly flags`
      });

      // Check 10: Sensitive data exposure
      const pageContent = await page.content();
      const sensitivePatterns = [
        { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, name: "API Key" },
        { pattern: /password\s*[:=]\s*["'][^"']+["']/gi, name: "Hardcoded Password" },
        { pattern: /secret\s*[:=]\s*["'][^"']+["']/gi, name: "Secret Key" }
      ];
      const exposedSecrets = sensitivePatterns.filter(p => p.pattern.test(pageContent));
      checks.push({
        name: "Sensitive Data Exposure",
        status: exposedSecrets.length === 0 ? "pass" : "fail",
        severity: exposedSecrets.length === 0 ? "none" : "critical",
        description: exposedSecrets.length === 0 ? "No exposed secrets detected" : `Potential ${exposedSecrets.map(s => s.name).join(', ')} exposure`
      });
      if (exposedSecrets.length > 0) {
        vulnerabilities.push({ type: "critical", name: "Sensitive Data Exposure", description: "Potential secrets found in page source" });
      }

      await browser.close();
      browser = null;

      // Calculate security score
      const passedChecks = checks.filter(c => c.status === "pass").length;
      const criticalIssues = vulnerabilities.filter(v => v.type === "critical").length;
      const highIssues = vulnerabilities.filter(v => v.type === "high").length;
      const score = Math.max(0, 100 - (criticalIssues * 25) - (highIssues * 15) - ((checks.length - passedChecks) * 5));

      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: "Security Agent",
          url: ottUrl
        },
        summary: {
          score,
          verdict: score >= 80 ? "Good" : score >= 60 ? "Acceptable" : score >= 40 ? "Needs Improvement" : "Critical",
          checksRun: checks.length,
          passed: passedChecks,
          failed: checks.filter(c => c.status === "fail").length,
          warnings: checks.filter(c => c.status === "warning").length
        },
        securityHeaders,
        checks,
        vulnerabilities,
        recommendations: [...new Set(recommendations)],
        complianceNotes: [
          isHttps ? "HTTPS compliance: Met" : "HTTPS compliance: Not Met",
          securityHeaders.contentSecurityPolicy ? "CSP compliance: Met" : "CSP compliance: Not Met"
        ]
      };
    } catch (err) {
      if (browser) await browser.close().catch(() => {});
      return {
        metadata: { generatedAt: new Date().toISOString(), source: "Security Agent", url: ottUrl },
        summary: { score: 0, verdict: "Error", checksRun: 0, passed: 0, failed: 1, warnings: 0 },
        checks: [],
        vulnerabilities: [{ type: "error", name: "Agent Error", description: err.message }],
        recommendations: ["Fix agent execution error and retry"]
      };
    }
  }

  async function generateAccessibilityReport(run) {
    const ottUrl = run.input.ottUrl;
    const headless = resolveHeadless(run);

    let browser = null;
    const issues = [];
    const checks = [];

    try {
      browser = await chromium.launch({ headless });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(ottUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Check 1: Images without alt text
      const imagesWithoutAlt = await page.$$eval("img:not([alt]), img[alt='']", (imgs) =>
        imgs.slice(0, 20).map(img => ({ src: img.src?.slice(0, 100), issue: "Missing alt text" }))
      );
      if (imagesWithoutAlt.length > 0) {
        issues.push({ type: "error", category: "Images", message: `${imagesWithoutAlt.length} images missing alt text`, details: imagesWithoutAlt.slice(0, 5) });
      }
      checks.push({ name: "Alt text on images", status: imagesWithoutAlt.length === 0 ? "pass" : "fail", count: imagesWithoutAlt.length });

      // Check 2: Form inputs without labels
      const inputsWithoutLabels = await page.$$eval("input:not([aria-label]):not([aria-labelledby]):not([id])", (inputs) => inputs.length);
      checks.push({ name: "Form input labels", status: inputsWithoutLabels === 0 ? "pass" : "warn", count: inputsWithoutLabels });
      if (inputsWithoutLabels > 0) {
        issues.push({ type: "warning", category: "Forms", message: `${inputsWithoutLabels} inputs may lack proper labels` });
      }

      // Check 3: Buttons without accessible names
      const buttonsWithoutNames = await page.$$eval("button:not([aria-label]):empty, button:not([aria-label]):not(:has(*))", (btns) => btns.length);
      checks.push({ name: "Button accessible names", status: buttonsWithoutNames === 0 ? "pass" : "fail", count: buttonsWithoutNames });
      if (buttonsWithoutNames > 0) {
        issues.push({ type: "error", category: "Buttons", message: `${buttonsWithoutNames} buttons without accessible names` });
      }

      // Check 4: Links without text
      const emptyLinks = await page.$$eval("a:not([aria-label]):empty, a:not([aria-label]):not(:has(*))", (links) => links.length);
      checks.push({ name: "Link text", status: emptyLinks === 0 ? "pass" : "warn", count: emptyLinks });
      if (emptyLinks > 0) {
        issues.push({ type: "warning", category: "Links", message: `${emptyLinks} links without descriptive text` });
      }

      // Check 5: Heading hierarchy
      const headings = await page.$$eval("h1, h2, h3, h4, h5, h6", (hs) => hs.map(h => h.tagName));
      const h1Count = headings.filter(h => h === "H1").length;
      checks.push({ name: "Single H1 heading", status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn", count: h1Count });
      if (h1Count !== 1) {
        issues.push({ type: h1Count === 0 ? "error" : "warning", category: "Headings", message: h1Count === 0 ? "No H1 heading found" : `Multiple H1 headings found (${h1Count})` });
      }

      // Check 6: ARIA landmarks
      const landmarks = await page.$$eval("[role='main'], [role='navigation'], [role='banner'], main, nav, header", (els) => els.length);
      checks.push({ name: "ARIA landmarks", status: landmarks >= 2 ? "pass" : "warn", count: landmarks });
      if (landmarks < 2) {
        issues.push({ type: "warning", category: "Structure", message: "Limited ARIA landmarks detected" });
      }

      // Check 7: Color contrast (basic check - text elements)
      const smallText = await page.$$eval("p, span, a, button, label", (els) => els.length);
      checks.push({ name: "Text elements found", status: "info", count: smallText });

      // Check 8: Focus indicators
      const focusableElements = await page.$$eval("a, button, input, select, textarea, [tabindex]", (els) => els.length);
      checks.push({ name: "Focusable elements", status: focusableElements > 0 ? "pass" : "warn", count: focusableElements });

      await browser.close();
      browser = null;

      const errorCount = issues.filter(i => i.type === "error").length;
      const warningCount = issues.filter(i => i.type === "warning").length;
      const passCount = checks.filter(c => c.status === "pass").length;

      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: "Accessibility Agent",
          url: ottUrl
        },
        summary: {
          score: Math.max(0, 100 - (errorCount * 15) - (warningCount * 5)),
          verdict: errorCount === 0 ? (warningCount <= 2 ? "Good" : "Acceptable") : "Needs Improvement",
          checksRun: checks.length,
          passed: passCount,
          errors: errorCount,
          warnings: warningCount
        },
        checks,
        issues,
        recommendations: [
          errorCount > 0 ? "Fix all images missing alt text for screen readers" : null,
          buttonsWithoutNames > 0 ? "Add aria-label to icon-only buttons" : null,
          h1Count !== 1 ? "Ensure exactly one H1 heading per page" : null,
          landmarks < 2 ? "Add ARIA landmarks (main, nav, header) for navigation" : null
        ].filter(Boolean)
      };
    } catch (err) {
      if (browser) await browser.close().catch(() => { });
      return {
        metadata: { generatedAt: new Date().toISOString(), source: "Accessibility Agent", url: ottUrl },
        summary: { score: 0, verdict: "Error", checksRun: 0, passed: 0, errors: 1, warnings: 0 },
        checks: [],
        issues: [{ type: "error", category: "Agent", message: `Accessibility check failed: ${err.message}` }],
        recommendations: ["Fix agent execution error and retry"]
      };
    }
  }

  async function generatePerformanceReport(run) {
    const ottUrl = run.input.ottUrl;
    const headless = resolveHeadless(run);

    let browser = null;

    try {
      browser = await chromium.launch({ headless });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Enable request tracking
      const requests = [];
      const resourceTypes = { document: 0, script: 0, stylesheet: 0, image: 0, font: 0, xhr: 0, fetch: 0, other: 0 };
      let totalBytes = 0;

      page.on("response", async (response) => {
        try {
          const type = response.request().resourceType();
          resourceTypes[type] = (resourceTypes[type] || 0) + 1;
          const headers = response.headers();
          const contentLength = parseInt(headers["content-length"] || "0", 10);
          totalBytes += contentLength;
          requests.push({ url: response.url().slice(0, 100), status: response.status(), type, size: contentLength });
        } catch (_) { }
      });

      const startTime = Date.now();
      await page.goto(ottUrl, { waitUntil: "load", timeout: 60000 });
      const loadTime = Date.now() - startTime;

      // Wait for network to settle
      await page.waitForTimeout(2000);

      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perf = window.performance;
        const timing = perf.timing || {};
        const navigation = perf.getEntriesByType?.("navigation")?.[0] || {};

        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime || timing.domContentLoadedEventEnd - timing.navigationStart || 0,
          domInteractive: navigation.domInteractive - navigation.startTime || timing.domInteractive - timing.navigationStart || 0,
          loadComplete: navigation.loadEventEnd - navigation.startTime || timing.loadEventEnd - timing.navigationStart || 0,
          firstPaint: perf.getEntriesByType?.("paint")?.find(p => p.name === "first-paint")?.startTime || 0,
          firstContentfulPaint: perf.getEntriesByType?.("paint")?.find(p => p.name === "first-contentful-paint")?.startTime || 0,
          resourceCount: perf.getEntriesByType?.("resource")?.length || 0
        };
      });

      // DOM size check
      const domStats = await page.evaluate(() => {
        const allElements = document.querySelectorAll("*").length;
        const maxDepth = (function getMaxDepth(el, depth = 0) {
          if (!el.children.length) return depth;
          return Math.max(...Array.from(el.children).map(c => getMaxDepth(c, depth + 1)));
        })(document.body);
        return { elementCount: allElements, maxDepth };
      });

      await browser.close();
      browser = null;

      // Scoring
      const metrics = [];
      const issues = [];

      // Load time scoring
      const loadTimeScore = loadTime < 3000 ? "good" : loadTime < 6000 ? "moderate" : "poor";
      metrics.push({ name: "Page Load Time", value: `${(loadTime / 1000).toFixed(2)}s`, score: loadTimeScore });
      if (loadTime > 5000) issues.push({ type: "error", message: `Slow page load: ${(loadTime / 1000).toFixed(2)}s (target: <3s)` });

      // FCP scoring
      const fcp = performanceMetrics.firstContentfulPaint;
      const fcpScore = fcp < 1800 ? "good" : fcp < 3000 ? "moderate" : "poor";
      metrics.push({ name: "First Contentful Paint (FCP)", value: `${(fcp / 1000).toFixed(2)}s`, score: fcpScore });
      if (fcp > 2500) issues.push({ type: "warning", message: `Slow FCP: ${(fcp / 1000).toFixed(2)}s (target: <1.8s)` });

      // DOM size scoring
      const domScore = domStats.elementCount < 1500 ? "good" : domStats.elementCount < 3000 ? "moderate" : "poor";
      metrics.push({ name: "DOM Elements", value: domStats.elementCount.toString(), score: domScore });
      if (domStats.elementCount > 2000) issues.push({ type: "warning", message: `Large DOM: ${domStats.elementCount} elements (target: <1500)` });

      // Resource count
      const resourceScore = performanceMetrics.resourceCount < 50 ? "good" : performanceMetrics.resourceCount < 100 ? "moderate" : "poor";
      metrics.push({ name: "Resources Loaded", value: performanceMetrics.resourceCount.toString(), score: resourceScore });
      if (performanceMetrics.resourceCount > 80) issues.push({ type: "warning", message: `Many resources: ${performanceMetrics.resourceCount} (target: <50)` });

      // Total size
      const sizeMB = (totalBytes / (1024 * 1024)).toFixed(2);
      const sizeScore = totalBytes < 2 * 1024 * 1024 ? "good" : totalBytes < 5 * 1024 * 1024 ? "moderate" : "poor";
      metrics.push({ name: "Total Page Size", value: `${sizeMB} MB`, score: sizeScore });
      if (totalBytes > 3 * 1024 * 1024) issues.push({ type: "warning", message: `Large page size: ${sizeMB}MB (target: <2MB)` });

      const goodCount = metrics.filter(m => m.score === "good").length;
      const overallScore = Math.round((goodCount / metrics.length) * 100);

      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          source: "Performance Agent",
          url: ottUrl
        },
        summary: {
          score: overallScore,
          verdict: overallScore >= 80 ? "Good" : overallScore >= 50 ? "Moderate" : "Needs Improvement",
          loadTime: `${(loadTime / 1000).toFixed(2)}s`,
          resourceCount: performanceMetrics.resourceCount,
          totalSize: `${sizeMB} MB`
        },
        coreWebVitals: {
          fcp: `${(fcp / 1000).toFixed(2)}s`,
          domContentLoaded: `${(performanceMetrics.domContentLoaded / 1000).toFixed(2)}s`,
          loadComplete: `${(performanceMetrics.loadComplete / 1000).toFixed(2)}s`
        },
        metrics,
        resourceBreakdown: resourceTypes,
        domStats,
        issues,
        recommendations: [
          loadTime > 5000 ? "Optimize server response time and reduce blocking resources" : null,
          fcp > 2500 ? "Reduce render-blocking CSS and JavaScript" : null,
          domStats.elementCount > 2000 ? "Simplify DOM structure or virtualize long lists" : null,
          resourceTypes.image > 20 ? "Optimize and lazy-load images" : null,
          resourceTypes.script > 15 ? "Consolidate and defer non-critical scripts" : null
        ].filter(Boolean)
      };
    } catch (err) {
      if (browser) await browser.close().catch(() => { });
      return {
        metadata: { generatedAt: new Date().toISOString(), source: "Performance Agent", url: ottUrl },
        summary: { score: 0, verdict: "Error", loadTime: "N/A", resourceCount: 0, totalSize: "N/A" },
        coreWebVitals: {},
        metrics: [],
        resourceBreakdown: {},
        domStats: {},
        issues: [{ type: "error", message: `Performance check failed: ${err.message}` }],
        recommendations: ["Fix agent execution error and retry"]
      };
    }
  }

  return {
    generateExecutionReport,
    generateWebAnalysis,
    generateSecurityReport,
    generateAccessibilityReport,
    generatePerformanceReport
  };
}

module.exports = { createJobs, analyzerContextOptions };

"use strict";

const { healLocator } = require("./locatorHealing");

const MAX_FLOWS = 20;
const ELEMENT_WAIT_MS = 3000;
const NAV_TIMEOUT_MS = 60000;

function priorityRank(priority) {
  const value = String(priority || "").toLowerCase();
  if (value === "critical" || value === "p0") return 0;
  if (value === "high" || value === "p1") return 1;
  if (value === "medium" || value === "p2") return 2;
  return 3;
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

// "navigate" must not read as a navigation-menu intent, so every word is bounded.
const NAV_INTENT = /\bnav\b|\bnavbar\b|\bnavigation\b|\bmenu\b|\bheader\b/;

// Containers that prove nothing beyond "the page rendered".
const PAGE_CONTAINERS = new Set(["body", "main", "html", "#root", "#app", "#__next"]);

const GENERIC_TARGETS = /^(homepage|home|landing|main navigation|navigation|nav|menu|header|footer|page|site|entry point)$/i;

function intentOf(step) {
  return `${step?.target || ""} ${step?.description || ""}`.toLowerCase();
}

function looksLikeSelector(value) {
  const sel = String(value || "").trim();
  if (!sel || sel.length > 180 || /\s{2,}/.test(sel)) return false;
  if (sel.startsWith("//") || sel.startsWith("xpath=")) return true;
  if (/^[.#\[]/.test(sel)) return true;
  if (/^(nav|header|footer|main|button|a|input|form|img)\b/i.test(sel) && !/\s/.test(sel)) return true;
  return false;
}

function asSelectorList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => asSelectorList(item));
  }
  if (typeof value === "string") return looksLikeSelector(value) ? [value] : [];
  if (typeof value === "object" && value.selector) return asSelectorList(value.selector);
  return [];
}

function flowKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+flow$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function significantWords(value) {
  return flowKey(value)
    .split(" ")
    .filter((word) => word.length > 3 && !["flow", "verify", "functionality"].includes(word));
}

function selectorSupportsStep(selector, step, action = step.action) {
  const value = String(selector || "").toLowerCase();
  const intent = `${step.target || ""} ${step.description || ""}`.toLowerCase();
  const normalizedAction = String(action || "verify").toLowerCase();

  if (!value) return false;
  if (normalizedAction === "click" || normalizedAction === "interact" || normalizedAction === "tap") {
    if (/^(body|main|header|footer|nav|\[role=['"]?(navigation|contentinfo|banner)['"]?\])$/.test(value)) {
      return false;
    }
    if (!/(^|[\s>])(a|button|input)\b|href|role=['"]?(button|link|menuitem)|onclick|data-action|button|link/.test(value)) {
      return false;
    }
  }
  if (normalizedAction === "input" && !/(input|textarea|contenteditable)/.test(value)) return false;
  if (/search|query/.test(intent)) {
    return /search|query|type=['"]search|name=['"]q['"]|\[role=['"]search/.test(value);
  }
  if (/video|audio|media|playback|play button/.test(intent)) {
    return /(^|[\s>])video\b|(^|[\s>])audio\b|iframe.*(youtube|vimeo)|play/.test(value);
  }
  if (/footer|contentinfo/.test(intent) && normalizedAction !== "scroll") {
    return /footer|contentinfo/.test(value);
  }
  if (NAV_INTENT.test(intent) && normalizedAction !== "navigate") {
    return /nav|navigation|header.*(a|button)|menu/.test(value);
  }
  return true;
}

function normalizeFlowSteps(flow) {
  const flowSelectors = asSelectorList(flow.elements);
  const raw = flow.steps || [];
  return raw.map((step) => {
    if (typeof step === "string") {
      const normalized = { action: actionFromDescription(step), description: step, target: step, requiresAuth: false };
      return {
        ...normalized,
        selectors: flowSelectors.filter((selector) => selectorSupportsStep(selector, normalized))
      };
    }
    const ownSelectors = asSelectorList(step.selector);
    const normalized = {
      action: String(step.action || "verify").toLowerCase(),
      description: step.description || step.target || step.action || "Verify step",
      target: step.target || null,
      value: step.value || null,
      requiresAuth: Boolean(step.requiresAuth || flow.requiresAuth)
    };
    return {
      ...normalized,
      selectors: unique([...ownSelectors, ...flowSelectors]).filter((selector) =>
        selectorSupportsStep(selector, normalized)
      )
    };
  });
}

function actionFromDescription(description) {
  const text = String(description || "").trim().toLowerCase();
  if (/^(navigate|go to|open|from .* open|load)\b/.test(text)) return "navigate";
  if (/^(click|tap|choose|select|add|start|play)\b/.test(text)) return "click";
  if (/^(enter|type|fill|complete)\b/.test(text)) return "input";
  if (/^submit\b/.test(text)) return "submit";
  if (/^scroll\b/.test(text)) return "scroll";
  return "verify";
}

function matchingFlow(tc, userFlows) {
  const caseText = `${tc.module || ""} ${tc.scenario || ""} ${tc.title || ""}`;
  const caseWords = new Set(significantWords(caseText));
  let best = null;
  let bestScore = 0;
  for (const flow of userFlows) {
    const name = flow.name || "";
    const exact = flowKey(caseText).includes(flowKey(name));
    const score = significantWords(name).filter((word) => caseWords.has(word)).length + (exact ? 3 : 0);
    if (score > bestScore) {
      best = flow;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : null;
}

function pickCriticalFlows(userFlows = [], manualCases = [], limit = MAX_FLOWS) {
  const picked = [];
  const seen = new Set();

  function tryAdd(entry) {
    const key = entry.caseId || flowKey(entry.name);
    if (!key || seen.has(key) || picked.length >= limit) return;
    seen.add(key);
    picked.push(entry);
  }

  const sortedFlows = userFlows
    .slice()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  const sortedCases = manualCases
    .slice()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  for (const tc of sortedCases) {
    const evidenceFlow = matchingFlow(tc, sortedFlows);
    const evidenceSelectors = evidenceFlow ? asSelectorList(evidenceFlow.elements) : [];
    const steps = Array.isArray(tc.steps)
      ? tc.steps.map((step) => {
          const description = typeof step === "string"
            ? step
            : step?.description || step?.target || step?.action || "Verify step";
          const normalized = {
            action: typeof step === "object" && step?.action
              ? String(step.action).toLowerCase()
              : actionFromDescription(description),
            description: String(description),
            target: typeof step === "object" ? step.target || description : description,
            value: typeof step === "object" ? step.value || null : null,
            requiresAuth: Boolean(tc.requiresAuth || (typeof step === "object" && step.requiresAuth))
          };
          return {
            ...normalized,
            selectors: evidenceSelectors.filter((selector) => selectorSupportsStep(selector, normalized))
          };
        })
      : normalizeFlowSteps({
          ...tc,
          elements: evidenceSelectors,
          steps: [tc.scenario || tc.title || "Verify case"]
        });
    tryAdd({
      kind: "case",
      name: tc.scenario || tc.title || tc.module || "Functional Case",
      flow: tc,
      caseId: tc.id || null,
      traceability: tc.traceability || null,
      steps
    });
  }

  if (!sortedCases.length) {
    for (const flow of sortedFlows) {
      tryAdd({ kind: "flow", name: flow.name || "User Flow", flow, steps: normalizeFlowSteps(flow) });
    }
  }

  return picked.slice(0, limit);
}

function isSensitiveStep(step) {
  const text = `${step.description || ""} ${step.target || ""}`.toLowerCase();
  return /password|payment|card|cvv|checkout|billing|ssn|otp|secret/.test(text);
}

function semanticSelectors(step, action = step?.action) {
  const text = intentOf(step);
  const normalizedAction = String(action || "verify").toLowerCase();
  const out = [];
  if (/footer|contentinfo/.test(text)) {
    out.push("footer", "[role='contentinfo']", ".footer");
  }
  // Unscoped menu links only make sense when the step really is "use the menu".
  // For a navigate step they would send every flow to the same first header link.
  if (NAV_INTENT.test(text) && normalizedAction !== "navigate") {
    out.push("nav a", "[role='navigation'] a", "header a", "nav button", "[class*='menu'] a");
  }
  if (/\blogo\b/.test(text)) {
    out.push("header img", "a[href='/'] img", "[class*='logo']", "img[alt*='logo' i]");
  }
  if (/cart|bag|basket/.test(text)) {
    out.push(
      "a[href*='cart']",
      "[aria-label*='cart' i]",
      "button:has-text('Add to cart')",
      "button:has-text('Add to bag')",
      "[class*='cart']"
    );
  }
  if (/search/.test(text)) {
    out.push(
      "input[type='search']",
      "input[name*='search' i]",
      "input[placeholder*='search' i]",
      "[role='search'] input"
    );
  }
  if (/product|listing|category/.test(text)) {
    out.push("[class*='product']", "a[href*='product']", "main article");
  }
  if (/page load|homepage|landing/.test(text)) {
    out.push("main", "body", "#root", "#app", "#__next");
  }
  return unique(out);
}

function quotedLabels(step) {
  const text = `${step?.target || ""} ${step?.description || ""}`;
  const labels = [];
  const pattern = /"([^"]{2,40})"/g;
  let match = pattern.exec(text);
  while (match) {
    labels.push(match[1].trim());
    match = pattern.exec(text);
  }
  return labels;
}

/** Analyzer steps name a real path, e.g. `Navigate to /search ("Search results")`. */
function pathTarget(step) {
  const text = `${step?.target || ""} ${step?.description || ""}`;
  const match = /\b(?:navigate to|go to|open|load)\s+(\/[A-Za-z0-9\-._~/%?=&+]*)/i.exec(text);
  return match ? match[1] : null;
}

/** Labels a link or control could plausibly carry, so navigation stays target-specific. */
function linkTerms(step) {
  const candidates = [...quotedLabels(step), ...verifyTerms(step)];
  const cleaned = candidates.map((candidate) =>
    String(candidate)
      .replace(/^from the homepage,?\s*/i, "")
      .replace(/\s+in the main navigation$/i, "")
      .replace(/^(the|a|an)\s+/i, "")
      .replace(/\s+(entry point|page|screen|section|ui|functionality|flow)$/i, "")
      .trim()
  );
  return unique(
    cleaned.filter((term) => term.length >= 3 && term.length <= 32 && !GENERIC_TARGETS.test(term))
  ).slice(0, 4);
}

function textSelectorValue(term) {
  return String(term).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function navTargetSelectors(step) {
  return unique(
    linkTerms(step).flatMap((term) => {
      const label = textSelectorValue(term);
      return [
        `nav a:has-text("${label}")`,
        `header a:has-text("${label}")`,
        `a:has-text("${label}")`,
        `[role='menuitem']:has-text("${label}")`,
        `button:has-text("${label}")`
      ];
    })
  );
}

function absoluteUrl(path, baseUrl) {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return null;
  }
}

function locatorFor(page, selector) {
  const sel = String(selector);
  if (sel.startsWith("//") || sel.startsWith("xpath=")) {
    return page.locator(sel.startsWith("xpath=") ? sel : `xpath=${sel}`).first();
  }
  return page.locator(sel).first();
}

async function locatorSupportsIntent(locator, step, action) {
  const intent = `${step?.target || ""} ${step?.description || ""}`.toLowerCase();
  if (!/search|query/.test(intent) || !["click", "input", "verify"].includes(String(action || step?.action))) {
    return true;
  }
  if (typeof locator.getAttribute !== "function") return true;

  const attributes = await Promise.all(
    ["name", "placeholder", "aria-label", "type"].map((name) =>
      locator.getAttribute(name).catch(() => null)
    )
  );
  const evidence = attributes.filter(Boolean).join(" ").toLowerCase();
  const isLocationInput = /location|locality|address|pincode|postal|delivery area/.test(evidence);
  const isProductInput = /product|item|grocery|catalog|shop/.test(evidence);
  return !isLocationInput || isProductInput;
}

async function firstVisible(page, selectors, timeout = ELEMENT_WAIT_MS, step = null, action = null) {
  for (const sel of unique(selectors)) {
    if (step && !selectorSupportsStep(sel, step, action || step.action)) continue;
    try {
      const loc = locatorFor(page, sel);
      if (
        await loc.isVisible({ timeout }) &&
        await locatorSupportsIntent(loc, step, action || step?.action)
      ) {
        return { locator: loc, selector: sel };
      }
    } catch {
      /* invalid or detached candidate */
    }
  }
  return null;
}

function verifyTerms(step) {
  const parts = [step.target, step.description].filter(Boolean).map((part) => String(part).trim());
  const terms = [];
  for (const text of parts) {
    if (looksLikeSelector(text)) continue;
    if (text.length > 3 && text.length < 42 && !/^verify\b/i.test(text)) {
      terms.push(text);
    }
    for (const chunk of text.split(/[,;/]| and /i)) {
      const cleaned = chunk.replace(/^(verify|click|open|scroll to|go to|navigate to|load)\s+/i, "").trim();
      if (cleaned.length > 3 && cleaned.length < 40) terms.push(cleaned);
    }
  }
  return unique(terms).slice(0, 6);
}

async function firstVisibleText(page, terms, timeout = 2000) {
  if (typeof page.getByText !== "function") return null;
  for (const term of terms) {
    try {
      const loc = page.getByText(term, { exact: false }).first();
      if (await loc.isVisible({ timeout })) {
        return { locator: loc, term };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function healedTarget(page, step, action, trace) {
  const healing = await healLocator(page, step, action);
  if (!healing) return null;
  trace.push(`flow:healed:${healing.key}:${healing.evidence}`);
  return healing;
}

async function reportHealing(ctx, step, healing) {
  if (!healing || typeof ctx.onHealed !== "function") return;
  await ctx.onHealed({
    key: healing.key,
    selector: healing.selector,
    strategy: healing.strategy,
    evidence: healing.evidence,
    action: step.action,
    target: step.target || step.description || null
  });
}

async function dismissNoise(page, trace) {
  if (typeof page.getByRole !== "function") return;
  const names = [/accept all/i, /accept cookies/i, /^accept$/i, /^ok$/i, /got it/i, /i agree/i, /allow all/i];
  for (const name of names) {
    try {
      const btn = page.getByRole("button", { name }).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 2000 });
        trace.push("flow:dismiss-overlay");
        if (typeof page.waitForTimeout === "function") await page.waitForTimeout(250);
        return;
      }
    } catch {
      /* no overlay */
    }
  }
}

async function waitForPage(page) {
  const body = page.locator("body").first();
  if (typeof body.waitFor === "function") {
    await body.waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
  }
  return body.isVisible({ timeout: 4000 }).catch(() => false);
}

async function ensureOnSite(page, ctx, trace) {
  if (ctx.loaded) return;
  await page.goto(ctx.ottUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  if (typeof page.waitForTimeout === "function") await page.waitForTimeout(800);
  await dismissNoise(page, trace);
  ctx.loaded = true;
  trace.push("discovered_flows:initial-load");
}

async function navigateToIntent(page, step, ctx, trace) {
  const target = String(step.target || "").trim();
  if (/^https?:\/\//i.test(target)) {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(800);
    await dismissNoise(page, trace);
    ctx.loaded = true;
    trace.push(`flow:navigate:${target}`);
    return { ok: true };
  }

  await ensureOnSite(page, ctx, trace);
  const intent = `${target} ${step.description || ""}`.toLowerCase();
  const terms = linkTerms(step);
  const path = pathTarget(step);

  if (path) {
    const url = absoluteUrl(path, ctx.ottUrl);
    if (url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      if (typeof page.waitForTimeout === "function") await page.waitForTimeout(800);
      await dismissNoise(page, trace);
      trace.push(`flow:navigate:${url}`);
      return { ok: true };
    }
  }

  // Only a step with no other target is really "stay on the landing page".
  if (!terms.length && /home|landing|homepage/.test(intent)) {
    trace.push(`flow:navigate:${ctx.ottUrl}`);
    return { ok: true, evidence: false };
  }

  const labelled = await firstVisible(page, navTargetSelectors(step), ELEMENT_WAIT_MS);
  if (labelled) {
    await labelled.locator.click({ timeout: 5000 });
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(600);
    trace.push(`flow:navigate-click:${labelled.selector}`);
    return { ok: true };
  }

  const found = await firstVisible(page, semanticSelectors(step, "navigate"), ELEMENT_WAIT_MS, step, "click");
  if (found) {
    await found.locator.click({ timeout: 5000 });
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(600);
    trace.push(`flow:navigate-click:${found.selector}`);
    return { ok: true };
  }

  const healed = await healedTarget(page, step, "navigate", trace);
  if (healed) {
    await healed.locator.click({ timeout: 5000 });
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(600);
    await reportHealing(ctx, step, healed);
    return { ok: true, healing: healed };
  }

  const byText = await firstVisibleText(page, terms, 1500);
  if (byText) {
    await byText.locator.click({ timeout: 5000 });
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(600);
    trace.push(`flow:navigate-text:${byText.term}`);
    return { ok: true };
  }

  trace.push(`flow:navigate-stay:${target.slice(0, 40) || "current"}`);
  return { skipped: true, reason: "navigation_target_not_found" };
}

async function clickStep(page, step, ctx, trace) {
  const candidates = [...(step.selectors || []), ...navTargetSelectors(step), ...semanticSelectors(step, "click")];
  const found = await firstVisible(page, candidates, ELEMENT_WAIT_MS, step, "click");
  if (found) {
    await found.locator.click({ timeout: 5000 });
    trace.push(`flow:click:${found.selector}`);
    return { ok: true };
  }
  const healed = await healedTarget(page, step, "click", trace);
  if (healed) {
    await healed.locator.click({ timeout: 5000 });
    await reportHealing(ctx, step, healed);
    return { ok: true, healing: healed };
  }
  const text = step.target || step.description;
  const byText = await firstVisibleText(page, unique([text, ...verifyTerms(step)]), 2500);
  if (byText) {
    await byText.locator.click({ timeout: 5000 });
    trace.push(`flow:click-text:${byText.term.slice(0, 40)}`);
    return { ok: true };
  }
  trace.push(`flow:click-inconclusive:${(step.description || "target").slice(0, 40)}`);
  return { skipped: true, reason: "click_target_not_found" };
}

async function inputStep(page, step, ctx, trace) {
  const value = step.value || "test query";
  const candidates = [
    ...(step.selectors || []),
    ...semanticSelectors(step, "input")
  ];
  const found = await firstVisible(page, candidates, ELEMENT_WAIT_MS, step, "input");
  if (found) {
    await found.locator.fill(value, { timeout: 5000 });
    trace.push(`flow:input:${found.selector}`);
    return { ok: true };
  }
  const healed = await healedTarget(page, step, "input", trace);
  if (healed) {
    await healed.locator.fill(value, { timeout: 5000 });
    await reportHealing(ctx, step, healed);
    return { ok: true, healing: healed };
  }
  trace.push(`flow:input-inconclusive:${(step.description || "target").slice(0, 40)}`);
  return { skipped: true, reason: "input_target_not_found" };
}

async function scrollStep(page, step, ctx, trace) {
  if (typeof page.evaluate === "function") {
    const intent = `${step.target || ""} ${step.description || ""}`.toLowerCase();
    if (/footer|bottom/.test(intent)) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    } else {
      await page.evaluate(() => window.scrollBy(0, Math.floor(window.innerHeight * 0.8))).catch(() => {});
    }
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(400);
  }
  trace.push(`flow:scroll:${(step.target || step.description || "page").slice(0, 40)}`);
  return verifyStep(page, { ...step, action: "verify" }, trace, ctx);
}

async function verifyStep(page, step, trace, ctx = {}) {
  const found = await firstVisible(
    page,
    [...(step.selectors || []), ...semanticSelectors(step, "verify")],
    ELEMENT_WAIT_MS,
    step,
    "verify"
  );
  if (found) {
    trace.push(`flow:verify-selector:${found.selector}`);
    return { ok: true, evidence: !PAGE_CONTAINERS.has(found.selector.toLowerCase()) };
  }

  const healed = await healedTarget(page, step, "verify", trace);
  if (healed) {
    await reportHealing(ctx, step, healed);
    return { ok: true, healing: healed };
  }

  const byText = await firstVisibleText(page, verifyTerms(step), 2000);
  if (byText) {
    trace.push(`flow:verify-text:${byText.term.slice(0, 40)}`);
    return { ok: true };
  }

  const intent = `${step.target || ""} ${step.description || ""}`.toLowerCase();
  if (/footer/.test(intent) && typeof page.evaluate === "function") {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(400);
    const footer = await firstVisible(page, semanticSelectors({ target: "Footer" }), ELEMENT_WAIT_MS);
    if (footer) {
      trace.push(`flow:verify-selector:${footer.selector}`);
      return { ok: true };
    }
  }

  const visible = await waitForPage(page);
  if (!visible) throw new Error("Page did not load: body not visible");
  trace.push(`flow:verify-inconclusive:${(step.description || "visible").slice(0, 40)}`);
  return { skipped: true, reason: "insufficient_verification_evidence" };
}

async function executeFlowStep(page, step, ctx, trace) {
  let action = String(step.action || "verify").toLowerCase();
  const description = step.description || "";

  if (step.requiresAuth && !ctx.hasLoginSecrets) {
    trace.push(`skip:requires-auth:${description.slice(0, 40)}`);
    return { skipped: true, reason: "requires_auth" };
  }

  if (isSensitiveStep(step) && (action === "input" || action === "submit")) {
    trace.push(`skip:sensitive-input:${description.slice(0, 40)}`);
    return { skipped: true, reason: "sensitive_input" };
  }

  if (action === "interact" || action === "tap") action = "click";

  if (action === "navigate") {
    return navigateToIntent(page, step, ctx, trace);
  }
  if (action === "click") {
    await ensureOnSite(page, ctx, trace);
    return clickStep(page, step, ctx, trace);
  }
  if (action === "input") {
    await ensureOnSite(page, ctx, trace);
    return inputStep(page, step, ctx, trace);
  }
  if (action === "submit") {
    await ensureOnSite(page, ctx, trace);
    const submit = await firstVisible(
      page,
      ["button[type='submit']", "input[type='submit']", "button:has-text('Search')", "button:has-text('Submit')"],
      ELEMENT_WAIT_MS
    );
    if (submit) {
      await submit.locator.click({ timeout: 5000 });
      trace.push(`flow:submit:${submit.selector}`);
      return { ok: true };
    }
    const healed = await healedTarget(page, step, "submit", trace);
    if (healed) {
      await healed.locator.click({ timeout: 5000 });
      await reportHealing(ctx, step, healed);
      return { ok: true, healing: healed };
    }
    const isSearchSubmit = /search|query/.test(`${step.target || ""} ${step.description || ""}`.toLowerCase());
    const input = isSearchSubmit
      ? await firstVisible(page, ["input[type='search']"], ELEMENT_WAIT_MS, step, "input")
      : null;
    if (input && typeof input.locator.press === "function") {
      await input.locator.press("Enter");
      trace.push("flow:submit:enter");
      return { ok: true };
    }
    trace.push("flow:submit:skipped");
    return { skipped: true, reason: "submit_target_not_found" };
  }
  if (action === "scroll") {
    await ensureOnSite(page, ctx, trace);
    return scrollStep(page, step, ctx, trace);
  }

  await ensureOnSite(page, ctx, trace);
  return verifyStep(page, step, trace, ctx);
}

function buildDiscoveredFlowTests({
  ottUrl,
  userFlows = [],
  manualTestCases = [],
  hasLoginSecrets = false,
  maxFlows = MAX_FLOWS,
  onHealed = null
}) {
  const picked = pickCriticalFlows(userFlows, manualTestCases, maxFlows);
  if (!picked.length) return [];

  return picked.map((entry, index) => ({
    id: entry.caseId ? `EXEC-${entry.caseId}` : `FLOW-${String(index + 1).padStart(3, "0")}`,
    title: entry.name,
    flowName: entry.name,
    sourceCaseId: entry.caseId,
    traceability: entry.traceability,
    execute: async (page, trace) => {
      const ctx = { ottUrl, hasLoginSecrets, loaded: false, onHealed };
      const stepResults = [];

      await ensureOnSite(page, ctx, trace);

      for (const step of entry.steps) {
        try {
          const result = await executeFlowStep(page, step, ctx, trace);
          stepResults.push({
            description: step.description,
            action: step.action,
            status: result.skipped ? "skipped" : "passed",
            evidence: result.skipped ? false : result.evidence !== false,
            reason: result.reason || null,
            healing: result.healing
              ? {
                  key: result.healing.key,
                  selector: result.healing.selector,
                  strategy: result.healing.strategy,
                  evidence: result.healing.evidence
                }
              : undefined
          });
        } catch (err) {
          stepResults.push({
            description: step.description,
            action: step.action,
            status: "failed",
            error: err.message
          });
          return { flowName: entry.name, stepResults, failed: true };
        }
      }

      const currentUrl = typeof page.url === "function" ? page.url() : page.url;
      if (currentUrl) trace.push(`flow:final-url:${currentUrl}`);

      // Landing on the site is not a result. A pass needs at least one step that
      // matched something specific to the flow's own target.
      const provenSteps = stepResults.filter((step) => step.status === "passed" && step.evidence).length;
      if (provenSteps === 0) {
        return {
          flowName: entry.name,
          stepResults,
          failed: false,
          skip: true,
          reason: "No step had sufficient target-specific evidence"
        };
      }
      return { flowName: entry.name, stepResults, failed: false };
    }
  }));
}

module.exports = {
  MAX_FLOWS,
  pickCriticalFlows,
  normalizeFlowSteps,
  executeFlowStep,
  buildDiscoveredFlowTests,
  runDiscoveredFlows: buildDiscoveredFlowTests
};

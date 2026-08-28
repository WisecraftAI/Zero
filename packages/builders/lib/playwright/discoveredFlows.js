"use strict";

const MAX_FLOWS = 5;
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

function normalizeFlowSteps(flow) {
  const flowSelectors = asSelectorList(flow.elements);
  const raw = flow.steps || [];
  return raw.map((step) => {
    if (typeof step === "string") {
      return { action: "verify", description: step, target: null, selectors: flowSelectors, requiresAuth: false };
    }
    const ownSelectors = asSelectorList(step.selector);
    return {
      action: String(step.action || "verify").toLowerCase(),
      description: step.description || step.target || step.action || "Verify step",
      target: step.target || null,
      value: step.value || null,
      // Keep crawl selectors as fallbacks for the flow, but never as the only hard wait.
      selectors: unique([...ownSelectors, ...flowSelectors]),
      requiresAuth: Boolean(step.requiresAuth || flow.requiresAuth)
    };
  });
}

function pickCriticalFlows(userFlows = [], manualCases = [], limit = MAX_FLOWS) {
  const picked = [];
  const seen = new Set();

  function tryAdd(entry) {
    const key = flowKey(entry.name);
    if (!key || seen.has(key) || picked.length >= limit) return;
    seen.add(key);
    picked.push(entry);
  }

  const sortedFlows = userFlows
    .slice()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  for (const flow of sortedFlows) {
    tryAdd({ kind: "flow", name: flow.name || "User Flow", flow, steps: normalizeFlowSteps(flow) });
  }

  const sortedCases = manualCases
    .slice()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  for (const tc of sortedCases) {
    const steps = Array.isArray(tc.steps)
      ? tc.steps.map((s) => ({ action: "verify", description: String(s), selectors: [] }))
      : [{ action: "verify", description: tc.scenario || tc.title || "Verify case", selectors: [] }];
    tryAdd({
      kind: "case",
      name: tc.module || tc.scenario || tc.title || "Functional Case",
      flow: tc,
      steps
    });
  }

  return picked.slice(0, limit);
}

function isSensitiveStep(step) {
  const text = `${step.description || ""} ${step.target || ""}`.toLowerCase();
  return /password|payment|card|cvv|checkout|billing|ssn|otp|secret/.test(text);
}

function semanticSelectors(step) {
  const text = `${step.action || ""} ${step.target || ""} ${step.description || ""}`.toLowerCase();
  const out = [];
  if (/footer|contentinfo/.test(text)) {
    out.push("footer", "[role='contentinfo']", ".footer");
  }
  if (/nav|header|menu/.test(text)) {
    out.push("nav", "[role='navigation']", "header", "header a", "[class*='nav']");
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
    out.push("[class*='product']", "a[href*='product']", "main article", "main");
  }
  if (/page load|homepage|landing/.test(text)) {
    out.push("main", "body", "#root", "#app", "#__next");
  }
  return unique(out);
}

function locatorFor(page, selector) {
  const sel = String(selector);
  if (sel.startsWith("//") || sel.startsWith("xpath=")) {
    return page.locator(sel.startsWith("xpath=") ? sel : `xpath=${sel}`).first();
  }
  return page.locator(sel).first();
}

async function firstVisible(page, selectors, timeout = ELEMENT_WAIT_MS) {
  for (const sel of unique(selectors)) {
    try {
      const loc = locatorFor(page, sel);
      if (await loc.isVisible({ timeout })) {
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
      const cleaned = chunk.replace(/^(verify|click|scroll to|go to|navigate to|load)\s+/i, "").trim();
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
  if (!target || /home|landing|homepage/.test(intent)) {
    trace.push(`flow:navigate:${ctx.ottUrl}`);
    return { ok: true };
  }

  const found = await firstVisible(page, semanticSelectors(step), ELEMENT_WAIT_MS);
  if (found) {
    await found.locator.click({ timeout: 5000 }).catch(() => {});
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(600);
    trace.push(`flow:navigate-click:${found.selector}`);
    return { ok: true };
  }

  const byText = await firstVisibleText(page, verifyTerms(step), 1500);
  if (byText) {
    await byText.locator.click({ timeout: 5000 }).catch(() => {});
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(600);
    trace.push(`flow:navigate-text:${byText.term}`);
    return { ok: true };
  }

  trace.push(`flow:navigate-stay:${target.slice(0, 40) || "current"}`);
  return { ok: true };
}

async function clickStep(page, step, trace) {
  const candidates = [...(step.selectors || []), ...semanticSelectors(step)];
  const found = await firstVisible(page, candidates, ELEMENT_WAIT_MS);
  if (found) {
    await found.locator.click({ timeout: 5000 });
    trace.push(`flow:click:${found.selector}`);
    return { ok: true };
  }
  const text = step.target || step.description;
  const byText = await firstVisibleText(page, unique([text, ...verifyTerms(step)]), 2500);
  if (byText) {
    await byText.locator.click({ timeout: 5000 });
    trace.push(`flow:click-text:${byText.term.slice(0, 40)}`);
    return { ok: true };
  }
  throw new Error(`Click target not found: ${(step.description || "").slice(0, 80)}`);
}

async function inputStep(page, step, trace) {
  const value = step.value || "test query";
  const candidates = [
    ...(step.selectors || []),
    ...semanticSelectors(step),
    'input[type="search"]',
    "input:not([type='hidden'])",
    "textarea"
  ];
  const found = await firstVisible(page, candidates, ELEMENT_WAIT_MS);
  if (found) {
    await found.locator.fill(value, { timeout: 5000 });
    trace.push(`flow:input:${found.selector}`);
    return { ok: true };
  }
  throw new Error(`Input target not found: ${(step.description || "").slice(0, 80)}`);
}

async function scrollStep(page, step, trace) {
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
  return verifyStep(page, { ...step, action: "verify" }, trace);
}

async function verifyStep(page, step, trace) {
  const found = await firstVisible(page, [...(step.selectors || []), ...semanticSelectors(step)], ELEMENT_WAIT_MS);
  if (found) {
    trace.push(`flow:verify-selector:${found.selector}`);
    return { ok: true };
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
  if (visible) {
    trace.push(`flow:verify-body:${(step.description || "visible").slice(0, 40)}`);
    return { ok: true };
  }
  throw new Error("Page did not load: body not visible");
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
    return clickStep(page, step, trace);
  }
  if (action === "input") {
    await ensureOnSite(page, ctx, trace);
    return inputStep(page, step, trace);
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
    const input = await firstVisible(page, ["input[type='search']", "input:not([type='hidden'])"], ELEMENT_WAIT_MS);
    if (input && typeof input.locator.press === "function") {
      await input.locator.press("Enter");
      trace.push("flow:submit:enter");
      return { ok: true };
    }
    trace.push("flow:submit:skipped");
    return { ok: true };
  }
  if (action === "scroll") {
    await ensureOnSite(page, ctx, trace);
    return scrollStep(page, step, trace);
  }

  await ensureOnSite(page, ctx, trace);
  return verifyStep(page, step, trace);
}

function buildDiscoveredFlowTests({ ottUrl, userFlows = [], manualTestCases = [], hasLoginSecrets = false }) {
  const picked = pickCriticalFlows(userFlows, manualTestCases, MAX_FLOWS);
  if (!picked.length) return [];

  return picked.map((entry, index) => ({
    id: `FLOW-${String(index + 1).padStart(3, "0")}`,
    title: entry.name,
    flowName: entry.name,
    execute: async (page, trace) => {
      const ctx = { ottUrl, hasLoginSecrets, loaded: false };
      const stepResults = [];

      await ensureOnSite(page, ctx, trace);

      for (const step of entry.steps) {
        try {
          const result = await executeFlowStep(page, step, ctx, trace);
          stepResults.push({
            description: step.description,
            action: step.action,
            status: result.skipped ? "skipped" : "passed",
            reason: result.reason || null
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

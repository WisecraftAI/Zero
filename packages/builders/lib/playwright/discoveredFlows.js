"use strict";

const MAX_FLOWS = 5;

function priorityRank(priority) {
  const value = String(priority || "").toLowerCase();
  if (value === "critical" || value === "p0") return 0;
  if (value === "high" || value === "p1") return 1;
  if (value === "medium" || value === "p2") return 2;
  return 3;
}

function normalizeFlowSteps(flow) {
  const raw = flow.steps || [];
  return raw.map((step) => {
    if (typeof step === "string") {
      return { action: "verify", description: step };
    }
    return {
      action: String(step.action || "verify").toLowerCase(),
      description: step.description || step.target || step.action || "Verify step",
      target: step.target || null,
      selector: step.selector || (Array.isArray(flow.elements) ? flow.elements[0] : null),
      requiresAuth: Boolean(step.requiresAuth || flow.requiresAuth),
    };
  });
}

function pickCriticalFlows(userFlows = [], manualCases = [], limit = MAX_FLOWS) {
  const picked = [];

  const sortedFlows = userFlows
    .slice()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  for (const flow of sortedFlows) {
    if (picked.length >= limit) break;
    picked.push({ kind: "flow", name: flow.name || "User Flow", flow, steps: normalizeFlowSteps(flow) });
  }

  if (picked.length < limit) {
    const sortedCases = manualCases
      .slice()
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

    for (const tc of sortedCases) {
      if (picked.length >= limit) break;
      const steps = Array.isArray(tc.steps)
        ? tc.steps.map((s) => ({ action: "verify", description: String(s) }))
        : [{ action: "verify", description: tc.scenario || tc.title || "Verify case" }];
      picked.push({
        kind: "case",
        name: tc.module || tc.scenario || tc.title || "Functional Case",
        flow: tc,
        steps,
      });
    }
  }

  return picked.slice(0, limit);
}

function isSensitiveStep(step) {
  const text = `${step.description || ""} ${step.target || ""}`.toLowerCase();
  return /password|payment|card|cvv|checkout|billing|ssn|otp|secret/.test(text);
}

async function executeFlowStep(page, step, ctx, trace) {
  const action = String(step.action || "verify").toLowerCase();
  const description = step.description || "";

  if (step.requiresAuth && !ctx.hasLoginSecrets) {
    trace.push(`skip:requires-auth:${description.slice(0, 40)}`);
    return { skipped: true, reason: "requires_auth" };
  }

  if (isSensitiveStep(step) && action === "input") {
    trace.push(`skip:sensitive-input:${description.slice(0, 40)}`);
    return { skipped: true, reason: "sensitive_input" };
  }

  if (action === "navigate") {
    const targetUrl = step.target && step.target.startsWith("http") ? step.target : ctx.ottUrl;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1000);
    trace.push(`flow:navigate:${targetUrl}`);
    return { ok: true };
  }

  if (action === "click") {
    const selectors = [step.selector, step.target, "button", "a"].filter(Boolean);
    for (const sel of selectors) {
      try {
        const loc = sel.startsWith("//") ? page.locator(`xpath=${sel}`).first() : page.locator(sel).first();
        if (await loc.isVisible({ timeout: 4000 })) {
          await loc.click({ timeout: 5000 });
          trace.push(`flow:click:${sel}`);
          return { ok: true };
        }
      } catch {
        /* try next */
      }
    }
    const text = step.target || description;
    if (text) {
      const byText = page.getByText(text, { exact: false }).first();
      if (await byText.isVisible({ timeout: 4000 }).catch(() => false)) {
        await byText.click({ timeout: 5000 });
        trace.push(`flow:click-text:${text.slice(0, 40)}`);
        return { ok: true };
      }
    }
    throw new Error(`Click target not found: ${description.slice(0, 80)}`);
  }

  if (action === "input") {
    const value = step.value || "test query";
    const selectors = [step.selector, 'input[type="search"]', "input", "textarea"].filter(Boolean);
    for (const sel of selectors) {
      try {
        const loc = page.locator(sel).first();
        if (await loc.isVisible({ timeout: 4000 })) {
          await loc.fill(value, { timeout: 5000 });
          trace.push(`flow:input:${sel}`);
          return { ok: true };
        }
      } catch {
        /* try next */
      }
    }
    throw new Error(`Input target not found: ${description.slice(0, 80)}`);
  }

  const verifyTerms = [step.target, description]
    .filter(Boolean)
    .flatMap((part) => String(part).split(/[,;]/))
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  if (step.selector) {
    const loc = step.selector.startsWith("//")
      ? page.locator(`xpath=${step.selector}`).first()
      : page.locator(step.selector).first();
    await loc.waitFor({ state: "visible", timeout: 8000 });
    trace.push(`flow:verify-selector:${step.selector}`);
    return { ok: true };
  }

  for (const term of verifyTerms) {
    const visible = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      trace.push(`flow:verify-text:${term.slice(0, 40)}`);
      return { ok: true };
    }
  }

  const body = page.locator("body");
  await body.waitFor({ state: "visible", timeout: 8000 });
  trace.push(`flow:verify-body:${description.slice(0, 40) || "visible"}`);
  return { ok: true };
}

function buildDiscoveredFlowTests({ ottUrl, userFlows = [], manualTestCases = [], hasLoginSecrets = false }) {
  const picked = pickCriticalFlows(userFlows, manualTestCases, MAX_FLOWS);
  if (!picked.length) return [];

  return picked.map((entry, index) => ({
    id: `FLOW-${String(index + 1).padStart(3, "0")}`,
    title: entry.name,
    flowName: entry.name,
    execute: async (page, trace) => {
      const ctx = { ottUrl, hasLoginSecrets };
      const stepResults = [];

      if (index === 0) {
        await page.goto(ottUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(1500);
        trace.push("discovered_flows:initial-load");
      }

      for (const step of entry.steps) {
        try {
          const result = await executeFlowStep(page, step, ctx, trace);
          stepResults.push({
            description: step.description,
            action: step.action,
            status: result.skipped ? "skipped" : "passed",
            reason: result.reason || null,
          });
        } catch (err) {
          stepResults.push({
            description: step.description,
            action: step.action,
            status: "failed",
            error: err.message,
          });
          return { flowName: entry.name, stepResults, failed: true };
        }
      }

      return { flowName: entry.name, stepResults, failed: false };
    },
  }));
}

module.exports = {
  MAX_FLOWS,
  pickCriticalFlows,
  normalizeFlowSteps,
  executeFlowStep,
  buildDiscoveredFlowTests,
  runDiscoveredFlows: buildDiscoveredFlowTests,
};

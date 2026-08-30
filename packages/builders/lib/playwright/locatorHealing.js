"use strict";

// A lone generic noun matches something on nearly every page, so it can never
// stand in for the flow's own target: healing on "user" or "product" would let
// every flow prove itself against the landing page.
const STOP_WORDS = new Set([
  "action", "and", "button", "click", "complete", "component", "content",
  "detail", "details", "each", "element", "enter", "entry", "feature", "field",
  "flow", "functionality", "item", "link", "main", "open", "page", "point",
  "primary", "product", "screen", "section", "select", "should", "site",
  "submit", "test", "that", "the", "then", "type", "user", "verify", "view",
  "with", "works"
]);

function healingEnabled(env = process.env) {
  return !["0", "false", "off", "no"].includes(
    String(env.ZERO_LOCATOR_HEALING || "on").trim().toLowerCase()
  );
}

function intentText(step) {
  return `${step?.target || ""} ${step?.description || ""}`.trim();
}

function intentTerms(step) {
  const text = intentText(step);
  const phrases = [step?.target, step?.description]
    .filter(Boolean)
    .map((value) => String(value).replace(/^(click|enter|fill|open|select|submit|verify)\s+/i, "").trim())
    .filter((value) => value.length >= 3 && value.length <= 60);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  return [...new Set([...phrases, ...words])].slice(0, 4);
}

function healingKeyForStep(step, action = step?.action) {
  const text = intentText(step).toLowerCase();
  if (/search|query/.test(text)) return String(action).toLowerCase() === "input" ? "searchInput" : "searchSubmit";
  if (/email|username|user name/.test(text)) return "loginUserField";
  if (/password/.test(text)) return "loginPasswordField";
  if (/login|log in|sign in/.test(text)) return "loginCta";
  if (/play|watch|resume/.test(text)) return "playCta";
  if (/pause/.test(text)) return "pauseCta";
  if (/cart|basket|bag/.test(text)) return "cartCta";
  if (/product|content|movie|episode|card/.test(text)) return "contentCard";
  if (/nav|menu|header/.test(text)) return "primaryNav";
  if (/footer/.test(text)) return "footer";
  return "custom";
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function stableSelector(locator) {
  if (!locator || typeof locator.evaluate !== "function") return null;
  return locator.evaluate((element) => {
    const escape = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const tag = element.tagName.toLowerCase();
    const testId = element.getAttribute("data-testid") || element.getAttribute("data-test");
    if (testId) return `[data-testid="${escape(testId)}"]`;
    if (element.id) return `#${CSS.escape(element.id)}`;
    const name = element.getAttribute("name");
    if (name) return `${tag}[name="${escape(name)}"]`;
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) return `${tag}[aria-label="${escape(ariaLabel)}"]`;
    const placeholder = element.getAttribute("placeholder");
    if (placeholder) return `${tag}[placeholder="${escape(placeholder)}"]`;
    const role = element.getAttribute("role");
    if (role) return `${tag}[role="${escape(role)}"]`;
    return null;
  }).catch(() => null);
}

function candidateLocators(page, step, action) {
  const terms = intentTerms(step);
  const candidates = [];
  const normalizedAction = String(action || step?.action || "verify").toLowerCase();

  for (const term of terms) {
    const name = new RegExp(escapeRegExp(term), "i");
    if (normalizedAction === "input") {
      if (typeof page.getByRole === "function") candidates.push({ locator: page.getByRole("textbox", { name }), signal: `textbox:${term}` });
      if (typeof page.getByLabel === "function") candidates.push({ locator: page.getByLabel(name), signal: `label:${term}` });
      if (typeof page.getByPlaceholder === "function") candidates.push({ locator: page.getByPlaceholder(name), signal: `placeholder:${term}` });
    } else if (normalizedAction === "click" || normalizedAction === "submit" || normalizedAction === "navigate") {
      if (typeof page.getByRole === "function") {
        for (const role of ["button", "link", "menuitem"]) {
          candidates.push({ locator: page.getByRole(role, { name }), signal: `${role}:${term}` });
        }
      }
    } else {
      if (typeof page.getByRole === "function") {
        for (const role of ["heading", "link", "button", "status"]) {
          candidates.push({ locator: page.getByRole(role, { name }), signal: `${role}:${term}` });
        }
      }
      if (typeof page.getByText === "function") candidates.push({ locator: page.getByText(term, { exact: false }), signal: `text:${term}` });
    }
  }
  return candidates;
}

async function healLocator(page, step, action, { timeout = 500, env = process.env } = {}) {
  if (!healingEnabled(env)) return null;
  const normalizedAction = String(action || step?.action || "verify").toLowerCase();
  if (
    normalizedAction === "input" &&
    /password|payment|card|cvv|billing|ssn|otp|secret/i.test(intentText(step))
  ) {
    return null;
  }

  for (const candidate of candidateLocators(page, step, normalizedAction)) {
    try {
      const locator = candidate.locator.first();
      if (!(await locator.isVisible({ timeout }))) continue;
      const selector = await stableSelector(locator);
      return {
        locator,
        selector,
        key: healingKeyForStep(step, normalizedAction),
        strategy: "accessible-intent",
        evidence: candidate.signal
      };
    } catch {
      // Candidate did not exist, was ambiguous, or detached while being inspected.
    }
  }
  return null;
}

module.exports = {
  healingEnabled,
  intentTerms,
  healingKeyForStep,
  stableSelector,
  healLocator
};

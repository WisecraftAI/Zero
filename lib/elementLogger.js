/**
 * Element logger: parse element log payloads (from DOM analysis or AI) and store locators in DB.
 * Used so the framework can build scripts from captured elements.
 */

const db = require("./db");

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const ELEMENT_KEYS = [
  "primaryNav",
  "continueCta",
  "loginCta",
  "loginUserField",
  "loginPasswordField",
  "loginSubmit",
  "contentCard",
  "playCta",
  "pauseCta",
  "seekBar",
  "searchInput",
  "myListCta",
  "profileCta"
];

function normalizeElementKey(labelOrKey) {
  const s = String(labelOrKey || "").toLowerCase().replace(/\s+/g, "");
  const map = {
    nav: "primaryNav",
    primarynav: "primaryNav",
    continue: "continueCta",
    continuecta: "continueCta",
    login: "loginCta",
    logincta: "loginCta",
    email: "loginUserField",
    user: "loginUserField",
    loginuserfield: "loginUserField",
    password: "loginPasswordField",
    loginpasswordfield: "loginPasswordField",
    submit: "loginSubmit",
    loginsubmit: "loginSubmit",
    card: "contentCard",
    contentcard: "contentCard",
    play: "playCta",
    playcta: "playCta",
    pause: "pauseCta",
    seek: "seekBar",
    seekbar: "seekBar",
    search: "searchInput",
    mylist: "myListCta",
    profile: "profileCta"
  };
  return map[s] || (ELEMENT_KEYS.includes(s) ? s : null) || "custom";
}

/**
 * Process a single element entry from log.
 * Expected shape: { key?, label?, selector?, xpath?, role?, tag?, text? }
 */
function parseElementEntry(entry) {
  const key = normalizeElementKey(entry.key || entry.label);
  const selector = entry.selector || entry.css || entry.selectorValue;
  const xpath = entry.xpath || null;
  const role = entry.role || entry.ariaRole || null;
  const label = entry.label || entry.text || entry.ariaLabel || null;
  if (!selector && !xpath) return null;
  return {
    elementKey: key,
    selectorType: entry.selectorType || (selector && selector.startsWith("//") ? "xpath" : "css"),
    selectorValue: xpath || selector,
    xpath: xpath || null,
    role,
    label
  };
}

/**
 * Process full element log payload and upsert locators into DB.
 * Payload can be: { url, elements: [...] } or { url, snapshot: { elements: [...] } }
 */
async function processElementLog(pool, payload, runId = null) {
  if (!pool) return { ok: false, error: "Database not configured" };

  const url = payload.url || payload.pageUrl || "";
  const host = hostFromUrl(url);
  if (!host) return { ok: false, error: "Invalid or missing url" };

  let elements = payload.elements || (payload.snapshot && payload.snapshot.elements) || [];
  if (Array.isArray(elements) === false) elements = [];

  const inserted = [];
  for (const entry of elements) {
    const parsed = parseElementEntry(entry);
    if (!parsed) continue;
    await db.upsertLocator(pool, {
      host,
      elementKey: parsed.elementKey,
      selectorType: parsed.selectorType,
      selectorValue: parsed.selectorValue,
      xpath: parsed.xpath,
      role: parsed.role,
      label: parsed.label,
      runId
    });
    inserted.push(parsed.elementKey);
  }

  await db.insertElementLog(pool, {
    runId,
    host,
    url,
    snapshotJson: { url, elements: payload.elements || (payload.snapshot && payload.snapshot.elements) || [] }
  });

  return { ok: true, host, count: inserted.length, keys: [...new Set(inserted)] };
}

module.exports = {
  hostFromUrl,
  normalizeElementKey,
  parseElementEntry,
  processElementLog,
  ELEMENT_KEYS
};

"use strict";

const SKIP_PATH_RE =
  /\/(logout|log-out|signout|sign-out|sign_out|account\/logout|auth\/logout)(\/|$|\?)/i;
const SKIP_HREF_RE = /^(javascript:|mailto:|tel:|#|$)/i;
const FILE_EXT_RE = /\.(pdf|zip|png|jpe?g|gif|svg|webp|mp4|mp3|docx?|xlsx?)(\?|$)/i;

/**
 * Normalize a href against the crawl origin (same-site absolute URL, no hash).
 */
function normalizeCrawlUrl(href, baseUrl) {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed || SKIP_HREF_RE.test(trimmed)) return null;

  try {
    const base = new URL(baseUrl);
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    if (resolved.origin !== base.origin) return null;
    resolved.hash = "";
    let path = resolved.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    resolved.pathname = path;
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Whether a link should be excluded from crawl expansion.
 */
function shouldSkipCrawlTarget(url, linkText = "") {
  if (!url) return true;
  const lower = url.toLowerCase();
  const text = String(linkText || "").toLowerCase();
  if (SKIP_PATH_RE.test(lower)) return true;
  if (FILE_EXT_RE.test(lower)) return true;
  if (/\b(log\s?out|sign\s?out)\b/.test(text)) return true;
  return false;
}

/**
 * Score links — prefer header/nav anchors over footer/social noise.
 */
function scoreLink(raw) {
  let score = 0;
  const text = (raw.text || "").trim();
  if (text.length >= 2 && text.length <= 60) score += 2;
  if (raw.inNav) score += 5;
  if (raw.inHeader) score += 4;
  if (raw.inFooter) score += 1;
  if (raw.inMain) score += 3;
  if (/cart|checkout|login|sign-in|register|shop|product|pricing|contact|about/i.test(text)) {
    score += 2;
  }
  return score;
}

/**
 * Pure: normalize and dedupe raw DOM link rows for BFS queue seeding.
 */
function parseRawLinks(rawLinks, pageUrl, options = {}) {
  const origin = options.origin || new URL(pageUrl).origin;
  const seen = new Set();
  const out = [];

  for (const raw of rawLinks || []) {
    const normalized = normalizeCrawlUrl(raw.href, pageUrl);
    if (!normalized || seen.has(normalized)) continue;
    if (shouldSkipCrawlTarget(normalized, raw.text)) continue;
    seen.add(normalized);
    out.push({
      url: normalized,
      text: (raw.text || "").trim().slice(0, 120),
      score: scoreLink(raw),
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

async function readLinksFromDom(page) {
  return page.evaluate(() => {
    const rows = [];
    const seen = new Set();

    function inRegion(node, selectors) {
      let cur = node;
      while (cur && cur !== document.body) {
        for (const sel of selectors) {
          try {
            if (cur.matches && cur.matches(sel)) return true;
          } catch {
            /* ignore invalid selector */
          }
        }
        cur = cur.parentElement;
      }
      return false;
    }

    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      const text = (a.innerText || a.textContent || "").trim();
      const key = `${href}::${text.slice(0, 40)}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        href: a.href || href,
        text,
        inNav: inRegion(a, ["nav", '[role="navigation"]']),
        inHeader: inRegion(a, ["header", '[role="banner"]']),
        inFooter: inRegion(a, ["footer", '[role="contentinfo"]']),
        inMain: inRegion(a, ["main", '[role="main"]', "#main", ".main-content"]),
      });
    });

    return rows;
  });
}

async function readPageSummaryFromDom(page) {
  return page.evaluate(() => {
    const navLabels = [];
    document
      .querySelectorAll('nav a[href], header a[href], [role="navigation"] a[href]')
      .forEach((a, i) => {
        if (i >= 20) return;
        const text = (a.innerText || a.textContent || "").trim();
        if (text.length >= 2 && text.length <= 80) navLabels.push(text);
      });

    return {
      formCount: document.querySelectorAll("form").length,
      elementCounts: {
        NAVIGATION: document.querySelectorAll('nav, [role="navigation"]').length,
        LINKS: document.querySelectorAll('a[href]:not([href^="#"])').length,
        BUTTONS: document.querySelectorAll("button, [role=\"button\"]").length,
        FORMS: document.querySelectorAll("form").length,
        INPUTS: document.querySelectorAll("input:not([type=\"hidden\"]), textarea, select").length,
      },
      navLabels: [...new Set(navLabels)].slice(0, 15),
    };
  });
}

/**
 * BFS crawl of same-origin pages from startUrl.
 * @returns {{ pages: Array, errors: string[] }}
 */
async function crawlLinkedPages(page, startUrl, options = {}) {
  const maxPages = Math.max(1, Number(options.maxPages ?? 8));
  const maxDepth = Math.max(0, Number(options.maxDepth ?? 2));
  const gotoTimeout = Number(options.gotoTimeout ?? 20000);
  const waitMs = Number(options.waitAfterGoto ?? 800);

  const origin = new URL(startUrl).origin;
  const startNormalized = normalizeCrawlUrl(startUrl, startUrl) || startUrl;

  const visited = new Set();
  const queue = [{ url: startNormalized, depth: 0 }];
  const pages = [];
  const errors = [];

  while (queue.length > 0 && pages.length < maxPages) {
    queue.sort((a, b) => (b.score || 0) - (a.score || 0));
    const next = queue.shift();
    if (!next || visited.has(next.url)) continue;
    visited.add(next.url);

    try {
      await page.goto(next.url, { waitUntil: "domcontentloaded", timeout: gotoTimeout });
      if (waitMs > 0) await page.waitForTimeout(waitMs);

      const title = await page.title().catch(() => "");
      const summary = await readPageSummaryFromDom(page).catch(() => ({
        formCount: 0,
        elementCounts: {},
        navLabels: [],
      }));

      let pathname = "/";
      try {
        pathname = new URL(next.url).pathname || "/";
      } catch {
        /* keep default */
      }

      pages.push({
        url: next.url,
        title: title.slice(0, 200),
        path: pathname,
        depth: next.depth,
        formCount: summary.formCount,
        elementCounts: summary.elementCounts,
        navLabels: summary.navLabels,
      });

      if (next.depth >= maxDepth) continue;

      const rawLinks = await readLinksFromDom(page).catch(() => []);
      const parsed = parseRawLinks(rawLinks, next.url, { origin });

      for (const link of parsed) {
        if (visited.has(link.url)) continue;
        if (queue.some((q) => q.url === link.url)) continue;
        queue.push({ url: link.url, depth: next.depth + 1, score: link.score, text: link.text });
      }
    } catch (err) {
      errors.push(`${next.url}: ${err.message || String(err)}`);
    }
  }

  return { pages, errors };
}

function elementDedupeKey(el) {
  if (el.id) return `id:${el.id}`;
  if (el.dataTestId) return `testid:${el.dataTestId}`;
  if (el.selector) return `sel:${el.category}:${el.selector}`;
  return `txt:${el.category}:${(el.text || "").slice(0, 80)}:${(el.href || "").slice(0, 120)}`;
}

function mergeElements(existing, incoming, sourcePage) {
  const seen = new Set(existing.map(elementDedupeKey));
  const merged = [...existing];
  for (const el of incoming) {
    const key = elementDedupeKey(el);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(sourcePage ? { ...el, sourcePage } : el);
  }
  return merged;
}

module.exports = {
  normalizeCrawlUrl,
  shouldSkipCrawlTarget,
  parseRawLinks,
  crawlLinkedPages,
  mergeElements,
  elementDedupeKey,
  readLinksFromDom,
  readPageSummaryFromDom,
};

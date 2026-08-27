"use strict";

const SKIP_PATH_RE =
  /\/(logout|log-out|signout|sign-out|sign_out|account\/logout|auth\/logout)(\/|$|\?)/i;
const SKIP_HREF_RE = /^(javascript:|mailto:|tel:|#|$)/i;
const FILE_EXT_RE = /\.(pdf|zip|png|jpe?g|gif|svg|webp|mp4|mp3|docx?|xlsx?)(\?|$)/i;

/**
 * Two-label public suffixes, so `foo.co.uk` is not mistaken for the registrable
 * domain `co.uk`. Not exhaustive — covers the suffixes we actually meet.
 */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk",
  "co.in", "net.in", "org.in", "ac.in", "gov.in", "firm.in",
  "com.au", "net.au", "org.au", "gov.au", "co.nz", "org.nz",
  "com.br", "com.mx", "com.ar", "com.co", "com.pe",
  "com.sg", "com.my", "com.ph", "com.vn", "co.id", "co.th",
  "co.jp", "or.jp", "ne.jp", "co.kr", "com.cn", "com.hk", "com.tw",
  "co.za", "com.ng", "com.eg", "com.tr", "com.sa", "com.pk", "com.bd", "com.lk",
  "co.il", "com.ua",
]);

/**
 * Approximate registrable domain (eTLD+1) so that `foo.com`, `www.foo.com` and
 * `shop.foo.com` are recognised as one site.
 */
function registrableDomain(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host) return "";
  // IP literals and IPv6 brackets have no registrable domain — compare verbatim.
  if (host.includes(":") || /^\d+(\.\d+){3}$/.test(host)) return host;

  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");

  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

/** Whether two URLs belong to the same site for crawl purposes. */
function isSameSite(resolved, base, { allowSubdomains = true } = {}) {
  if (!allowSubdomains) return resolved.origin === base.origin;
  return registrableDomain(resolved.hostname) === registrableDomain(base.hostname);
}

/**
 * Normalize a href against the crawl base (same-site absolute URL, no hash).
 * Subdomains of the same registrable domain are in scope by default: sites
 * routinely redirect `foo.com` → `www.foo.com` and split sections across
 * `shop.`/`help.` hosts, and treating those as external collapsed every crawl
 * to a single page.
 */
function normalizeCrawlUrl(href, baseUrl, options = {}) {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed || SKIP_HREF_RE.test(trimmed)) return null;

  try {
    const base = new URL(baseUrl);
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    if (!isSameSite(resolved, base, options)) return null;
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

/** Sibling subdomains are in scope but usually off-topic (shop., careers.). */
const CROSS_HOST_PENALTY = 6;

/**
 * Score links — prefer header/nav anchors over footer/social noise, and prefer
 * the host we are already on over sibling subdomains.
 */
function scoreLink(raw, context = {}) {
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
  if (context.baseHost && context.linkHost && context.linkHost !== context.baseHost) {
    score -= CROSS_HOST_PENALTY;
  }
  return score;
}

function hostOf(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Pure: normalize and dedupe raw DOM link rows for BFS queue seeding.
 */
function parseRawLinks(rawLinks, pageUrl, options = {}) {
  const seen = new Set();
  const out = [];
  const baseHost = hostOf(pageUrl);

  for (const raw of rawLinks || []) {
    const normalized = normalizeCrawlUrl(raw.href, pageUrl, options);
    if (!normalized || seen.has(normalized)) continue;
    if (shouldSkipCrawlTarget(normalized, raw.text)) continue;
    seen.add(normalized);
    out.push({
      url: normalized,
      text: (raw.text || "").trim().slice(0, 120),
      score: scoreLink(raw, { baseHost, linkHost: hostOf(normalized) }),
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

    function pushLink(node, href) {
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      const text = (node.innerText || node.textContent || node.getAttribute("aria-label") || "").trim();
      const key = `${href}::${text.slice(0, 40)}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        href: node.href || href,
        text,
        inNav: inRegion(node, ["nav", '[role="navigation"]']),
        inHeader: inRegion(node, ["header", '[role="banner"]']),
        inFooter: inRegion(node, ["footer", '[role="contentinfo"]']),
        inMain: inRegion(node, ["main", '[role="main"]', "#main", ".main-content"]),
      });
    }

    document.querySelectorAll("a[href]").forEach((a) => {
      pushLink(a, a.getAttribute("href") || "");
    });
    document.querySelectorAll("[role='link'][href], [data-href], [data-url]").forEach((node) => {
      pushLink(node, node.getAttribute("href") || node.getAttribute("data-href") || node.getAttribute("data-url") || "");
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

  const allowSubdomains = options.allowSubdomains !== false;
  const linkOptions = { allowSubdomains };
  const startNormalized = normalizeCrawlUrl(startUrl, startUrl, linkOptions) || startUrl;

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
      if (typeof options.settle === "function") {
        await options.settle(page);
      } else if (waitMs > 0) {
        await page.waitForTimeout(waitMs);
      }

      // Resolve links against where the browser actually ended up. Using the
      // requested URL meant a `foo.com` → `www.foo.com` redirect made every link
      // on the landed page look cross-origin, capping the crawl at one page.
      const landedUrl = (typeof page.url === "function" && page.url()) || next.url;
      visited.add(landedUrl);

      const title = await page.title().catch(() => "");
      const summary = await readPageSummaryFromDom(page).catch(() => ({
        formCount: 0,
        elementCounts: {},
        navLabels: [],
      }));

      let pathname = "/";
      try {
        pathname = new URL(landedUrl).pathname || "/";
      } catch {
        /* keep default */
      }

      pages.push({
        url: landedUrl,
        requestedUrl: landedUrl === next.url ? undefined : next.url,
        title: title.slice(0, 200),
        path: pathname,
        depth: next.depth,
        formCount: summary.formCount,
        elementCounts: summary.elementCounts,
        navLabels: summary.navLabels,
      });

      if (next.depth >= maxDepth) continue;

      const rawLinks = await readLinksFromDom(page).catch(() => []);
      const parsed = parseRawLinks(rawLinks, landedUrl, linkOptions);

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
  registrableDomain,
  isSameSite,
  normalizeCrawlUrl,
  shouldSkipCrawlTarget,
  parseRawLinks,
  crawlLinkedPages,
  mergeElements,
  elementDedupeKey,
  readLinksFromDom,
  readPageSummaryFromDom,
};

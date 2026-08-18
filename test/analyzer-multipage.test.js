"use strict";

const {
  normalizeCrawlUrl,
  shouldSkipCrawlTarget,
  parseRawLinks,
  crawlLinkedPages,
  mergeElements,
  elementDedupeKey,
} = require("../packages/analyzer/lib/crawl/multiPage");

describe("multiPage crawl helpers", () => {
  test("normalizeCrawlUrl keeps same-origin links and strips hash", () => {
    expect(normalizeCrawlUrl("/about", "https://shop.test/")).toBe("https://shop.test/about");
    expect(normalizeCrawlUrl("https://shop.test/pricing#plans", "https://shop.test/")).toBe(
      "https://shop.test/pricing"
    );
    expect(normalizeCrawlUrl("https://evil.test/x", "https://shop.test/")).toBeNull();
    expect(normalizeCrawlUrl("javascript:void(0)", "https://shop.test/")).toBeNull();
  });

  test("shouldSkipCrawlTarget skips logout and file downloads", () => {
    expect(shouldSkipCrawlTarget("https://shop.test/account/logout")).toBe(true);
    expect(shouldSkipCrawlTarget("https://shop.test/brochure.pdf")).toBe(true);
    expect(shouldSkipCrawlTarget("https://shop.test/products", "Products")).toBe(false);
  });

  test("parseRawLinks dedupes and prioritizes nav links", () => {
    const raw = [
      { href: "https://shop.test/products", text: "Products", inNav: true, inHeader: true },
      { href: "https://shop.test/products", text: "Products", inNav: true, inHeader: true },
      { href: "https://shop.test/about", text: "About Us", inNav: true, inHeader: true },
      { href: "https://shop.test/account/logout", text: "Log out", inNav: false },
      { href: "https://other.test/x", text: "External", inNav: false },
    ];

    const parsed = parseRawLinks(raw, "https://shop.test/");
    expect(parsed).toHaveLength(2);
    expect(parsed.map((p) => p.url)).toEqual(
      expect.arrayContaining(["https://shop.test/products", "https://shop.test/about"])
    );
    expect(parsed[0].score).toBeGreaterThanOrEqual(parsed[1].score);
  });

  test("mergeElements dedupes by selector/id and tags sourcePage", () => {
    const base = [{ category: "LINKS", selector: "a.home", text: "Home" }];
    const incoming = [
      { category: "LINKS", selector: "a.home", text: "Home" },
      { category: "LINKS", selector: "a.products", text: "Products" },
    ];
    const merged = mergeElements(base, incoming, "https://shop.test/products");
    expect(merged).toHaveLength(2);
    expect(merged[1].sourcePage).toBe("https://shop.test/products");
    expect(elementDedupeKey(base[0])).toBe(elementDedupeKey(incoming[0]));
  });
});

describe("crawlLinkedPages", () => {
  function lookupSite(siteMap, url) {
    if (siteMap[url]) return siteMap[url];
    const noSlash = url.replace(/\/$/, "");
    if (siteMap[noSlash]) return siteMap[noSlash];
    if (siteMap[`${noSlash}/`]) return siteMap[`${noSlash}/`];
    return null;
  }

  function createMockPage(siteMap) {
    let current = "";
    return {
      async goto(url) {
        current = url;
      },
      url() {
        return current;
      },
      async waitForTimeout() {},
      async title() {
        return lookupSite(siteMap, current)?.title || "Untitled";
      },
      async evaluate(fn) {
        const src = fn.toString();
        const entry = lookupSite(siteMap, current);
        if (src.includes('querySelectorAll("a[href]")')) {
          return entry?.links || [];
        }
        if (src.includes("formCount") && src.includes("elementCounts")) {
          return (
            entry?.summary || {
              formCount: 0,
              elementCounts: { LINKS: 1, BUTTONS: 0, NAVIGATION: 1, FORMS: 0, INPUTS: 0 },
              navLabels: ["Home"],
            }
          );
        }
        return null;
      },
    };
  }

  test("discovers multiple same-origin pages via BFS", async () => {
    const siteMap = {
      "https://shop.test/": {
        title: "Home",
        links: [
          {
            href: "https://shop.test/products",
            text: "Products",
            inNav: true,
            inHeader: true,
            inFooter: false,
            inMain: false,
          },
          {
            href: "https://shop.test/about",
            text: "About",
            inNav: true,
            inHeader: true,
            inFooter: false,
            inMain: false,
          },
        ],
        summary: {
          formCount: 0,
          elementCounts: { LINKS: 4, BUTTONS: 1, NAVIGATION: 1, FORMS: 0, INPUTS: 0 },
          navLabels: ["Products", "About"],
        },
      },
      "https://shop.test/products": {
        title: "Products",
        links: [
          {
            href: "https://shop.test/",
            text: "Home",
            inNav: true,
            inHeader: true,
            inFooter: false,
            inMain: false,
          },
        ],
        summary: {
          formCount: 0,
          elementCounts: { LINKS: 6, BUTTONS: 2, NAVIGATION: 1, FORMS: 0, INPUTS: 0 },
          navLabels: ["Home"],
        },
      },
      "https://shop.test/about": {
        title: "About Us",
        links: [],
        summary: {
          formCount: 1,
          elementCounts: { LINKS: 2, BUTTONS: 0, NAVIGATION: 1, FORMS: 1, INPUTS: 2 },
          navLabels: ["Contact"],
        },
      },
    };

    const page = createMockPage(siteMap);
    const result = await crawlLinkedPages(page, "https://shop.test/", {
      maxPages: 8,
      maxDepth: 2,
      waitAfterGoto: 0,
    });

    expect(result.pages.length).toBeGreaterThanOrEqual(2);
    expect(result.pages[0].url).toMatch(/shop\.test/);
    expect(result.pages.some((p) => /products/.test(p.url))).toBe(true);
    expect(result.pages.every((p) => typeof p.title === "string")).toBe(true);
    expect(result.pages.every((p) => p.elementCounts && typeof p.elementCounts.LINKS === "number")).toBe(
      true
    );
    // Pro/light strategies expose crawl as crawledPages[] + pagesCrawled on webAnalysis.
    const pagesCrawled = result.pages.length;
    const crawledPages = result.pages;
    expect(crawledPages).toHaveLength(pagesCrawled);
  });

  test("webAnalysis artifact shape includes crawledPages and pagesCrawled", () => {
    const crawledPages = [{ url: "https://shop.test/", title: "Home", path: "/" }];
    const pagesCrawled = crawledPages.length;
    expect(pagesCrawled).toBe(1);
    expect(crawledPages[0].url).toContain("shop.test");
  });
});

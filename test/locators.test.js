"use strict";

const locators = require("@zero/locators");
const registry = require("@zero/locators/locatorRegistry");
const elementLogger = require("@zero/locators/elementLogger");
const ecommerce = require("@zero/locators/ecommerceSelectors");
const { hostFromUrl } = require("../packages/locators/lib/shared/url");
const { mergeSelectorCandidates, hydrateSelectorMemory } = require("../packages/locators/lib/merge/registry");
const { normalizeElementKey, parseElementEntry } = require("../packages/locators/lib/elements");

describe("@zero/locators public API", () => {
  it("keeps package and subpath entry points compatible", () => {
    expect(registry.mergeSelectorCandidates).toBe(locators.mergeSelectorCandidates);
    expect(registry.hydrateSelectorMemory).toBe(locators.hydrateSelectorMemory);
    expect(elementLogger.processElementLog).toBe(locators.processElementLog);
    expect(ecommerce.detectDomain("https://www.amazon.in")).toBe("amazon");
  });
});

describe("locator merge", () => {
  it("prefers db and memory selectors ahead of profile fallbacks", () => {
    const merged = mergeSelectorCandidates(
      "shop.example.test",
      { playCta: ["button.profile"] },
      { playCta: ["button.memory"] },
      { playCta: [{ selectorValue: "button.db" }] }
    );

    expect(merged.playCta).toEqual(["button.db", "button.memory", "button.profile"]);
  });

  it("deduplicates merged selectors and caps the list", () => {
    const merged = mergeSelectorCandidates(
      "shop.example.test",
      { contentCard: ["article a", "article a", "main a"] },
      { contentCard: ["article a", "section a"] },
      {}
    );

    expect(merged.contentCard).toEqual(["article a", "section a", "main a"]);
    expect(merged.contentCard.length).toBeLessThanOrEqual(10);
  });

  it("hydrates in-process memory from durable locators", async () => {
    const memory = new Map();
    const pool = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            element_key: "playCta",
            selector_type: "css",
            selector_value: "button.db",
            xpath: null,
            role: null,
            label: null
          }
        ]
      })
    };

    const result = await hydrateSelectorMemory(pool, memory, "shop.example.test");

    expect(result.keys).toEqual(["playCta"]);
    expect(memory.get("shop.example.test").playCta).toEqual(["button.db"]);
  });
});

describe("element logger helpers", () => {
  it("normalizes common element labels to stable keys", () => {
    expect(normalizeElementKey("Play CTA")).toBe("playCta");
    expect(normalizeElementKey("unknown widget")).toBe("custom");
  });

  it("parses css and xpath element entries", () => {
    expect(
      parseElementEntry({
        label: "Play",
        selector: "button.play",
        role: "button"
      })
    ).toMatchObject({
      elementKey: "playCta",
      selectorType: "css",
      selectorValue: "button.play"
    });

    expect(
      parseElementEntry({
        key: "contentCard",
        xpath: "//article//a"
      })
    ).toMatchObject({
      elementKey: "contentCard",
      selectorType: "css",
      selectorValue: "//article//a"
    });
  });

  it("extracts hostnames from urls", () => {
    expect(hostFromUrl("https://WWW.Example.test/path")).toBe("www.example.test");
    expect(hostFromUrl("not-a-url")).toBe("");
  });
});

describe("e-commerce selector runtime", () => {
  it("detects known domains and falls back to generic", () => {
    expect(ecommerce.detectDomain("https://www.flipkart.com/search")).toBe("flipkart");
    expect(ecommerce.detectDomain("https://shop.example.test")).toBe("generic");
  });

  it("returns domain-first selectors with generic fallback", () => {
    const selectors = ecommerce.getSelectors("https://www.amazon.in", "search", "input");

    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors).toEqual(expect.arrayContaining(ecommerce.domainSelectors.amazon.search.input));
  });

  it("returns a domain config bundle for light analyzer flows", () => {
    const config = ecommerce.getDomainConfig("https://www.flipkart.com");

    expect(config.domain).toBe("flipkart");
    expect(config.selectors.name).toBe("Flipkart");
  });
});

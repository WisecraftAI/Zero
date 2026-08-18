"use strict";

const scriptBuilder = require("@zero/builders/scriptBuilder");
const javaSeleniumBuilder = require("@zero/builders/javaSeleniumBuilder");
const packageEntry = require("@zero/builders");
const { resolveOttSelectors, flattenLocatorValues } = require("../packages/builders/lib/shared/selectors");
const { escapeJava, sanitizeTestTitle, toJavaClassName } = require("../packages/builders/lib/shared/text");
const { buildEcommerceTestBody } = require("../packages/builders/lib/playwright/ecommerceSpec");

const OTT_URL = "https://stream.example.test";
const SELECTORS = {
  contentCard: ["article.card a"],
  playCta: ["button.play"],
  continueCta: ["button.continue"],
  loginCta: ["button.login"]
};

describe("@zero/builders public API", () => {
  it("keeps package and subpath entry points compatible", () => {
    expect(typeof packageEntry.buildPlaywrightSpec).toBe("function");
    expect(typeof packageEntry.buildSeleniumJavaClass).toBe("function");
    expect(scriptBuilder.buildPlaywrightSpec).toBe(packageEntry.buildPlaywrightSpec);
    expect(javaSeleniumBuilder.escapeJava).toBe(packageEntry.escapeJava);
  });

  it("exposes lib subpath exports for Playwright, Selenium, and shared helpers", () => {
    expect(require("@zero/builders/playwright").buildPlaywrightSpec).toBe(packageEntry.buildPlaywrightSpec);
    expect(require("@zero/builders/selenium").buildSeleniumJavaClass).toBe(packageEntry.buildSeleniumJavaClass);
    expect(require("@zero/builders/shared/text").escapeJava).toBe(packageEntry.escapeJava);
  });
});

describe("shared builder helpers", () => {
  it("resolves OTT selector defaults and overrides", () => {
    const resolved = resolveOttSelectors({
      contentCard: ["a.tile"],
      seekBar: ["[role='slider']"]
    });

    expect(resolved.contentCard).toEqual(["a.tile"]);
    expect(resolved.playCta).toContain("button:has-text('Play')");
    expect(resolved.pauseCta).toEqual(["[role='slider']"]);
  });

  it("flattens locator registry entries for Selenium emitters", () => {
    expect(
      flattenLocatorValues({
        playCta: [{ selectorValue: "button.play" }, "button.alt"],
        contentCard: [{ selectorValue: "article a" }]
      })
    ).toEqual({
      playCta: ["button.play", "button.alt"],
      contentCard: ["article a"]
    });
  });

  it("escapes Java strings and sanitizes test titles", () => {
    expect(escapeJava('line\nwith "quotes"\\')).toBe('line\\nwith \\"quotes\\"\\\\');
    expect(sanitizeTestTitle('Search "phones"', "Fallback", 20)).toBe("Search 'phones'");
    expect(toJavaClassName("TVNZ+ QA")).toBe("TVNZQA");
  });
});

describe("Playwright emitters", () => {
  it("builds a channel regression spec with defaults and extra steps", () => {
    const spec = scriptBuilder.buildPlaywrightSpec(OTT_URL, {}, {
      testName: "TVNZ smoke",
      extraSteps: ["await page.screenshot({ path: 'done.png' });"]
    });

    expect(spec).toContain("import { test, expect } from '@playwright/test';");
    expect(spec).toContain(`const OTT_URL = ${JSON.stringify(OTT_URL)};`);
    expect(spec).toContain('test("TVNZ smoke"');
    expect(spec).toContain("button:has-text('Play')");
    expect(spec).toContain("await page.screenshot({ path: 'done.png' });");
  });

  it("uses merged selector candidates in the channel flow", () => {
    const spec = scriptBuilder.buildPlaywrightSpec(OTT_URL, SELECTORS);

    expect(spec).toContain(JSON.stringify(SELECTORS.contentCard));
    expect(spec).toContain(JSON.stringify(SELECTORS.playCta));
    expect(spec).toContain(JSON.stringify(SELECTORS.continueCta));
    expect(spec).toContain(JSON.stringify(SELECTORS.loginCta));
  });

  it("builds one Playwright test per manual test case", () => {
    const spec = scriptBuilder.buildPlaywrightSpecFromTestCases(
      OTT_URL,
      {
        testCases: [
          { title: 'Search "catalog"', scenario: "Search catalog" },
          { scenario: "Play featured title" }
        ]
      },
      SELECTORS
    );

    expect(spec.match(/^test\(/gm)).toHaveLength(2);
    expect(spec).toContain("Search 'catalog'");
    expect(spec).toContain("Play featured title");
    expect(spec).toContain("await page.waitForLoadState('domcontentloaded');");
  });

  it("builds domain-aware e-commerce specs from action-driven cases", () => {
    const spec = scriptBuilder.buildEcommerceSpec(
      "https://www.amazon.in",
      [
        {
          title: "Search and add iPhone",
          action: "search then add to cart",
          testData: "iPhone 15",
          expectedResult: "Item appears in cart"
        }
      ]
    );

    expect(spec).toContain("Domain-Aware E-Commerce Test:");
    expect(spec).toContain('test.describe(');
    expect(spec).toContain('await searchAndNavigate(page, "iPhone 15");');
    expect(spec).toContain("await addToCart(page);");
  });

  it("builds a generic e-commerce flow when no cases are provided", () => {
    const spec = scriptBuilder.buildEcommerceSpec("https://shop.example.test", []);

    expect(spec).toContain("test('Complete E-Commerce Flow'");
    expect(spec).toContain("await expectVisible(page, SELECTORS.cart.itemTitle);");
  });

  it("maps e-commerce actions to generated step blocks", () => {
    const body = buildEcommerceTestBody({
      action: "search click_product add to cart open_cart verify",
      testData: "Pixel 9",
      expectedResult: "Cart updated"
    });

    expect(body.join("\n")).toContain('await searchAndNavigate(page, "Pixel 9");');
    expect(body.join("\n")).toContain("await clickProduct(page);");
    expect(body.join("\n")).toContain("await openCart(page);");
    expect(body.join("\n")).toContain("// Verify: Cart updated");
  });

  it("passes execution steps through unchanged", () => {
    const baseTests = [{ id: "TC-1", action: "verify" }];
    expect(scriptBuilder.buildExecutionSteps(SELECTORS, OTT_URL, baseTests)).toBe(baseTests);
  });
});

describe("Selenium emitters", () => {
  it("builds a standalone Java test method from locators", () => {
    const java = javaSeleniumBuilder.buildSeleniumJavaTest(
      {
        id: "TC-PLAY",
        scenario: "Play featured title",
        expectedResult: "Playback starts"
      },
      {
        playCta: [{ selectorValue: "button.play" }],
        contentCard: [{ selectorValue: "article.card a" }]
      },
      OTT_URL
    );

    expect(java).toContain("public class TC_PLAY {");
    expect(java).toContain('By.cssSelector("button.play")');
    expect(java).toContain('By.cssSelector("article.card a")');
    expect(java).toContain("Playback starts");
  });

  it("builds a Java class shell for a project", () => {
    const java = javaSeleniumBuilder.buildSeleniumJavaClass("TVNZ+", [], {}, OTT_URL);

    expect(java).toContain("public class TVNZTest {");
    expect(java).toContain(`private static final String BASE_URL = "${OTT_URL}";`);
    expect(java).toContain("Generated by ZER0");
  });

  it("builds a domain-aware e-commerce Selenium class", () => {
    const java = javaSeleniumBuilder.buildEcommerceSelenium("https://www.flipkart.com", []);

    expect(java).toContain("Domain-Aware E-Commerce Test:");
    expect(java).toContain("private static final String[] SEARCH_INPUT");
    expect(java).toContain("public void searchProduct(String term)");
    expect(java).toContain("public static void main(String[] args)");
  });
});

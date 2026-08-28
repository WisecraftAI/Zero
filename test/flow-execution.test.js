"use strict";

const {
  pickCriticalFlows,
  normalizeFlowSteps,
  buildDiscoveredFlowTests,
  executeFlowStep,
} = require("../packages/builders/lib/playwright/discoveredFlows");
const { resolveExecutionMode, EXECUTION_MODES } = require("../packages/domain/lib/executionModes");

function createMockPage({ visibleSelectors = ["body", "nav", "header", "main", "footer"], visibleText = ["Home"] } = {}) {
  const page = {
    url: "",
    async goto(url) {
      this.url = url;
    },
    async waitForTimeout() {},
    async evaluate() {},
    locator(sel) {
      const visible = visibleSelectors.includes(sel) || sel === "body";
      return {
        first() {
          return this;
        },
        async waitFor() {
          if (!visible) {
            throw new Error("locator.waitFor: Timeout 8000ms exceeded. Call log: - wait");
          }
        },
        async isVisible() {
          return visible;
        },
        async click() {},
        async fill() {},
        async press() {},
      };
    },
    getByText(term) {
      const visible = visibleText.some((t) => String(term).toLowerCase().includes(String(t).toLowerCase()) || String(t).toLowerCase().includes(String(term).toLowerCase()));
      return {
        first() {
          return this;
        },
        async isVisible() {
          return visible;
        },
        async click() {},
      };
    },
    getByRole() {
      return {
        first() {
          return this;
        },
        async isVisible() {
          return false;
        },
        async click() {},
      };
    },
  };
  return page;
}

describe("Q3 discovered flow execution", () => {
  const userFlows = [
    {
      name: "Product Search Flow",
      priority: "Critical",
      steps: [
        { action: "navigate", description: "Load homepage" },
        { action: "verify", description: "Verify search bar is visible" },
        { action: "input", description: "Enter search query in search box" },
      ],
    },
    {
      name: "Footer Links",
      priority: "Low",
      steps: [{ action: "verify", description: "Footer visible" }],
    },
  ];

  it("resolveExecutionMode maps url_analysis_auto to discovered_flows", () => {
    expect(resolveExecutionMode({ executionMode: "url_analysis_auto" })).toBe(
      EXECUTION_MODES.DISCOVERED_FLOWS
    );
  });

  it("pickCriticalFlows prefers critical flows first", () => {
    const picked = pickCriticalFlows(userFlows, [], 3);
    expect(picked.length).toBeGreaterThanOrEqual(1);
    expect(picked[0].name).toBe("Product Search Flow");
    expect(picked[0].steps.length).toBeGreaterThan(1);
  });

  it("pickCriticalFlows does not duplicate analyzer flows with matching manual cases", () => {
    const picked = pickCriticalFlows(
      [{ name: "Site Navigation", priority: "Critical", steps: [{ action: "verify", description: "Nav" }] }],
      [{ module: "Site Navigation", scenario: "Site Navigation", steps: ["Nav visible"] }],
      5
    );
    expect(picked.map((p) => p.name)).toEqual(["Site Navigation"]);
  });

  it("normalizeFlowSteps does not treat non-selector targets as locators", () => {
    const steps = normalizeFlowSteps({
      elements: [".Nav_hash123"],
      steps: [
        { action: "navigate", target: "Homepage", description: "Load the homepage" },
        { action: "verify", target: "Header/Navigation", description: "Verify header" },
      ],
    });
    expect(steps[0].selectors).toEqual([".Nav_hash123"]);
    expect(steps[0].target).toBe("Homepage");
  });

  it("buildDiscoveredFlowTests returns multi-step executable flow tests", () => {
    const tests = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      userFlows,
      manualTestCases: [],
      hasLoginSecrets: false,
    });
    expect(tests.length).toBeGreaterThanOrEqual(1);
    expect(tests[0].flowName).toBe("Product Search Flow");
    expect(typeof tests[0].execute).toBe("function");
  });

  it("executeFlowStep runs verify and navigate actions on mock page", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "input[type='search']", "nav"],
      visibleText: ["search bar"],
    });

    await executeFlowStep(page, { action: "navigate", description: "Load homepage" }, { ottUrl: "https://shop.example.test" }, trace);
    expect(trace.some((t) => t.startsWith("flow:navigate") || t.includes("discovered_flows"))).toBe(true);

    await executeFlowStep(page, { action: "verify", description: "Verify search bar is visible" }, { ottUrl: "https://shop.example.test", loaded: true }, trace);
    expect(trace.some((t) => t.startsWith("flow:verify"))).toBe(true);
  });

  it("verify does not fail the flow on a stale crawl selector when the page loaded", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "nav", "[role='navigation']", "header"],
      visibleText: [],
    });

    await executeFlowStep(
      page,
      {
        action: "verify",
        target: "Header/Navigation",
        description: "Verify header and navigation menu are visible",
        selectors: [".Nav_abc123hash"],
      },
      { ottUrl: "https://shop.example.test", loaded: true },
      trace
    );

    expect(trace.some((t) => t.startsWith("flow:verify"))).toBe(true);
    expect(trace.join("\n")).not.toMatch(/Timeout 8000ms/);
  });

  it("scroll and interact actions do not use a hard waitFor on a missing selector", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "footer", "[role='contentinfo']", "nav", "header a"],
    });

    await executeFlowStep(
      page,
      { action: "scroll", target: "Footer", description: "Scroll to page footer", selectors: [".missing"] },
      { ottUrl: "https://shop.example.test", loaded: true },
      trace
    );
    await executeFlowStep(
      page,
      { action: "interact", target: "Menu Items", description: "Click on each main navigation link", selectors: [".missing"] },
      { ottUrl: "https://shop.example.test", loaded: true },
      trace
    );

    expect(trace.some((t) => t.startsWith("flow:scroll"))).toBe(true);
    expect(trace.some((t) => t.startsWith("flow:click"))).toBe(true);
  });

  it("common analyzer flows complete without locator.waitFor timeouts", async () => {
    const tests = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      userFlows: [
        {
          name: "Site Navigation",
          priority: "Critical",
          elements: [".Nav_hash"],
          steps: [
            { action: "navigate", target: "Homepage", description: "Load the homepage" },
            { action: "verify", target: "Header/Navigation", description: "Verify header and navigation menu are visible" },
            { action: "interact", target: "Menu Items", description: "Click on each main navigation link" },
          ],
        },
        {
          name: "Add to Cart",
          priority: "Critical",
          elements: [".Cart_hash"],
          steps: [
            { action: "navigate", target: "Product Page", description: "Navigate to a product page" },
            { action: "verify", target: "Product Details", description: "Verify product title, price, and image" },
            { action: "interact", target: "Add to Cart", description: "Click Add to Cart button" },
          ],
        },
        {
          name: "Footer Verification",
          priority: "Medium",
          steps: [
            { action: "scroll", target: "Footer", description: "Scroll to page footer" },
            { action: "verify", target: "Footer Content", description: "Verify footer is visible" },
          ],
        },
      ],
      manualTestCases: [
        { module: "Site Navigation", scenario: "Site Navigation", steps: ["Nav"] },
        { module: "Add to Cart", scenario: "Add to Cart", steps: ["Cart"] },
      ],
    });

    expect(tests.map((t) => t.title)).toEqual(["Site Navigation", "Add to Cart", "Footer Verification"]);

    const page = createMockPage({
      visibleSelectors: [
        "body",
        "nav",
        "[role='navigation']",
        "header",
        "header a",
        "footer",
        "[role='contentinfo']",
        "a[href*='cart']",
        "button:has-text('Add to cart')",
        "[class*='product']",
        "main",
      ],
    });

    for (const testDef of tests) {
      const trace = [];
      const result = await testDef.execute(page, trace);
      expect(result.failed).toBe(false);
      expect(trace.join("\n")).not.toMatch(/Timeout 8000ms/);
    }
  });

  it("discovered flow execute completes multi-step trace", async () => {
    const tests = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      userFlows,
      manualTestCases: [],
      hasLoginSecrets: false,
    });
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "input[type='search']", "input:not([type='hidden'])", "nav", "main"],
      visibleText: ["search bar"],
    });

    const result = await tests[0].execute(page, trace);
    expect(result.failed).toBe(false);
    expect(result.stepResults.length).toBeGreaterThan(1);
    expect(trace.some((t) => t.includes("discovered_flows"))).toBe(true);
  });
});

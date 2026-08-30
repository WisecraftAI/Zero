"use strict";

const {
  pickCriticalFlows,
  normalizeFlowSteps,
  buildDiscoveredFlowTests,
  executeFlowStep,
} = require("../packages/builders/lib/playwright/discoveredFlows");
const {
  healLocator,
  healingKeyForStep,
} = require("../packages/builders/lib/playwright/locatorHealing");
const { resolveExecutionMode, EXECUTION_MODES } = require("../packages/domain/lib/executionModes");

function createMockPage({
  visibleSelectors = ["body", "nav", "header", "main", "footer"],
  visibleText = ["Home"],
  selectorAttributes = {},
} = {}) {
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
        async getAttribute(name) {
          return selectorAttributes[sel]?.[name] || null;
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

  it("pickCriticalFlows prefers critical analyzer flows when no manual cases exist", () => {
    const picked = pickCriticalFlows(userFlows, [], 3);
    expect(picked.length).toBeGreaterThanOrEqual(1);
    expect(picked[0].name).toBe("Product Search Flow");
    expect(picked[0].steps.length).toBeGreaterThan(1);
  });

  it("pickCriticalFlows uses evidence-backed manual cases as the primary source", () => {
    const manualCases = [
      {
        id: "TC-MAJ-001",
        module: "Pincode Serviceability",
        scenario: "Verify Pincode Serviceability functionality",
        priority: "Critical",
        steps: ["Open pincode serviceability", "Verify serviceability result"],
        traceability: "majorFunctionalCases:subDomainPriority",
      },
      {
        id: "TC-MAJ-002",
        module: "Checkout",
        scenario: "Checkout Flow",
        priority: "Critical",
        steps: ["Open cart", "Validate checkout outcome"],
        traceability: "majorFunctionalCases:subDomainCriticalFlow",
      },
    ];

    const picked = pickCriticalFlows(userFlows, manualCases, 20);

    expect(picked.map((entry) => entry.caseId)).toEqual(["TC-MAJ-001", "TC-MAJ-002"]);
    expect(picked.every((entry) => entry.kind === "case")).toBe(true);
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

  it("normalizeFlowSteps rejects locality inputs as product-search evidence", () => {
    const steps = normalizeFlowSteps({
      elements: ["input[name=\"select-locality\"]"],
      steps: [
        { action: "input", target: "Product Search", description: "Enter product search query" },
      ],
    });

    expect(steps[0].selectors).toEqual([]);
  });

  it("rejects a visible locality field resolved through a generic search selector", async () => {
    const trace = [];
    const searchSelector = "input[placeholder*='search' i]";
    const page = createMockPage({
      visibleSelectors: ["body", searchSelector],
      visibleText: [],
      selectorAttributes: {
        [searchSelector]: {
          name: "select-locality",
          placeholder: "Search delivery location",
          type: "text",
        },
      },
    });

    const result = await executeFlowStep(
      page,
      { action: "input", target: "Product Search", description: "Enter product search query" },
      { ottUrl: "https://shop.example.test", loaded: true },
      trace
    );

    expect(result).toEqual({ skipped: true, reason: "input_target_not_found" });
    expect(trace.some((entry) => entry === `flow:input:${searchSelector}`)).toBe(false);
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

  it("buildDiscoveredFlowTests preserves manual case ids and honors an explicit cap", () => {
    const manualTestCases = Array.from({ length: 20 }, (_, index) => ({
      id: `TC-MAJ-${String(index + 1).padStart(3, "0")}`,
      scenario: `Domain case ${index + 1}`,
      priority: "High",
      steps: ["Verify domain behavior"],
      traceability: "majorFunctionalCases:testPriority",
    }));

    const tests = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      userFlows,
      manualTestCases,
      maxFlows: 12,
    });

    expect(tests).toHaveLength(12);
    expect(tests[0]).toMatchObject({
      id: "EXEC-TC-MAJ-001",
      sourceCaseId: "TC-MAJ-001",
      traceability: "majorFunctionalCases:testPriority",
    });
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

    const result = await executeFlowStep(
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
    expect(result).toEqual({ skipped: true, reason: "insufficient_verification_evidence" });
    expect(trace.join("\n")).not.toMatch(/Timeout 8000ms/);
  });

  it("does not pass clicks by binding to generic header containers", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "header"],
      visibleText: [],
    });

    const result = await executeFlowStep(
      page,
      {
        action: "click",
        target: "Menu Items",
        description: "Click on each main navigation link",
        selectors: ["header"],
      },
      { ottUrl: "https://shop.example.test", loaded: true },
      trace
    );
    expect(result).toEqual({ skipped: true, reason: "click_target_not_found" });
    expect(trace).not.toContain("flow:click:header");
  });

  it("does not use an arbitrary input when the requested field is missing", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "input:not([type='hidden'])"],
      visibleText: [],
    });

    const result = await executeFlowStep(
      page,
      { action: "input", target: "Name Field", description: "Enter name" },
      { ottUrl: "https://shop.example.test", loaded: true },
      trace
    );
    expect(result).toEqual({ skipped: true, reason: "input_target_not_found" });
    expect(trace).not.toContain("flow:input:input:not([type='hidden'])");
  });

  it("marks a case inconclusive when every step lacks target-specific evidence", async () => {
    const [testDef] = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      manualTestCases: [{
        id: "TC-MAJ-001",
        scenario: "Delivery Slot Selection",
        steps: ["Verify delivery slot selection works"],
      }],
    });
    const result = await testDef.execute(
      createMockPage({ visibleSelectors: ["body"], visibleText: [] }),
      []
    );

    expect(result).toMatchObject({
      skip: true,
      reason: "No step had sufficient target-specific evidence",
    });
    expect(result.stepResults).toEqual([
      expect.objectContaining({ status: "skipped", reason: "insufficient_verification_evidence" }),
    ]);
  });

  it("navigates by the named menu entry instead of the first header link", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "nav", "header a", "nav a", 'nav a:has-text("Cart")'],
      visibleText: [],
    });
    const step = {
      action: "navigate",
      target: 'From the homepage, open "Cart" in the main navigation',
      description: 'From the homepage, open "Cart" in the main navigation',
    };

    const result = await executeFlowStep(page, step, { ottUrl: "https://shop.example.test", loaded: true }, trace);

    expect(result).toMatchObject({ ok: true });
    expect(trace).toContain('flow:navigate-click:nav a:has-text("Cart")');
    expect(trace).not.toContain("flow:navigate-click:header a");
    expect(trace).not.toContain("flow:navigate-click:nav a");
  });

  it("navigates to the crawled path when a step names one", async () => {
    const trace = [];
    const page = createMockPage({ visibleSelectors: ["body"], visibleText: [] });
    const step = {
      action: "navigate",
      target: 'Navigate to /cart ("Your Cart")',
      description: 'Navigate to /cart ("Your Cart")',
    };

    const result = await executeFlowStep(page, step, { ottUrl: "https://shop.example.test", loaded: true }, trace);

    expect(result).toMatchObject({ ok: true });
    expect(page.url).toBe("https://shop.example.test/cart");
    expect(trace).toContain("flow:navigate:https://shop.example.test/cart");
  });

  it("does not click a menu link for a navigate step with no known target", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "nav", "nav a", "header a", "[role='navigation'] a"],
      visibleText: [],
    });
    const step = {
      action: "navigate",
      target: "Navigate to the Loyalty Program entry point",
      description: "Navigate to the Loyalty Program entry point",
    };

    const result = await executeFlowStep(page, step, { ottUrl: "https://shop.example.test", loaded: true }, trace);

    expect(result).toEqual({ skipped: true, reason: "navigation_target_not_found" });
    expect(trace.join("\n")).not.toMatch(/flow:navigate-click/);
  });

  it("a navigate click that leaves the url unchanged is not evidence", async () => {
    const trace = [];
    const page = createMockPage({
      visibleSelectors: ["body", "nav", 'nav a:has-text("Wishlist")'],
      visibleText: [],
    });
    page.url = "https://shop.example.test/";
    const step = {
      action: "navigate",
      target: 'From the homepage, open "Wishlist" in the main navigation',
      description: 'From the homepage, open "Wishlist" in the main navigation',
    };

    const result = await executeFlowStep(page, step, { ottUrl: "https://shop.example.test", loaded: true }, trace);

    expect(result).toEqual({ ok: true, evidence: false });
    expect(trace).toContain("flow:navigate-no-move");
  });

  it("does not heal a step onto a lone generic noun", async () => {
    const page = {
      getByRole(role, { name }) {
        const matches = name.test("Search for groceries");
        return { first() { return this; }, async isVisible() { return matches; } };
      },
      getByText(term) {
        const matches = /^(product|user)$/i.test(term);
        return { first() { return this; }, async isVisible() { return matches; } };
      },
    };

    const healed = await healLocator(
      page,
      { action: "verify", target: "Product Details", description: "Verify the Product Details UI is visible and usable" },
      "verify"
    );

    expect(healed).toBeNull();
  });

  it("reaching the landing page alone does not make a case pass", async () => {
    const [testDef] = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      manualTestCases: [{
        id: "TC-MAJ-002",
        scenario: "Verify Loyalty Program functionality",
        steps: [
          "Navigate to the Loyalty Program entry point",
          "Verify the Loyalty Program UI is visible and usable",
        ],
      }],
    });
    const page = createMockPage({
      visibleSelectors: ["body", "main", "nav", "nav a", "header a"],
      visibleText: [],
    });

    const result = await testDef.execute(page, []);

    expect(result).toMatchObject({
      skip: true,
      reason: "No step had sufficient target-specific evidence",
    });
  });

  it("heals a changed locator from accessible intent and emits a stable selector", async () => {
    const healedLocator = {
      first() { return this; },
      async isVisible() { return true; },
      async evaluate() { return '[data-testid="account-menu"]'; },
    };
    const page = {
      getByRole(role, { name }) {
        const matches = role === "button" && name.test("Account menu");
        return matches
          ? healedLocator
          : { first() { return this; }, async isVisible() { return false; } };
      },
    };

    const healed = await healLocator(
      page,
      { action: "click", target: "Account menu", description: "Click account menu" },
      "click"
    );

    expect(healed).toMatchObject({
      selector: '[data-testid="account-menu"]',
      key: "primaryNav",
      strategy: "accessible-intent",
    });
    expect(healingKeyForStep({ target: "Product search" }, "input")).toBe("searchInput");
  });

  it("records healed steps and offers the selector for host-scoped learning", async () => {
    const learned = [];
    const page = createMockPage({ visibleSelectors: ["body"], visibleText: [] });
    page.getByRole = (role, { name }) => {
      const matches = role === "button" && name.test("Account menu");
      return {
        first() { return this; },
        async isVisible() { return matches; },
        async click() {},
        async evaluate() { return '[data-testid="account-menu"]'; },
      };
    };

    const [testDef] = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      manualTestCases: [{
        id: "TC-MAJ-001",
        scenario: "Account navigation",
        steps: ["Click account menu"],
      }],
      onHealed: async (event) => learned.push(event),
    });
    const result = await testDef.execute(page, []);

    expect(result.failed).toBe(false);
    expect(result.stepResults[0]).toMatchObject({
      status: "passed",
      healing: {
        selector: '[data-testid="account-menu"]',
        strategy: "accessible-intent",
      },
    });
    expect(learned).toEqual([
      expect.objectContaining({ selector: '[data-testid="account-menu"]' }),
    ]);
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

    expect(tests.map((t) => t.title)).toEqual(["Site Navigation", "Add to Cart"]);
    expect(tests.map((t) => t.id)).toEqual(["FLOW-001", "FLOW-002"]);

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

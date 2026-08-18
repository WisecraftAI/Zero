"use strict";

const {
  pickCriticalFlows,
  buildDiscoveredFlowTests,
  executeFlowStep,
} = require("../packages/builders/lib/playwright/discoveredFlows");
const { resolveExecutionMode, EXECUTION_MODES } = require("../packages/domain/lib/executionModes");

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
    const page = {
      async goto(url) {
        this.url = url;
      },
      async waitForTimeout() {},
      locator() {
        return {
          first() {
            return this;
          },
          async waitFor() {},
        };
      },
      getByText() {
        return {
          first() {
            return this;
          },
          async isVisible() {
            return true;
          },
        };
      },
    };

    await executeFlowStep(page, { action: "navigate", description: "Load homepage" }, { ottUrl: "https://shop.example.test" }, trace);
    expect(trace.some((t) => t.startsWith("flow:navigate"))).toBe(true);

    await executeFlowStep(page, { action: "verify", description: "Verify search bar is visible" }, { ottUrl: "https://shop.example.test" }, trace);
    expect(trace.some((t) => t.startsWith("flow:verify"))).toBe(true);
  });

  it("discovered flow execute completes multi-step trace", async () => {
    const tests = buildDiscoveredFlowTests({
      ottUrl: "https://shop.example.test",
      userFlows,
      manualTestCases: [],
      hasLoginSecrets: false,
    });
    const trace = [];
    const page = {
      url: "",
      async goto(url) {
        this.url = url;
      },
      async waitForTimeout() {},
      locator() {
        return {
          first() {
            return this;
          },
          async waitFor() {},
          async fill() {},
          async isVisible() {
            return true;
          },
        };
      },
      getByText() {
        return {
          first() {
            return this;
          },
          async isVisible() {
            return true;
          },
        };
      },
    };

    const result = await tests[0].execute(page, trace);
    expect(result.failed).toBe(false);
    expect(result.stepResults.length).toBeGreaterThan(1);
    expect(trace.some((t) => t.includes("discovered_flows"))).toBe(true);
  });
});

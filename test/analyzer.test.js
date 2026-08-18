"use strict";

const analyzer = require("@zero/analyzer");
const proEntry = require("@zero/analyzer/urlAnalyzerPro");
const lightEntry = require("@zero/analyzer/urlAnalyzer");
const { detectWebsiteType } = require("../packages/analyzer/lib/classify/websiteType");
const { detectAntiBot, detectDynamicContent } = require("../packages/analyzer/lib/crawl/signals");
const { detectUserFlows: detectProFlows } = require("../packages/analyzer/lib/flows/proFlows");
const { detectUserFlows: detectLightFlows } = require("../packages/analyzer/lib/flows/lightFlows");
const { formatForBAAgent } = require("../packages/analyzer/lib/format/baPro");
const { formatObservationsForBA } = require("../packages/analyzer/lib/format/baLight");
const { generateBRD: generateProBRD } = require("../packages/analyzer/lib/generate/proBrd");
const { generateTestCases: generateProTestCases } = require("../packages/analyzer/lib/generate/proTestCases");
const { generateBRD: generateLightBRD } = require("../packages/analyzer/lib/generate/lightBrd");
const { detectFeatures } = require("../packages/analyzer/lib/generate/lightFeatures");
const {
  generateTestCasesFromAnalysis
} = require("../packages/analyzer/lib/generate/lightTestCases");
const {
  generateBestSelector,
  generateSmartSelector
} = require("../packages/analyzer/lib/selectors");

function createProAnalysis() {
  const analysis = {
    url: "https://shop.example.test",
    websiteType: {
      type: "ECOMMERCE",
      typeName: "E-commerce Platform",
      confidence: 0.9,
      testPriorities: ["Search", "Checkout"],
      criticalFlows: ["Search to Purchase"]
    },
    pageStructure: {
      title: "Example Shop",
      headings: [{ level: 1, text: "Shop" }]
    },
    elements: [
      { category: "NAVIGATION", selector: "nav.main", text: "Main" },
      { category: "SEARCH", selector: "[data-testid=\"search\"]", text: "" },
      { category: "IMAGES", selector: "img.product", text: "" }
    ],
    forms: [
      {
        id: "login",
        purpose: "login",
        fieldCount: 2,
        fields: [
          { type: "email", name: "email", required: true },
          { type: "password", name: "password", required: true }
        ],
        submitButton: { text: "Sign in" }
      }
    ],
    userFlows: [
      {
        name: "Product Search",
        description: "Find a product",
        priority: "Critical",
        steps: [
          { action: "input", target: "Search", description: "Enter query" },
          { action: "verify", target: "Results", description: "Verify results" }
        ],
        assertions: ["Relevant products are shown"],
        elements: ["[data-testid=\"search\"]"]
      }
    ],
    observations: [{ type: "info", message: "Analyzed" }],
    warnings: ["Anti-bot protection detected"],
    pagesAnalyzed: 1,
    antiBot: true,
    dynamicContent: true
  };

  analysis.brd = generateProBRD(analysis);
  analysis.testCases = generateProTestCases(analysis);
  return analysis;
}

function createLightAnalysis() {
  return {
    siteOverview: {
      title: "Example Shop",
      url: "https://shop.example.test",
      pagesDiscovered: 1
    },
    domainConfig: { domain: "amazon", name: "Amazon" },
    discoveredFeatures: [
      {
        name: "Search",
        type: "core",
        priority: "Critical",
        description: "Find products",
        testable: true
      }
    ],
    discoveredForms: [
      {
        id: "search",
        purpose: "search",
        fieldCount: 1,
        fields: [{ type: "search", name: "query", required: true }],
        submitButton: { text: "Search" }
      }
    ],
    discoveredElements: {
      NAVIGATION: [{ selector: "nav" }]
    },
    userFlows: [
      {
        name: "Product Search Flow",
        priority: "Critical",
        steps: [{ action: "verify", description: "Verify results" }],
        assertions: ["Results are displayed"]
      }
    ],
    pageStructure: {
      title: "Example Shop",
      headings: [{ level: 1, text: "Shop" }]
    },
    warnings: [],
    antiBot: false,
    dynamicContent: true
  };
}

describe("@zero/analyzer public API", () => {
  it("keeps the default, Pro, and light entry points compatible", () => {
    expect(analyzer.analyzeUrlPro).toBe(proEntry.analyzeUrlPro);
    expect(analyzer.formatForBAAgent).toBe(proEntry.formatForBAAgent);
    expect(typeof lightEntry.analyzeUrl).toBe("function");
    expect(Array.isArray(lightEntry.ELEMENT_CATEGORIES.NAVIGATION)).toBe(true);
    expect(Array.isArray(proEntry.ELEMENT_CATEGORIES.NAVIGATION.selectors)).toBe(true);
  });
});

describe("selector generation", () => {
  it("uses stable attributes before classes and text", () => {
    expect(
      generateSmartSelector({
        tagName: "button",
        dataTestId: "checkout",
        id: "ignored",
        className: "primary-button",
        innerText: "Buy now"
      })
    ).toBe("[data-testid=\"checkout\"]");

    expect(
      generateBestSelector({
        tagName: "input",
        ariaLabel: "Search \"catalog\""
      })
    ).toBe("[aria-label=\"Search \\\"catalog\\\"\"]");
  });

  it("falls back safely when a link URL cannot provide a useful path", () => {
    expect(
      generateSmartSelector({
        tagName: "a",
        href: "https://example.test/",
        originalSelector: "a[href]"
      })
    ).toBe("a[href]");
  });
});

describe("website classification and page signals", () => {
  it("classifies a known host without crawling page text", async () => {
    const page = {
      evaluate: jest.fn(),
      title: jest.fn(),
      $eval: jest.fn()
    };

    const result = await detectWebsiteType(page, "https://www.netflix.com/browse");

    expect(result).toMatchObject({
      type: "OTT_STREAMING",
      typeName: "OTT/Streaming Platform",
      confidence: 0.9
    });
    expect(page.evaluate).not.toHaveBeenCalled();
  });

  it("uses page indicators when the host is generic", async () => {
    const page = {
      evaluate: jest.fn().mockResolvedValue("watch movies and stream every episode"),
      title: jest.fn().mockResolvedValue("Entertainment"),
      $eval: jest.fn().mockResolvedValue("stream movies")
    };

    const result = await detectWebsiteType(page, "https://example.test");

    expect(result.type).toBe("OTT_STREAMING");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.indicators).toEqual(expect.arrayContaining(["stream", "movie"]));
  });

  it("detects anti-bot copy and dynamic application roots", async () => {
    const page = {
      content: jest.fn().mockResolvedValue("<html>Cloudflare</html>"),
      locator: jest.fn().mockReturnValue({
        textContent: jest.fn().mockResolvedValue("Verify you are human")
      }),
      evaluate: jest.fn().mockResolvedValue(true)
    };

    await expect(detectAntiBot(page)).resolves.toBe(true);
    await expect(detectDynamicContent(page)).resolves.toBe(true);
  });
});

describe("flow detection", () => {
  it("builds common and e-commerce Pro flows from discovered categories", () => {
    const flows = detectProFlows(
      { type: "ECOMMERCE" },
      [
        { category: "NAVIGATION", selector: "nav" },
        { category: "SEARCH", selector: "input[type=\"search\"]" },
        { category: "CART", selector: "a[href*=\"cart\"]" }
      ],
      []
    );

    expect(flows.map((flow) => flow.name)).toEqual(
      expect.arrayContaining(["Site Navigation", "Product Search", "Add to Cart"])
    );
  });

  it("builds light generic flows synchronously", () => {
    const flows = detectLightFlows(
      { domain: "generic" },
      [
        { category: "NAVIGATION" },
        { category: "FORMS" },
        { category: "SEARCH" }
      ]
    );

    expect(flows.map((flow) => flow.name)).toEqual(
      expect.arrayContaining(["Product Search Flow", "Navigation Flow", "Form Submission Flow"])
    );
  });
});

describe("Pro report generation", () => {
  it("creates traceable requirements, risks, and test cases with unique IDs", () => {
    const analysis = createProAnalysis();
    const requirementFeatures = analysis.brd.functionalRequirements.map((item) => item.feature);
    const testIds = analysis.testCases.map((testCase) => testCase.id);

    expect(requirementFeatures).toEqual(
      expect.arrayContaining(["Product Search", "Login Form", "Navigation System", "Search Functionality", "Product Catalog"])
    );
    expect(analysis.brd.riskAssessment.map((risk) => risk.category)).toEqual(
      expect.arrayContaining(["Technical", "Data", "Environment"])
    );
    expect(new Set(testIds).size).toBe(testIds.length);
    expect(analysis.testCases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scenario: "Login Form - Valid Data Submission" }),
        expect.objectContaining({ scenario: "Login Form - Required Field Validation" }),
        expect.objectContaining({ scenario: "Product Catalog Display" })
      ])
    );
  });

  it("formats the Pro result for BA consumption", () => {
    const formatted = formatForBAAgent(createProAnalysis());

    expect(formatted.summary).toContain("3 elements, 1 forms, 1 user flows");
    expect(formatted.criticalPaths).toEqual(["Product Search"]);
    expect(formatted.testingRecommendations).toEqual(
      expect.arrayContaining([
        "Use headed browser mode due to anti-bot protection",
        "Use data-testid selectors for stable automation",
        "Prioritize: Search testing"
      ])
    );
  });
});

describe("light report generation", () => {
  it("detects features and creates BRD-backed test cases", () => {
    const features = detectFeatures(
      [
        { category: "SEARCH" },
        { category: "CART" },
        { category: "NAVIGATION" }
      ],
      [{ purpose: "login" }],
      { domain: "amazon" }
    );
    expect(features.map((feature) => feature.name)).toEqual(
      expect.arrayContaining([
        "Search",
        "Shopping Cart",
        "User Authentication",
        "Navigation Menu",
        "Product Listing",
        "Product Details"
      ])
    );

    const analysis = createLightAnalysis();
    analysis.brd = generateLightBRD(analysis);
    analysis.generatedTestCases = generateTestCasesFromAnalysis(analysis);

    expect(analysis.brd.functionalRequirements.map((item) => item.feature)).toEqual(
      expect.arrayContaining(["Search", "Search Form", "Product Search Flow"])
    );
    expect(analysis.generatedTestCases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scenario: "Verify Search" }),
        expect.objectContaining({ scenario: "Search Form - Empty Required Fields" }),
        expect.objectContaining({ scenario: "Page Structure Verification" })
      ])
    );
  });

  it("formats light observations and recommendations for BA", () => {
    const analysis = createLightAnalysis();
    analysis.brd = generateLightBRD(analysis);
    analysis.generatedTestCases = generateTestCasesFromAnalysis(analysis);

    const formatted = formatObservationsForBA(analysis);

    expect(formatted.siteType).toBe("Amazon");
    expect(formatted.criticalFlows).toEqual(["Product Search Flow"]);
    expect(formatted.testingRecommendations).toEqual(
      expect.arrayContaining([
        "Use data-testid selectors for dynamic content",
        "Prioritize testing: Search"
      ])
    );
  });

  it("treats checkout forms as critical in requirements and test cases", () => {
    const analysis = createLightAnalysis();
    analysis.discoveredForms = [
      {
        id: "checkout",
        purpose: "checkout",
        fieldCount: 1,
        fields: [{ type: "text", name: "address", required: true }],
        submitButton: { text: "Pay" }
      }
    ];
    analysis.brd = generateLightBRD(analysis);
    analysis.generatedTestCases = generateTestCasesFromAnalysis(analysis);

    expect(
      analysis.brd.functionalRequirements.find((item) => item.feature === "Checkout Form")
    ).toMatchObject({ priority: "Critical" });
    expect(
      analysis.generatedTestCases.find(
        (testCase) => testCase.scenario === "Checkout Form - Valid Submission"
      )
    ).toMatchObject({ priority: "Critical" });
  });
});

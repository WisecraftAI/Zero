"use strict";

const { scoreIndicators, matchesIndicator, matchesHostnameLabel } = require("../packages/analyzer/lib/classify/indicatorMatch");
const { detectWebsiteType, matchHostnameToDomain } = require("../packages/analyzer/lib/classify/websiteType");
const { scoreSubDomains } = require("../packages/analyzer/lib/classify/subDomain");
const { subDomainNames, resolveSubDomain } = require("../packages/analyzer/lib/classify/domainTaxonomy");
const {
  registrableDomain,
  normalizeCrawlUrl,
} = require("../packages/analyzer/lib/crawl/multiPage");
const { generateMajorFunctionalCases } = require("../packages/analyzer/lib/generate/majorFunctionalCases");
const { normalizeTargetUrl } = require("../packages/domain/lib/targetUrl");
const {
  shouldRunDomainInference,
  buildDomainInferenceContext,
  mergeDomainInference,
  applyClassificationToArtifact,
} = require("../services/orchestrator/inferDomain");

function mockPage({ text = "", title = "", description = "" }) {
  return {
    evaluate: jest.fn().mockResolvedValue(text.toLowerCase()),
    title: jest.fn().mockResolvedValue(title),
    $eval: jest.fn().mockResolvedValue(description.toLowerCase()),
  };
}

const INSURANCE_COPY =
  "Buy term insurance online. Compare premium, check policy coverage and claim settlement. " +
  "Health insurance and motor insurance plans for every nominee.";

describe("indicator matching", () => {
  it("respects word boundaries instead of bare substrings", () => {
    expect(matchesIndicator("illustrative examples in documents", "exam")).toBe(false);
    expect(matchesIndicator("book your exam slot", "exam")).toBe(true);
    expect(matchesIndicator("this is likely unrelated", "like")).toBe(false);
    expect(matchesIndicator("tap like to react", "like")).toBe(true);
  });

  it("tolerates plurals and separator styles", () => {
    expect(matchesIndicator("watch movies tonight", "movie")).toBe(true);
    expect(matchesIndicator("branches near you", "branch")).toBe(true);
    expect(matchesIndicator("please sign-up today", "sign up")).toBe(true);
    expect(matchesIndicator("please signup today", "sign up")).toBe(true);
  });

  it("weights multi-word indicators above single words", () => {
    const score = scoreIndicators("add to cart now", ["cart", "add to cart"]);
    expect(score.matched).toEqual(["cart", "add to cart"]);
    expect(score.weighted).toBe(3);
    expect(score.maxWeight).toBe(3);
  });

  it("matches hostname labels without substring false positives", () => {
    expect(matchesHostnameLabel("www.zepto.com", ["zepto", "exam"])).toBe("zepto");
    expect(matchesHostnameLabel("example.com", ["exam"])).toBeNull();
    expect(matchesHostnameLabel("acko.com", ["acko"])).toBe("acko");
  });
});

describe("domain classification", () => {
  it("stays generic when only one loose indicator matches", async () => {
    const page = mockPage({
      text: "This domain is for use in illustrative examples in documents. Learn more.",
      title: "Example Domain",
    });

    const result = await detectWebsiteType(page, "https://example.com");

    expect(result.type).toBe("GENERIC");
    expect(result.typeName).toBe("Website");
    expect(result.confidence).toBe(0);
  });

  it("does not lift a domain from a short sub-domain fragment inside another word", () => {
    expect(matchHostnameToDomain("example.com")).toBeNull();
    expect(matchHostnameToDomain("www.example.com")).toBeNull();
  });

  it("resolves zepto.com to ECOMMERCE from the grocery hostname hint, even with empty page text", async () => {
    const page = mockPage({ text: "", title: "" });

    const result = await detectWebsiteType(page, "https://www.zepto.com");

    expect(result.type).toBe("ECOMMERCE");
    expect(result.typeName).toBe("E-commerce Platform");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.indicators.join(" ")).toMatch(/zepto/i);
  });

  it("keeps domain-level brands on the parent type", () => {
    const match = matchHostnameToDomain("www.amazon.in");
    expect(match.type).toBe("ECOMMERCE");
    expect(match.source).toBe("domain");
  });

  it("reaches the parent domain through sub-domain vocabulary", async () => {
    const page = mockPage({ text: INSURANCE_COPY, title: "Insurance Plans" });

    const result = await detectWebsiteType(page, "https://cover.example");

    expect(result.type).toBe("BANKING_FINANCE");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.candidates[0].matchedVia).toBe("Insurance");
  });
});

describe("sub-domain classification", () => {
  it("picks Insurance under Banking from page copy", () => {
    const { subDomain } = scoreSubDomains({
      domainKey: "BANKING_FINANCE",
      text: INSURANCE_COPY,
      hostname: "cover.example",
      navLabels: ["Claims", "Renew Policy"],
      paths: ["/health-insurance"],
    });

    expect(subDomain).toBeTruthy();
    expect(subDomain.name).toBe("Insurance");
    expect(subDomain.confidence).toBeGreaterThan(0.5);
    expect(subDomain.testPriorities).toEqual(expect.arrayContaining(["Claim Intimation"]));
  });

  it("separates Lending from Insurance inside the same domain", () => {
    const { subDomain } = scoreSubDomains({
      domainKey: "BANKING_FINANCE",
      text: "Apply for a personal loan. Check EMI, interest rate, tenure and disbursal timelines.",
      hostname: "money.example",
    });

    expect(subDomain.name).toBe("Lending and Loans");
  });

  it("uses hostname hints on their own", () => {
    const { subDomain } = scoreSubDomains({
      domainKey: "TRAVEL_BOOKING",
      text: "Plan your next trip",
      hostname: "www.oyorooms.example",
    });

    expect(subDomain.name).toBe("Hotels and Stays");
    expect(subDomain.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("picks Grocery under ECOMMERCE from the zepto hostname", () => {
    const { subDomain } = scoreSubDomains({
      domainKey: "ECOMMERCE",
      text: "",
      hostname: "www.zepto.com",
    });

    expect(subDomain).toBeTruthy();
    expect(subDomain.name).toBe("Grocery and Daily Essentials");
    expect(subDomain.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("returns nothing for domains without a sub-domain tree", () => {
    const result = scoreSubDomains({ domainKey: "GENERIC", text: INSURANCE_COPY });
    expect(result.subDomain).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it("exposes the curated catalog for prompt construction and merges", () => {
    expect(subDomainNames("BANKING_FINANCE")).toEqual(expect.arrayContaining(["Insurance", "Cards"]));
    expect(resolveSubDomain("BANKING_FINANCE", "insurance").key).toBe("INSURANCE");
    expect(resolveSubDomain("BANKING_FINANCE", "INSURANCE").name).toBe("Insurance");
    expect(resolveSubDomain("BANKING_FINANCE", "nope")).toBeNull();
  });
});

describe("crawl scope", () => {
  it("derives the registrable domain across suffix shapes", () => {
    expect(registrableDomain("www.foo.com")).toBe("foo.com");
    expect(registrableDomain("shop.foo.com")).toBe("foo.com");
    expect(registrableDomain("foo.co.uk")).toBe("foo.co.uk");
    expect(registrableDomain("shop.foo.co.uk")).toBe("foo.co.uk");
    expect(registrableDomain("127.0.0.1")).toBe("127.0.0.1");
  });

  it("keeps www and sibling subdomains in scope but rejects other sites", () => {
    expect(normalizeCrawlUrl("https://www.shop.test/about", "https://shop.test/")).toBe(
      "https://www.shop.test/about"
    );
    expect(normalizeCrawlUrl("https://help.shop.test/faq", "https://www.shop.test/")).toBe(
      "https://help.shop.test/faq"
    );
    expect(normalizeCrawlUrl("https://evil.test/x", "https://shop.test/")).toBeNull();
  });

  it("can still be restricted to a single origin", () => {
    expect(
      normalizeCrawlUrl("https://www.shop.test/about", "https://shop.test/", { allowSubdomains: false })
    ).toBeNull();
  });
});

describe("target URL normalisation", () => {
  it("adds a scheme to bare hostnames", () => {
    const result = normalizeTargetUrl("www.example.com");
    expect(result.error).toBeNull();
    expect(result.url).toBe("https://www.example.com/");
    expect(result.normalized).toBe(true);
  });

  it("preserves explicit http and https URLs", () => {
    expect(normalizeTargetUrl("http://example.com/path").url).toBe("http://example.com/path");
    expect(normalizeTargetUrl(" https://example.com ").url).toBe("https://example.com/");
  });

  it("rejects unusable input instead of passing it to the browser", () => {
    expect(normalizeTargetUrl("").error).toMatch(/required/i);
    expect(normalizeTargetUrl("ftp://example.com").error).toMatch(/http/i);
    expect(normalizeTargetUrl("not a url").error).toMatch(/spaces/i);
    expect(normalizeTargetUrl("localhost:3000").error).toMatch(/http/i);
  });
});

describe("domain inference gate and propagation", () => {
  it("runs when the domain is confident but the sub-domain is unknown", () => {
    expect(
      shouldRunDomainInference({
        websiteType: "Banking/Finance Portal",
        websiteTypeConfidence: 0.9,
        subDomainOptions: ["Insurance", "Cards"],
        subDomain: null,
      })
    ).toBe(true);
  });

  it("skips when both domain and sub-domain are already confident", () => {
    expect(
      shouldRunDomainInference({
        websiteType: "Banking/Finance Portal",
        websiteTypeConfidence: 0.9,
        subDomainOptions: ["Insurance", "Cards"],
        subDomain: "Insurance",
        subDomainConfidence: 0.8,
      })
    ).toBe(false);
  });

  it("passes sub-domain options into the LLM context", () => {
    const ctx = buildDomainInferenceContext({
      metadata: { url: "https://cover.example" },
      baInsights: { websiteType: "Banking/Finance Portal", subDomainOptions: ["Insurance"] },
      domainClassification: {
        subDomainCandidates: [{ name: "Insurance", confidence: 0.4, matchedIndicators: ["policy"] }],
      },
    });

    expect(ctx.subDomainOptions).toEqual(["Insurance"]);
    expect(ctx.subDomainCandidates[0].name).toBe("Insurance");
  });

  it("merges an LLM sub-domain reply", () => {
    const merged = mergeDomainInference(
      { websiteType: "Website", websiteTypeConfidence: 0.2 },
      {
        domainLabel: "Banking and Financial Services",
        confidence: 0.82,
        subDomainLabel: "Insurance",
        subDomainConfidence: 0.77,
      }
    );

    expect(merged.websiteType).toBe("Banking and Financial Services");
    expect(merged.subDomain).toBe("Insurance");
    expect(merged.subDomainConfidence).toBeCloseTo(0.77);
    expect(merged.subDomainSource).toBe("llm");
  });

  it("propagates the resolved classification onto metadata and siteOverview", () => {
    const artifact = {
      metadata: { domain: "banking_finance", domainName: "Banking/Finance Portal" },
      siteOverview: { title: "Cover", type: "Banking/Finance Portal" },
      domainClassification: {
        domain: "Banking/Finance Portal",
        domainConfidence: 0.9,
        subDomain: null,
        subDomainCatalog: [
          {
            name: "Insurance",
            testPriorities: ["Claim Intimation", "Policy Renewal"],
            criticalFlows: ["Claim Registration"],
          },
        ],
      },
      baInsights: {
        websiteType: "Banking and Financial Services",
        websiteTypeConfidence: 0.9,
        subDomain: "Insurance",
        subDomainConfidence: 0.77,
        subDomainSource: "llm",
      },
    };

    applyClassificationToArtifact(artifact);

    expect(artifact.metadata.subDomain).toBe("Insurance");
    expect(artifact.metadata.classificationSource).toBe("llm");
    expect(artifact.siteOverview.subDomain).toBe("Insurance");
    expect(artifact.siteOverview.type).toBe("Banking and Financial Services");
    // Curated priorities are recovered from the catalog shipped with the artifact.
    expect(artifact.subDomainTestPriorities).toEqual(["Claim Intimation", "Policy Renewal"]);
    expect(artifact.domainClassification.criticalFlows).toEqual(["Claim Registration"]);
  });

  it("leaves a failed analysis untouched", () => {
    const artifact = {
      analysisFailed: true,
      siteOverview: { title: "Analysis Failed", type: "Unknown" },
      baInsights: { websiteType: "Website" },
    };

    applyClassificationToArtifact(artifact);

    expect(artifact.siteOverview.type).toBe("Unknown");
    expect(artifact.metadata).toBeUndefined();
  });
});

describe("sub-domain driven case generation", () => {
  it("titles and prioritises cases by sub-domain", () => {
    const cases = generateMajorFunctionalCases({
      websiteType: {
        type: "BANKING_FINANCE",
        typeName: "Banking/Finance Portal",
        confidence: 0.9,
        testPriorities: ["Login Security", "Account Management"],
        criticalFlows: ["Secure Login"],
      },
      subDomain: {
        key: "INSURANCE",
        name: "Insurance",
        confidence: 0.8,
        testPriorities: ["Premium Quote Calculator", "Claim Intimation"],
        criticalFlows: ["Claim Registration"],
      },
      crawledPages: [{ url: "https://cover.example/", path: "/" }],
      elements: [],
      userFlows: [],
    });

    const modules = cases.map((tc) => tc.module);
    expect(modules).toEqual(expect.arrayContaining(["Premium Quote Calculator", "Claim Intimation"]));
    expect(cases.every((tc) => tc.title.startsWith("Insurance:"))).toBe(true);
    expect(cases.find((tc) => tc.module === "Claim Intimation")).toMatchObject({
      priority: "Critical",
      traceability: "majorFunctionalCases:subDomainPriority",
      subDomain: "Insurance",
    });
    // Broad domain areas still appear, after the sub-domain ones.
    expect(modules).toEqual(expect.arrayContaining(["Login Security"]));
  });
});

describe("analyzer browser context", () => {
  const {
    ANALYZER_USER_AGENT,
    ANALYZER_BROWSER_CONTEXT,
    DEFAULT_GEOLOCATION,
    LOCATION_LABEL,
  } = require("../packages/analyzer/lib/crawl/settle");

  it("does not use Playwright's headless UA that grocery SPAs serve as an empty shell", () => {
    expect(ANALYZER_USER_AGENT).toMatch(/Chrome\/\d+/);
    expect(ANALYZER_USER_AGENT).not.toMatch(/Headless/i);
    expect(ANALYZER_BROWSER_CONTEXT.userAgent).toBe(ANALYZER_USER_AGENT);
    expect(ANALYZER_BROWSER_CONTEXT.locale).toBe("en-IN");
    expect(ANALYZER_BROWSER_CONTEXT.timezoneId).toBe("Asia/Kolkata");
    expect(ANALYZER_BROWSER_CONTEXT.geolocation).toEqual(DEFAULT_GEOLOCATION);
    expect(ANALYZER_BROWSER_CONTEXT.permissions).toEqual(expect.arrayContaining(["geolocation"]));
    expect(LOCATION_LABEL.test("Detect my location")).toBe(true);
    expect(LOCATION_LABEL.test("Use current location")).toBe(true);
  });
});

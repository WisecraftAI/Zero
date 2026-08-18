"use strict";

const { detectUserFlows } = require("../packages/analyzer/lib/flows/proFlows");
const { createElementContext, createFlow, formsWithPurpose, hasFlowNamed } = require("../packages/analyzer/lib/flows/pro/helpers");
const { buildCommonFlows } = require("../packages/analyzer/lib/flows/pro/commonFlows");
const { buildTypeSpecificFlows } = require("../packages/analyzer/lib/flows/pro/typeFlows");
const {
  buildContactFormFlow,
  buildLoginFormFlow,
  buildGenericSearchFlow,
  buildGenericMediaFlow
} = require("../packages/analyzer/lib/flows/pro/formFlows");

function flowNames(flows) {
  return flows.map((flow) => flow.name);
}

describe("pro flow helpers", () => {
  it("tracks categories and selector limits", () => {
    const ctx = createElementContext([
      { category: "SEARCH", selector: "input.one" },
      { category: "SEARCH", selector: "input.two" },
      { category: "SEARCH", selector: "input.three" },
      { category: "SEARCH", selector: "input.four" },
      { category: "CART", selector: "a.cart" }
    ]);

    expect(ctx.hasCategory("SEARCH")).toBe(true);
    expect(ctx.hasCategory("FOOTER")).toBe(false);
    expect(ctx.elementSelectors("SEARCH")).toEqual(["input.one", "input.two", "input.three"]);
    expect(ctx.elementSelectors("SEARCH", 2)).toEqual(["input.one", "input.two"]);
  });

  it("filters forms and detects existing flow names", () => {
    const forms = [
      { id: "contact-1", purpose: "contact" },
      { id: "login-1", purpose: "login" }
    ];
    const flows = [{ name: "Product Search" }, { name: "Site Navigation" }];

    expect(formsWithPurpose(forms, "contact")).toHaveLength(1);
    expect(hasFlowNamed(flows, "Search")).toBe(true);
    expect(hasFlowNamed(flows, "Video")).toBe(false);
  });

  it("creates optional flow metadata only when provided", () => {
    expect(
      createFlow({
        name: "Minimal",
        priority: "Low",
        description: "desc",
        steps: [],
        assertions: []
      })
    ).toEqual({
      name: "Minimal",
      priority: "Low",
      description: "desc",
      steps: [],
      assertions: []
    });

    expect(
      createFlow({
        name: "Full",
        priority: "High",
        description: "desc",
        steps: [{ action: "verify" }],
        assertions: ["ok"],
        elements: ["#x"],
        formId: "form-1"
      })
    ).toMatchObject({
      elements: ["#x"],
      formId: "form-1"
    });
  });
});

describe("pro common flows", () => {
  it("adds navigation when header or navigation elements exist", () => {
    const ctx = createElementContext([
      { category: "HEADER", selector: "header" },
      { category: "NAVIGATION", selector: "nav a" },
      { category: "NAVIGATION", selector: "nav b" }
    ]);

    const flows = buildCommonFlows(ctx);

    expect(flowNames(flows)).toEqual(["Site Navigation"]);
    expect(flows[0]).toMatchObject({
      priority: "Critical",
      elements: ["nav a", "nav b"]
    });
  });

  it("adds footer verification when footer elements exist", () => {
    const ctx = createElementContext([{ category: "FOOTER", selector: "footer" }]);
    const flows = buildCommonFlows(ctx);

    expect(flowNames(flows)).toEqual(["Footer Verification"]);
  });
});

describe("pro type-specific flows", () => {
  it("builds retail store flows", () => {
    const flows = buildTypeSpecificFlows({ type: "RETAIL_STORE" }, createElementContext([]), []);

    expect(flowNames(flows)).toEqual(["Store/Branch Locator", "Product Categories Browse"]);
  });

  it("builds e-commerce flows only when matching categories exist", () => {
    const withSearchAndCart = buildTypeSpecificFlows(
      { type: "ECOMMERCE" },
      createElementContext([
        { category: "SEARCH", selector: "[data-testid=\"search\"]" },
        { category: "CART", selector: "a.cart" }
      ]),
      []
    );

    expect(flowNames(withSearchAndCart)).toEqual(["Product Search", "Add to Cart"]);
    expect(withSearchAndCart[0].elements).toEqual(['[data-testid="search"]']);

    const withoutCategories = buildTypeSpecificFlows({ type: "ECOMMERCE" }, createElementContext([]), []);
    expect(withoutCategories).toEqual([]);
  });

  it("builds healthcare flows when contact forms or auth are present", () => {
    const withContact = buildTypeSpecificFlows(
      { type: "HEALTHCARE_PHARMA" },
      createElementContext([]),
      [{ id: "contact", purpose: "contact" }]
    );
    expect(flowNames(withContact)).toEqual(
      expect.arrayContaining(["Product/Medicine Information", "Contact/Adverse Event Reporting"])
    );

    const withAuthOnly = buildTypeSpecificFlows(
      { type: "HEALTHCARE_PHARMA" },
      createElementContext([{ category: "AUTH" }]),
      []
    );
    expect(flowNames(withAuthOnly)).toContain("Contact/Adverse Event Reporting");
  });

  it("builds OTT flows and attaches media selectors when media exists", () => {
    const flows = buildTypeSpecificFlows(
      { type: "OTT_STREAMING" },
      createElementContext([{ category: "MEDIA", selector: "video.player" }]),
      []
    );

    expect(flowNames(flows)).toEqual(["Content Discovery", "Video Playback"]);
    expect(flows[1].elements).toEqual(["video.player"]);
  });

  it("builds banking secure login flow", () => {
    const flows = buildTypeSpecificFlows({ type: "BANKING_FINANCE" }, createElementContext([]), []);
    expect(flowNames(flows)).toEqual(["Secure Login"]);
  });

  it("returns no type flows for unknown website types", () => {
    expect(buildTypeSpecificFlows({ type: "CORPORATE" }, createElementContext([]), [])).toEqual([]);
  });
});

describe("pro form and fallback flows", () => {
  it("builds contact form flow with formId", () => {
    const flow = buildContactFormFlow([{ id: "contact-main", purpose: "contact" }]);

    expect(flow).toMatchObject({
      name: "Contact Form Submission",
      formId: "contact-main"
    });
    expect(buildContactFormFlow([])).toBeNull();
  });

  it("builds login flow from login forms or auth category", () => {
    expect(buildLoginFormFlow(createElementContext([]), [{ purpose: "login" }])).toMatchObject({
      name: "User Authentication"
    });
    expect(buildLoginFormFlow(createElementContext([{ category: "AUTH" }]), [])).toMatchObject({
      name: "User Authentication"
    });
    expect(buildLoginFormFlow(createElementContext([]), [])).toBeNull();
  });

  it("skips generic search when a search flow already exists", () => {
    const ctx = createElementContext([{ category: "SEARCH", selector: "input.search" }]);
    const existing = [{ name: "Product Search" }];

    expect(buildGenericSearchFlow(ctx, existing)).toBeNull();
    expect(buildGenericSearchFlow(ctx, [])).toMatchObject({ name: "Site Search" });
  });

  it("skips generic media when a video flow already exists", () => {
    const ctx = createElementContext([{ category: "MEDIA", selector: "video" }]);
    const existing = [{ name: "Video Playback" }];

    expect(buildGenericMediaFlow(ctx, existing)).toBeNull();
    expect(buildGenericMediaFlow(ctx, [])).toMatchObject({ name: "Media Content Playback" });
  });
});

describe("detectUserFlows integration", () => {
  it("assembles common, e-commerce, and auth flows without duplicate search", () => {
    const flows = detectUserFlows(
      { type: "ECOMMERCE" },
      [
        { category: "NAVIGATION", selector: "nav" },
        { category: "SEARCH", selector: "input[type=\"search\"]" },
        { category: "CART", selector: "a[href*=\"cart\"]" }
      ],
      [{ id: "login", purpose: "login" }]
    );

    expect(flowNames(flows)).toEqual(
      expect.arrayContaining(["Site Navigation", "Product Search", "Add to Cart", "User Authentication"])
    );
    expect(flowNames(flows).filter((name) => name.includes("Search"))).toHaveLength(1);
  });

  it("adds generic search and media flows for corporate sites", () => {
    const flows = detectUserFlows(
      { type: "CORPORATE" },
      [
        { category: "FOOTER", selector: "footer" },
        { category: "SEARCH", selector: "input.search" },
        { category: "MEDIA", selector: "video.hero" }
      ],
      [{ id: "contact", purpose: "contact" }]
    );

    expect(flowNames(flows)).toEqual(
      expect.arrayContaining([
        "Footer Verification",
        "Contact Form Submission",
        "Site Search",
        "Media Content Playback"
      ])
    );
  });

  it("returns an empty list when no signals are present", () => {
    expect(detectUserFlows({ type: "CORPORATE" }, [], [])).toEqual([]);
  });

  it("preserves step and assertion shape for downstream test generation", () => {
    const flows = detectUserFlows(
      { type: "BANKING_FINANCE" },
      [{ category: "NAVIGATION", selector: "nav" }],
      []
    );

    const secureLogin = flows.find((flow) => flow.name === "Secure Login");
    expect(secureLogin.steps.every((step) => step.action && step.target && step.description)).toBe(true);
    expect(secureLogin.assertions.length).toBeGreaterThan(0);
  });
});

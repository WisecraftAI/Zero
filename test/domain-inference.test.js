"use strict";

const { createLlm, PROMPT_VERSIONS } = require("@zero/orchestrator/llm");
const {
  shouldRunDomainInference,
  buildDomainInferenceContext,
} = require("../services/orchestrator/inferDomain");

function mockHttp(handler) {
  return {
    async post(url, body, config) {
      return handler({ url, body, headers: (config && config.headers) || {} });
    },
  };
}

describe("Q4 AI domain inference gate", () => {
  it("defines domainInference prompt version", () => {
    expect(PROMPT_VERSIONS.domainInference).toBeTruthy();
    expect(PROMPT_VERSIONS.domainInference.version).toMatch(/domainInference/);
  });

  it("shouldRunDomainInference triggers for low confidence or generic type", () => {
    expect(shouldRunDomainInference({ websiteTypeConfidence: 0.3, websiteType: "E-commerce" })).toBe(true);
    expect(shouldRunDomainInference({ websiteTypeConfidence: 0.9, websiteType: "Generic Website" })).toBe(true);
    expect(shouldRunDomainInference({ websiteTypeConfidence: 0.9, websiteType: "E-commerce Platform" })).toBe(false);
  });

  it("buildDomainInferenceContext includes crawl snapshot fields", () => {
    const ctx = buildDomainInferenceContext({
      metadata: { url: "https://unknown.example" },
      baInsights: { websiteType: "Website", websiteTypeConfidence: 0.2 },
      crawledPages: [{ url: "https://unknown.example/", title: "Home", path: "/", navLabels: ["Pricing"] }],
      allElements: { NAVIGATION: [{}, {}], FORMS: [{}] },
      forms: [{ purpose: "contact", fieldCount: 3 }],
      userFlows: [{ name: "Sign Up Flow" }],
    });
    expect(ctx.url).toBe("https://unknown.example");
    expect(ctx.crawledPages.length).toBe(1);
    expect(ctx.elementCategories.NAVIGATION).toBe(2);
    expect(ctx.userFlowNames).toContain("Sign Up Flow");
  });

  it("enriches baInsights with inferredDomain when LLM key exists", async () => {
    const llm = createLlm({
      http: mockHttp(() => ({
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      domainLabel: "B2B SaaS Platform",
                      confidence: 0.78,
                      testPriorities: ["Pricing", "Sign Up", "Docs"],
                      criticalFlows: ["Trial Sign Up", "Feature Tour"],
                      summary: "Marketing site for a SaaS product.",
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 20 },
        },
      })),
    });

    const template = {
      websiteType: "Website",
      websiteTypeConfidence: 0.2,
      metadata: {},
    };

    const out = await llm.enrichAgent({
      agent: "domainInference",
      template,
      context: { url: "https://unknown.example" },
      store: {
        getKey: async () => "test-gemini-key",
        getSettings: async () => ({ provider: "gemini", model: "gemini-2.0-flash" }),
      },
      runId: "r-domain",
    });

    expect(out.inferredDomain).toBe("B2B SaaS Platform");
    expect(out.inferredTestPriorities).toEqual(expect.arrayContaining(["Pricing"]));
    expect(out.metadata.llm.used).toBe(true);
  });

  it("falls back without key and leaves template unchanged", async () => {
    const llm = createLlm({
      http: mockHttp(() => {
        throw new Error("should not call provider");
      }),
    });
    const template = { websiteType: "Website", websiteTypeConfidence: 0.2, metadata: {} };
    const out = await llm.enrichAgent({
      agent: "domainInference",
      template,
      store: { getKey: async () => null, getSettings: async () => null },
      runId: "r-domain",
    });
    expect(out.websiteType).toBe("Website");
    expect(out.metadata.llm.used).toBe(false);
    expect(out.inferredDomain).toBeUndefined();
  });
});

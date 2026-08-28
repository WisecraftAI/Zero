"use strict";

const {
  extractMemory,
  mergeMemory,
  compactPriorMemory,
  sanitizeValue,
  createAgentMemoryStore
} = require("@zero/orchestrator/agentMemory");
const { createProcessRun } = require("@zero/orchestrator");

describe("agentic memory", () => {
  it("extracts BA summary only when the LLM actually enriched the artifact", () => {
    expect(
      extractMemory("ba", {
        requirementStatements: ["Home must render"],
        metadata: { llm: { used: false } }
      })
    ).toBeNull();

    const extracted = extractMemory("ba", {
      llmSummary: "Checkout is guest-only; cart persists in localStorage.",
      requirementStatements: ["Home must render", "Guest checkout must complete"],
      metadata: { llm: { used: true, promptVersion: "ba.v4" } }
    });
    expect(extracted.summary).toMatch(/guest-only/i);
    expect(extracted.notes).toContain("Guest checkout must complete");
  });

  it("keeps only LLM-suggested extra cases and automation hints", () => {
    expect(
      extractMemory("manualQa", {
        testCases: [
          { id: "TC-001", module: "Home", scenario: "Load home", type: "functional" },
          { id: "LLM-1", module: "Cart", scenario: "Apply expired coupon", type: "llm_suggested" }
        ]
      })
    ).toEqual({
      extraScenarios: [{ module: "Cart", scenario: "Apply expired coupon" }]
    });

    expect(extractMemory("automationQa", { llmHints: ["role=button[name=Cart]"] })).toEqual({
      hints: ["role=button[name=Cart]"]
    });
    expect(extractMemory("domainInference", { websiteType: "ECOMMERCE", inferredDomain: "ECOMMERCE" })).toBeNull();
  });

  it("records execution totals and failed ids without secrets", () => {
    const extracted = extractMemory("execution", {
      totals: { passed: 3, failed: 1, total: 4 },
      tests: [
        { id: "flow-login", status: "failed", error: "timeout password=hunter2" },
        { id: "flow-home", status: "passed" }
      ]
    });
    expect(extracted.totals).toEqual({ passed: 3, failed: 1, total: 4 });
    expect(extracted.failed).toHaveLength(1);
    expect(extracted.failed[0].id).toBe("flow-login");
    expect(extracted.failed[0].error).toMatch(/password=\[redacted\]/i);

    const dirty = sanitizeValue({
      loginPassword: "must-not-land",
      apiKey: "sk-abcdefghijklmnopqrstuvwxyz",
      summary: "Cookie banner on first visit"
    });
    expect(dirty.loginPassword).toBeUndefined();
    expect(dirty.apiKey).toBeUndefined();
    expect(dirty.summary).toMatch(/Cookie banner/);
  });

  it("merges new hints in front of prior ones and caps the list", () => {
    const merged = mergeMemory(
      "automationQa",
      { hints: ["data-testid=minicart"] },
      { hints: ["#cart", "data-testid=minicart"] }
    );
    expect(merged.hints[0]).toBe("data-testid=minicart");
    expect(merged.hints).toEqual(["data-testid=minicart", "#cart"]);
  });

  it("recalls compact prior memory from the in-memory map across saves", async () => {
    const store = createAgentMemoryStore({ agentMemory: new Map() });
    await store.save({
      tenantId: "local",
      host: "shop.example.com",
      agent: "ba",
      run: { id: "r1" },
      artifact: {
        llmSummary: "Grocery catalog with slot booking.",
        metadata: { llm: { used: true } }
      }
    });
    await store.save({
      tenantId: "local",
      host: "shop.example.com",
      agent: "execution",
      run: { id: "r1" },
      artifact: {
        totals: { passed: 2, failed: 1, total: 3 },
        tests: [{ id: "slot-book", status: "failed", error: "calendar not visible" }]
      }
    });

    const recalled = await store.load("local", "shop.example.com");
    expect(recalled.ba.summary).toMatch(/Grocery/);
    expect(recalled.execution.failed[0].id).toBe("slot-book");
    expect(recalled.domainInference).toBeUndefined();
    expect(compactPriorMemory([{ agent: "ba", memory: recalled.ba }]).ba.summary).toMatch(/Grocery/);
  });

  it("injects recalled memory into later LLM contexts and stamps the artifact", async () => {
    const memoryStore = createAgentMemoryStore({ agentMemory: new Map() });
    await memoryStore.save({
      tenantId: "local",
      host: "example.com",
      agent: "automationQa",
      run: { id: "r0" },
      artifact: { llmHints: ["getByRole('button', { name: 'Sign in' })"] }
    });

    const llmContexts = [];
    const run = {
      id: "r2",
      status: "queued",
      tenantId: "local",
      input: {
        ottUrl: "https://example.com",
        executionMode: "manual_tc_only",
        manualTestCases: [{ feature: "Home", scenario: "Load", expectedResult: "OK" }]
      },
      stages: {
        ba: { label: "BA", status: "pending" },
        manualQa: { label: "MQA", status: "pending" },
        automationQa: { label: "AUTO", status: "pending" },
        execution: { label: "EXEC", status: "pending" },
        manager: { label: "MGR", status: "pending" },
        delivery: { label: "DEL", status: "pending" }
      },
      artifacts: {}
    };

    const processRun = createProcessRun({
      cache: { async get() { return null; } },
      getRun: async () => run,
      persistRun: async () => {},
      persistAssets: async () => {},
      setStage: (r, key, status) => {
        if (!r.stages[key]) r.stages[key] = { label: key, status };
        else r.stages[key].status = status;
      },
      applyLlm: async (agent, template, _run, context) => {
        llmContexts.push({ agent, context });
        if (agent === "ba") {
          return {
            ...template,
            llmSummary: "Home is a marketing landing page.",
            metadata: { llm: { used: true } }
          };
        }
        return template;
      },
      consolidateRequirements: () => ({ requirementStatements: ["Home must render"] }),
      generateCasesFromUploadedOnly: () => ({ testCases: [] }),
      generateCasesFromManualInput: (cases) => ({ testCases: cases }),
      generateCasesFromUrlAnalysis: () => ({ testCases: [] }),
      generateManualCases: () => ({ testCases: [] }),
      generateAutomationBundle: async () => ({ selectorCandidates: {} }),
      hostFromUrl: () => "example.com",
      enqueueExecution: async () => ({
        totals: { passed: 1, failed: 0, total: 1, passRate: "100%" },
        tests: [{ id: "home", status: "passed" }]
      }),
      generateManagerReport: () => ({ executiveSummary: {}, analysis: {}, actionPlan: [] }),
      generateDeliveryReport: () => ({}),
      javaSeleniumBuilder: { buildSeleniumJavaTest: () => "" },
      dbHelpers: {},
      memoryStore
    });

    await processRun("r2");

    const baCall = llmContexts.find((row) => row.agent === "ba");
    expect(baCall.context.priorMemory.automationQa.hints[0]).toMatch(/Sign in/);
    expect(run.artifacts.agentMemory.recalled).toContain("automationQa");
    expect(run.artifacts.agentMemory.wrote).toEqual(expect.arrayContaining(["ba", "execution"]));

    const recalled = await memoryStore.load("local", "example.com");
    expect(recalled.ba.summary).toMatch(/marketing landing/i);
  });
});

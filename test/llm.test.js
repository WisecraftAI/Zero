const { createLlm, parseJsonContent, redact, ownerEmailForRun, PROMPT_VERSIONS } = require("../lib/llm");

function mockHttp(handler) {
  return {
    async post(url, body, config) {
      return handler({ url, body, headers: (config && config.headers) || {} });
    }
  };
}

describe("M6 LLM wiring", () => {
  it("falls back to the template when no key is configured", async () => {
    const llm = createLlm({
      http: mockHttp(() => {
        throw new Error("should not call provider");
      })
    });
    const template = { requirementStatements: ["Shell must render"], metadata: { source: "BA Agent" } };
    const out = await llm.enrichAgent({
      agent: "ba",
      template,
      store: { getKey: async () => null, getSettings: async () => null },
      runId: "r1"
    });
    expect(out.requirementStatements).toEqual(["Shell must render"]);
    expect(out.metadata.llm.used).toBe(false);
    expect(out.metadata.llm.fallbackReason).toBe("no_key");
  });

  it("invokes OpenAI chat.completions with a valid key and merges BA extras", async () => {
    const calls = [];
    const llm = createLlm({
      http: mockHttp(({ url, body, headers }) => {
        calls.push({ url, body, headers });
        return {
          data: {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    extraRequirements: ["Playback must recover after a mid-stream error"],
                    summary: "Coverage looks thin on resume."
                  })
                }
              }
            ],
            usage: { prompt_tokens: 40, completion_tokens: 20 }
          }
        };
      })
    });

    const out = await llm.enrichAgent({
      agent: "ba",
      template: { requirementStatements: ["Shell must render"], metadata: { source: "BA Agent" } },
      context: { ottUrl: "https://example.com" },
      store: {
        getKey: async (provider) => (provider === "openai" ? "sk-test-openai-key" : null),
        getSettings: async () => ({ provider: "openai", model: "gpt-4o-mini" })
      },
      runId: "r2"
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(calls[0].headers.Authorization).toBe("Bearer sk-test-openai-key");
    expect(out.metadata.llm.used).toBe(true);
    expect(out.metadata.llm.provider).toBe("openai");
    expect(out.metadata.llm.promptVersion).toBe(PROMPT_VERSIONS.ba.version);
    expect(out.requirementStatements).toContain("Playback must recover after a mid-stream error");
    expect(out.llmSummary).toMatch(/resume/i);
  });

  it("calls Anthropic and Gemini endpoints", async () => {
    const urls = [];
    const llm = createLlm({
      http: mockHttp(({ url }) => {
        urls.push(url);
        if (url.includes("anthropic")) {
          return {
            data: {
              content: [{ text: JSON.stringify({ narrative: "Hold", extraActions: ["Fix login"] }) }],
              usage: { input_tokens: 10, output_tokens: 8 }
            }
          };
        }
        return {
          data: {
            candidates: [{ content: { parts: [{ text: JSON.stringify({ hints: ["prefer data-testid"] }) }] } }],
            usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 5 }
          }
        };
      })
    });

    const manager = await llm.enrichAgent({
      agent: "manager",
      template: { actionPlan: ["Review"], analysis: {}, metadata: { source: "Manager Agent" } },
      store: {
        getKey: async (p) => (p === "claude" ? "sk-ant-test" : null),
        getSettings: async () => ({ provider: "claude" })
      },
      runId: "r3"
    });
    expect(urls[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(manager.analysis.llmNarrative).toBe("Hold");

    const auto = await llm.enrichAgent({
      agent: "automationQa",
      template: { metadata: {} },
      store: {
        getKey: async (p) => (p === "gemini" ? "AIza-test" : null),
        getSettings: async () => ({ provider: "gemini" })
      },
      runId: "r4"
    });
    expect(urls[1]).toMatch(/generativelanguage\.googleapis\.com/);
    expect(auto.llmHints).toContain("prefer data-testid");
  });

  it("enforces a cost cap before calling the provider", async () => {
    let hits = 0;
    const llm = createLlm({
      maxUsdPerRun: 0,
      http: mockHttp(() => {
        hits += 1;
        return { data: { choices: [{ message: { content: "{}" } }] } };
      })
    });
    const out = await llm.enrichAgent({
      agent: "ba",
      template: { requirementStatements: [], metadata: {} },
      store: { getKey: async () => "sk-test", getSettings: async () => ({ provider: "openai" }) },
      runId: "cap"
    });
    expect(out.metadata.llm.fallbackReason).toBe("cost_cap");
    expect(hits).toBe(0);
  });

  it("enforces a per-minute rate limit", async () => {
    let hits = 0;
    const llm = createLlm({
      rpm: 1,
      maxUsdPerRun: 1,
      http: mockHttp(() => {
        hits += 1;
        return {
          data: {
            choices: [{ message: { content: "{\"extraRequirements\":[\"x\"]}" } }],
            usage: { prompt_tokens: 1, completion_tokens: 1 }
          }
        };
      })
    });
    const store = {
      getKey: async () => "sk-test",
      getSettings: async () => ({ provider: "openai" })
    };
    const ok = await llm.enrichAgent({
      agent: "ba",
      template: { requirementStatements: [], metadata: {} },
      store,
      runId: "ok"
    });
    expect(ok.metadata.llm.used).toBe(true);
    const limited = await llm.enrichAgent({
      agent: "ba",
      template: { requirementStatements: [], metadata: {} },
      store,
      runId: "ok"
    });
    expect(limited.metadata.llm.fallbackReason).toBe("rate_limit");
    expect(hits).toBe(1);
  });

  it("redacts keys and parses fenced JSON", () => {
    expect(redact("sk-abcdefghijklmnop")).toBe("••••mnop");
    expect(parseJsonContent("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(ownerEmailForRun({ tenantId: "local" })).toBe("default@local");
    expect(ownerEmailForRun({ tenantId: "acme", input: {} })).toBe("acme@local");
  });
});

/**
 * LLM wiring (M6).
 *
 * Orchestrator agents call Claude / OpenAI / Gemini when a decrypted
 * provider key exists. Template output always remains the base; LLM
 * enrichment is best-effort. Rate limits, cost caps, and prompt versions
 * apply. Keys are never logged.
 */

"use strict";

const axios = require("axios");

const PROMPT_VERSIONS = {
  ba: {
    version: "ba.v1",
    system:
      "You are a BA for streaming/OTT QA. Reply with JSON only: " +
      '{"extraRequirements":["..."],"summary":"..."}. No markdown.'
  },
  manager: {
    version: "manager.v1",
    system:
      "You are a QA manager. Reply with JSON only: " +
      '{"narrative":"...","extraActions":["..."]}. No markdown.'
  },
  manualQa: {
    version: "manualQa.v1",
    system:
      "You suggest extra manual test cases. Reply with JSON only: " +
      '{"extraCases":[{"id":"LLM-1","module":"...","scenario":"...","priority":"P2","steps":["..."],"expectedResult":"..."}]}. No markdown.'
  },
  automationQa: {
    version: "automationQa.v1",
    system:
      "You suggest locator/automation hints. Reply with JSON only: " +
      '{"hints":["..."]}. No markdown.'
  }
};

const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  claude: "claude-3-5-haiku-latest",
  gemini: "gemini-2.0-flash"
};

const COST_PER_MTOK = {
  openai: { in: 0.15, out: 0.6 },
  claude: { in: 0.8, out: 4 },
  gemini: { in: 0.1, out: 0.4 }
};

function redact(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length <= 8) return "••••";
  return `••••${s.slice(-4)}`;
}

function estimateCost(provider, usage) {
  const table = COST_PER_MTOK[provider] || COST_PER_MTOK.openai;
  const input = Number((usage && usage.prompt_tokens) || 0);
  const output = Number((usage && usage.completion_tokens) || 0);
  return (input * table.in + output * table.out) / 1_000_000;
}

function parseJsonContent(text) {
  if (!text) return null;
  const trimmed = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function stampLlm(target, meta) {
  if (!target || typeof target !== "object") return target;
  if (!target.metadata) target.metadata = {};
  target.metadata.llm = {
    used: Boolean(meta.used),
    provider: meta.provider || null,
    model: meta.model || null,
    promptVersion: meta.promptVersion || null,
    fallbackReason: meta.fallbackReason || null,
    costUsd: meta.costUsd || 0
  };
  return target;
}

function createLlm(options = {}) {
  const http = options.http || axios;
  const logger = options.logger || console;
  const env = options.env || process.env;
  const rpm = Math.max(1, Number(options.rpm ?? env.ZERO_LLM_RPM ?? 20));
  const maxUsdPerRun = Math.max(0, Number(options.maxUsdPerRun ?? env.ZERO_LLM_MAX_USD_PER_RUN ?? 0.5));
  const timeoutMs = Math.max(1000, Number(options.timeoutMs ?? env.ZERO_LLM_TIMEOUT_MS ?? 8000));
  const windowMs = 60_000;
  const calls = [];
  const spendByRun = new Map();

  function resetGuards() {
    calls.length = 0;
    spendByRun.clear();
  }

  function checkRateLimit() {
    const now = Date.now();
    while (calls.length && now - calls[0] > windowMs) calls.shift();
    if (calls.length >= rpm) return false;
    calls.push(now);
    return true;
  }

  function checkCost(runId) {
    const spent = spendByRun.get(runId) || 0;
    return spent < maxUsdPerRun;
  }

  function addSpend(runId, usd) {
    spendByRun.set(runId, (spendByRun.get(runId) || 0) + usd);
  }

  async function callProvider({ provider, apiKey, model, messages, system }) {
    if (!apiKey) {
      const err = new Error("API key required");
      err.code = "no_key";
      throw err;
    }
    const name = String(provider || "").toLowerCase();
    const chosen = model || DEFAULT_MODELS[name] || DEFAULT_MODELS.openai;

    if (name === "openai") {
      const res = await http.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: chosen,
          temperature: 0.2,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages
          ]
        },
        {
          timeout: timeoutMs,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      const data = res.data || {};
      return {
        provider: "openai",
        model: chosen,
        content: data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : "",
        usage: data.usage || {}
      };
    }

    if (name === "claude") {
      const res = await http.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: chosen,
          max_tokens: 1024,
          system: system || undefined,
          messages
        },
        {
          timeout: timeoutMs,
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          }
        }
      );
      const data = res.data || {};
      const text = Array.isArray(data.content)
        ? data.content.map((p) => p.text || "").join("")
        : "";
      return {
        provider: "claude",
        model: chosen,
        content: text,
        usage: {
          prompt_tokens: (data.usage && data.usage.input_tokens) || 0,
          completion_tokens: (data.usage && data.usage.output_tokens) || 0
        }
      };
    }

    if (name === "gemini") {
      const res = await http.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${chosen}:generateContent`,
        {
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }))
        },
        {
          timeout: timeoutMs,
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json"
          }
        }
      );
      const data = res.data || {};
      const text =
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts
          ? data.candidates[0].content.parts.map((p) => p.text || "").join("")
          : "";
      const usage = data.usageMetadata || {};
      return {
        provider: "gemini",
        model: chosen,
        content: text,
        usage: {
          prompt_tokens: usage.promptTokenCount || 0,
          completion_tokens: usage.candidatesTokenCount || 0
        }
      };
    }

    const err = new Error(`Unknown provider: ${name}`);
    err.code = "unknown_provider";
    throw err;
  }

  async function pickBinding(store, agent) {
    if (!store || typeof store.getKey !== "function") return null;
    const settings = store.getSettings
      ? await store.getSettings(agent)
      : null;
    const preferred = settings && settings.provider;
    const order = preferred
      ? [preferred, "openai", "claude", "gemini"]
      : ["openai", "claude", "gemini"];
    const seen = new Set();
    for (const provider of order) {
      if (!provider || seen.has(provider)) continue;
      seen.add(provider);
      const key = await store.getKey(provider);
      if (key) {
        return {
          provider,
          apiKey: key,
          model: (settings && settings.model) || DEFAULT_MODELS[provider],
          prompt: settings && settings.prompt
        };
      }
    }
    return null;
  }

  async function enrichAgent({ agent, template, context, store, runId }) {
    const spec = PROMPT_VERSIONS[agent];
    const base = template && typeof template === "object" ? template : {};
    if (String(env.ZERO_LLM || "").toLowerCase() === "off") {
      return stampLlm(base, { used: false, fallbackReason: "disabled" });
    }
    if (!spec) {
      return stampLlm(base, { used: false, fallbackReason: "unknown_agent" });
    }

    const binding = await pickBinding(store, agent);
    if (!binding) {
      return stampLlm(base, { used: false, fallbackReason: "no_key" });
    }
    if (!checkRateLimit()) {
      logger.warn(`[llm] ${agent} skipped: rate_limit (rpm=${rpm})`);
      return stampLlm(base, {
        used: false,
        provider: binding.provider,
        model: binding.model,
        promptVersion: spec.version,
        fallbackReason: "rate_limit"
      });
    }
    if (!checkCost(runId || "global")) {
      logger.warn(`[llm] ${agent} skipped: cost_cap (maxUsd=${maxUsdPerRun})`);
      return stampLlm(base, {
        used: false,
        provider: binding.provider,
        model: binding.model,
        promptVersion: spec.version,
        fallbackReason: "cost_cap"
      });
    }

    const userPrompt = [
      binding.prompt ? `Custom instructions:\n${binding.prompt}\n` : "",
      `Agent: ${agent}`,
      `Context JSON:\n${JSON.stringify(context || {}).slice(0, 6000)}`
    ].join("\n");

    try {
      const result = await callProvider({
        provider: binding.provider,
        apiKey: binding.apiKey,
        model: binding.model,
        system: spec.system,
        messages: [{ role: "user", content: userPrompt }]
      });
      const costUsd = estimateCost(binding.provider, result.usage);
      addSpend(runId || "global", costUsd);
      logger.info(
        `[llm] ${agent} ${binding.provider} ${result.model} v=${spec.version} ` +
          `tokens=${(result.usage.prompt_tokens || 0) + (result.usage.completion_tokens || 0)} ` +
          `cost=${costUsd.toFixed(6)} key=${redact(binding.apiKey)}`
      );

      const parsed = parseJsonContent(result.content);
      applyEnrichment(agent, base, parsed);
      return stampLlm(base, {
        used: true,
        provider: binding.provider,
        model: result.model,
        promptVersion: spec.version,
        costUsd
      });
    } catch (err) {
      const message = err && err.message ? err.message : "llm_error";
      logger.warn(`[llm] ${agent} fallback: ${message.replace(/sk-[a-zA-Z0-9-]+/g, "sk-••••")}`);
      return stampLlm(base, {
        used: false,
        provider: binding.provider,
        model: binding.model,
        promptVersion: spec.version,
        fallbackReason: err.code || "provider_error"
      });
    }
  }

  return {
    callProvider,
    enrichAgent,
    pickBinding,
    resetGuards,
    estimateCost,
    getSpend: (runId) => spendByRun.get(runId) || 0
  };
}

function applyEnrichment(agent, target, parsed) {
  if (!parsed || typeof parsed !== "object") return;

  if (agent === "ba") {
    const extra = Array.isArray(parsed.extraRequirements)
      ? parsed.extraRequirements.map(String).filter(Boolean).slice(0, 8)
      : [];
    if (extra.length) {
      target.requirementStatements = [...new Set([...(target.requirementStatements || []), ...extra])];
    }
    if (parsed.summary) target.llmSummary = String(parsed.summary).slice(0, 2000);
    if (target.metadata) target.metadata.source = `${target.metadata.source || "BA Agent"} + LLM`;
  }

  if (agent === "manager") {
    if (parsed.narrative) {
      if (!target.analysis) target.analysis = {};
      target.analysis.llmNarrative = String(parsed.narrative).slice(0, 4000);
    }
    const extras = Array.isArray(parsed.extraActions)
      ? parsed.extraActions.map(String).filter(Boolean).slice(0, 5)
      : [];
    if (extras.length) {
      target.actionPlan = [...(target.actionPlan || []), ...extras];
    }
    if (target.metadata) target.metadata.source = `${target.metadata.source || "Manager Agent"} + LLM`;
  }

  if (agent === "manualQa") {
    const extras = Array.isArray(parsed.extraCases) ? parsed.extraCases.slice(0, 3) : [];
    if (!target.testCases) target.testCases = [];
    extras.forEach((raw, i) => {
      if (!raw || !raw.scenario) return;
      target.testCases.push({
        id: String(raw.id || `LLM-${i + 1}`),
        module: String(raw.module || "LLM"),
        scenario: String(raw.scenario),
        priority: raw.priority || "P2",
        preconditions: raw.preconditions || "",
        steps: Array.isArray(raw.steps) ? raw.steps.map(String) : [String(raw.scenario)],
        expectedResult: String(raw.expectedResult || "Behaves as specified"),
        type: "llm_suggested"
      });
    });
  }

  if (agent === "automationQa") {
    const hints = Array.isArray(parsed.hints) ? parsed.hints.map(String).slice(0, 8) : [];
    if (hints.length) target.llmHints = hints;
  }
}

function envKey(provider, env = process.env) {
  if (String(env.ZERO_LLM_ENV_KEYS || "").toLowerCase() !== "1") return null;
  if (provider === "openai") return env.OPENAI_API_KEY || null;
  if (provider === "claude") return env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || null;
  if (provider === "gemini") return env.GEMINI_API_KEY || env.GOOGLE_API_KEY || null;
  return null;
}

function ownerEmailForRun(run) {
  if (run && run.input && run.input.ownerEmail) return run.input.ownerEmail;
  const tenant = (run && run.tenantId) || "local";
  return tenant === "local" ? "default@local" : `${tenant}@local`;
}

const defaultLlm = createLlm();

module.exports = {
  PROMPT_VERSIONS,
  DEFAULT_MODELS,
  createLlm,
  callProvider: defaultLlm.callProvider,
  enrichAgent: defaultLlm.enrichAgent,
  resetGuards: defaultLlm.resetGuards,
  estimateCost,
  parseJsonContent,
  redact,
  envKey,
  ownerEmailForRun
};

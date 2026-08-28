/**
 * LLM wiring (M6).
 *
 * Orchestrator agents call Claude / OpenAI / Gemini when a decrypted
 * provider key exists. Template output always remains the base; LLM
 * enrichment is best-effort. Rate limits, cost caps, and prompt versions
 * apply. Keys are never logged.
 *
 * `enrichAgent` never throws: every failure path returns the template with a
 * `metadata.llm` stamp explaining why the model was not used.
 */

"use strict";

const axios = require("axios");

const { PROMPT_VERSIONS } = require("./prompts");
const { applyEnrichment, stampLlm } = require("./enrichment");
const {
  DEFAULT_MODELS,
  SUPPORTED_PROVIDERS,
  createProviderCaller,
  estimateCost,
  isSupportedProvider,
  normalizeProvider
} = require("./providers");
const {
  parseJsonContent,
  providerFailure,
  redact,
  resolveNumber
} = require("./utils");

const DEFAULTS = { rpm: 20, maxUsdPerRun: 0.5, timeoutMs: 8000 };
const MIN_TIMEOUT_MS = 1000;
const RATE_WINDOW_MS = 60_000;
/**
 * Context budget. Agents now receive a crawl fact sheet, so this has to fit a
 * real site description; the marker below keeps a cut payload obvious to the
 * model rather than handing it JSON that just stops mid-object.
 */
const CONTEXT_CHARS = 12000;
const TRUNCATION_MARKER = "\n…context truncated…";
/** Ceiling on per-run spend entries so a long-lived worker cannot leak memory. */
const MAX_TRACKED_RUNS = 500;
/** Fallback probe order when the agent has no usable provider preference. */
const PROVIDER_ORDER = ["gemini", "openai", "claude"];

function safeStringify(value) {
  try {
    const json = JSON.stringify(value ?? {});
    if (json.length <= CONTEXT_CHARS) return json;
    return json.slice(0, CONTEXT_CHARS) + TRUNCATION_MARKER;
  } catch {
    return "{}";
  }
}

function buildUserPrompt(agent, context, customPrompt) {
  return [
    customPrompt ? `Custom instructions:\n${customPrompt}\n` : "",
    `Agent: ${agent}`,
    `Context JSON:\n${safeStringify(context)}`
  ]
    .filter(Boolean)
    .join("\n");
}

function createLlm(options = {}) {
  const http = options.http || axios;
  const logger = options.logger || console;
  const env = options.env || process.env;
  const rpm = resolveNumber([options.rpm, env.ZERO_LLM_RPM], DEFAULTS.rpm, 1);
  const maxUsdPerRun = resolveNumber(
    [options.maxUsdPerRun, env.ZERO_LLM_MAX_USD_PER_RUN],
    DEFAULTS.maxUsdPerRun,
    0
  );
  const timeoutMs = resolveNumber(
    [options.timeoutMs, env.ZERO_LLM_TIMEOUT_MS],
    DEFAULTS.timeoutMs,
    MIN_TIMEOUT_MS
  );

  const callProvider = createProviderCaller({ http, timeoutMs });
  const callTimes = [];
  const spendByRun = new Map();

  function resetGuards() {
    callTimes.length = 0;
    spendByRun.clear();
  }

  /** Reserves one slot in the sliding per-minute window. */
  function consumeRateSlot() {
    const now = Date.now();
    while (callTimes.length && now - callTimes[0] > RATE_WINDOW_MS) callTimes.shift();
    if (callTimes.length >= rpm) return false;
    callTimes.push(now);
    return true;
  }

  function withinCostCap(runKey) {
    return (spendByRun.get(runKey) || 0) < maxUsdPerRun;
  }

  function addSpend(runKey, usd) {
    spendByRun.set(runKey, (spendByRun.get(runKey) || 0) + usd);
    for (const key of spendByRun.keys()) {
      if (spendByRun.size <= MAX_TRACKED_RUNS) break;
      if (key !== runKey) spendByRun.delete(key);
    }
  }

  function llmDisabled() {
    return String(env.ZERO_LLM || "").trim().toLowerCase() === "off";
  }

  /**
   * Resolves the provider/model/key triple for an agent: the configured
   * provider first, then the remaining providers that have a stored key.
   */
  async function pickBinding(store, agent) {
    if (!store || typeof store.getKey !== "function") return null;

    const settings =
      typeof store.getSettings === "function" ? await store.getSettings(agent) : null;
    const preferred =
      settings && isSupportedProvider(settings.provider)
        ? normalizeProvider(settings.provider)
        : null;

    const seen = new Set();
    for (const provider of preferred ? [preferred, ...PROVIDER_ORDER] : PROVIDER_ORDER) {
      if (seen.has(provider)) continue;
      seen.add(provider);

      const apiKey = await store.getKey(provider);
      if (!apiKey) continue;

      // A configured model belongs to the provider it was configured for;
      // never carry it over to a fallback provider.
      const configuredModel = provider === preferred && settings ? settings.model : null;
      return {
        provider,
        apiKey,
        model: configuredModel || DEFAULT_MODELS[provider],
        prompt: settings && settings.prompt ? String(settings.prompt) : null
      };
    }
    return null;
  }

  async function enrichAgent({ agent, template, context, store, runId } = {}) {
    const base = template && typeof template === "object" ? template : {};
    const runKey = runId || "global";

    if (llmDisabled()) {
      return stampLlm(base, { used: false, fallbackReason: "disabled" });
    }
    const spec = PROMPT_VERSIONS[agent];
    if (!spec) {
      return stampLlm(base, { used: false, fallbackReason: "unknown_agent" });
    }

    let binding = null;
    try {
      binding = await pickBinding(store, agent);
    } catch (err) {
      // Key/settings lookup hits Postgres; a lookup failure degrades to
      // templates rather than failing the stage.
      const failure = providerFailure(err);
      logger.warn(`[llm] ${agent} fallback: store_error ${failure.detail}`);
      return stampLlm(base, {
        used: false,
        fallbackReason: "store_error",
        fallbackStatus: failure.status,
        fallbackDetail: failure.detail
      });
    }
    if (!binding) {
      return stampLlm(base, { used: false, fallbackReason: "no_key" });
    }

    const attempt = {
      provider: binding.provider,
      model: binding.model,
      promptVersion: spec.version
    };

    // Cost is checked before the rate slot so a capped run does not burn
    // window capacity that other runs could use.
    if (!withinCostCap(runKey)) {
      logger.warn(`[llm] ${agent} skipped: cost_cap (maxUsd=${maxUsdPerRun})`);
      return stampLlm(base, { ...attempt, used: false, fallbackReason: "cost_cap" });
    }
    if (!consumeRateSlot()) {
      logger.warn(`[llm] ${agent} skipped: rate_limit (rpm=${rpm})`);
      return stampLlm(base, { ...attempt, used: false, fallbackReason: "rate_limit" });
    }

    try {
      const result = await callProvider({
        provider: binding.provider,
        apiKey: binding.apiKey,
        model: binding.model,
        system: spec.system,
        messages: [{ role: "user", content: buildUserPrompt(agent, context, binding.prompt) }]
      });

      const costUsd = estimateCost(binding.provider, result.usage);
      addSpend(runKey, costUsd);
      logger.info(
        `[llm] ${agent} ${binding.provider} ${result.model} v=${spec.version} ` +
          `tokens=${result.usage.prompt_tokens + result.usage.completion_tokens} ` +
          `cost=${costUsd.toFixed(6)} key=${redact(binding.apiKey)}`
      );

      const stamp = { ...attempt, model: result.model, costUsd };
      const parsed = parseJsonContent(result.content);
      if (!parsed) {
        logger.warn(`[llm] ${agent} fallback: unparsable_response`);
        return stampLlm(base, { ...stamp, used: false, fallbackReason: "unparsable_response" });
      }

      const enriched = applyEnrichment(agent, base, parsed);
      return stampLlm(base, {
        ...stamp,
        used: enriched,
        fallbackReason: enriched ? null : "empty_response"
      });
    } catch (err) {
      const failure = providerFailure(err);
      logger.warn(
        `[llm] ${agent} fallback: ${failure.reason}` +
          `${failure.status ? ` status=${failure.status}` : ""} ${failure.detail}`
      );
      return stampLlm(base, {
        ...attempt,
        used: false,
        fallbackReason: failure.reason,
        fallbackStatus: failure.status,
        fallbackDetail: failure.detail
      });
    }
  }

  return {
    callProvider,
    enrichAgent,
    pickBinding,
    resetGuards,
    estimateCost,
    providerFailure,
    getSpend: (runId) => spendByRun.get(runId || "global") || 0,
    limits: { rpm, maxUsdPerRun, timeoutMs }
  };
}

/** Env-provided keys are opt-in so local shells cannot bill a shared account. */
function envKey(provider, env = process.env) {
  if (String(env.ZERO_LLM_ENV_KEYS || "").toLowerCase() !== "1") return null;
  const name = normalizeProvider(provider);
  if (name === "openai") return env.OPENAI_API_KEY || null;
  if (name === "claude") return env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || null;
  if (name === "gemini") return env.GEMINI_API_KEY || env.GOOGLE_API_KEY || null;
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
  SUPPORTED_PROVIDERS,
  createLlm,
  callProvider: defaultLlm.callProvider,
  enrichAgent: defaultLlm.enrichAgent,
  resetGuards: defaultLlm.resetGuards,
  estimateCost,
  parseJsonContent,
  providerFailure,
  redact,
  envKey,
  ownerEmailForRun
};

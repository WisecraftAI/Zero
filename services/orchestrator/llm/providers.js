/**
 * Provider adapters. Each adapter maps the neutral
 * `{model, messages, system}` request onto a vendor HTTP call and maps the
 * response back to `{content, usage}` with OpenAI-style token names.
 */

"use strict";

const { codedError } = require("./utils");

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

const SUPPORTED_PROVIDERS = Object.keys(DEFAULT_MODELS);

const CLAUDE_MAX_TOKENS = 1024;
const OPENAI_TEMPERATURE = 0.2;

function normalizeProvider(provider) {
  return String(provider || "").trim().toLowerCase();
}

function isSupportedProvider(provider) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_MODELS, normalizeProvider(provider));
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Providers may answer with a plain string or an array of content parts. */
function textFrom(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => (part && part.text) || "").join("");
  return "";
}

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: message && message.role === "assistant" ? "assistant" : "user",
      content: message && message.content != null ? String(message.content) : ""
    }))
    .filter((message) => message.content.trim());
}

function estimateCost(provider, usage) {
  const table = COST_PER_MTOK[normalizeProvider(provider)] || COST_PER_MTOK.openai;
  const input = toCount(usage && usage.prompt_tokens);
  const output = toCount(usage && usage.completion_tokens);
  return (input * table.in + output * table.out) / 1_000_000;
}

const ADAPTERS = {
  openai: {
    request({ model, messages, system, apiKey, timeoutMs }) {
      return {
        url: "https://api.openai.com/v1/chat/completions",
        body: {
          model,
          temperature: OPENAI_TEMPERATURE,
          messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
        },
        config: {
          timeout: timeoutMs,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      };
    },
    parse(data) {
      const choice = Array.isArray(data.choices) ? data.choices[0] : null;
      const usage = data.usage || {};
      return {
        content: textFrom(choice && choice.message && choice.message.content),
        usage: {
          prompt_tokens: toCount(usage.prompt_tokens),
          completion_tokens: toCount(usage.completion_tokens)
        }
      };
    }
  },

  claude: {
    request({ model, messages, system, apiKey, timeoutMs }) {
      return {
        url: "https://api.anthropic.com/v1/messages",
        body: {
          model,
          max_tokens: CLAUDE_MAX_TOKENS,
          system: system || undefined,
          messages
        },
        config: {
          timeout: timeoutMs,
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          }
        }
      };
    },
    parse(data) {
      const usage = data.usage || {};
      return {
        content: textFrom(data.content),
        usage: {
          prompt_tokens: toCount(usage.input_tokens),
          completion_tokens: toCount(usage.output_tokens)
        }
      };
    }
  },

  gemini: {
    request({ model, messages, system, apiKey, timeoutMs }) {
      const id = model.replace(/^models\//, "");
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`,
        body: {
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents: messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }]
          }))
        },
        config: {
          timeout: timeoutMs,
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json"
          }
        }
      };
    },
    parse(data) {
      const candidate = Array.isArray(data.candidates) ? data.candidates[0] : null;
      const usage = data.usageMetadata || {};
      return {
        content: textFrom(candidate && candidate.content && candidate.content.parts),
        usage: {
          prompt_tokens: toCount(usage.promptTokenCount),
          completion_tokens: toCount(usage.candidatesTokenCount)
        }
      };
    }
  }
};

/**
 * Builds the single provider entry point. `http` must expose axios-compatible
 * `post(url, body, config)`.
 */
function createProviderCaller({ http, timeoutMs }) {
  return async function callProvider({ provider, apiKey, model, messages, system }) {
    if (!apiKey) throw codedError("API key required", "no_key");

    const name = normalizeProvider(provider);
    const adapter = ADAPTERS[name];
    if (!adapter) throw codedError(`Unknown provider: ${name || "(none)"}`, "unknown_provider");

    const chosen = String(model || "").trim() || DEFAULT_MODELS[name];
    const payload = normalizeMessages(messages);
    if (!payload.length) throw codedError("Prompt has no content", "empty_prompt");

    const { url, body, config } = adapter.request({
      model: chosen,
      messages: payload,
      system,
      apiKey,
      timeoutMs
    });
    const res = await http.post(url, body, config);
    const { content, usage } = adapter.parse((res && res.data) || {});

    return { provider: name, model: chosen, content, usage };
  };
}

module.exports = {
  COST_PER_MTOK,
  DEFAULT_MODELS,
  SUPPORTED_PROVIDERS,
  createProviderCaller,
  estimateCost,
  isSupportedProvider,
  normalizeMessages,
  normalizeProvider
};

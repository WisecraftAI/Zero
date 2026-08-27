/** Shared helpers for AI / LLM setup status in the UI. */

export const DEFAULT_MODELS = {
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  claude: "claude-haiku-4-5",
};

export const DEFAULT_GEMINI_MODEL = DEFAULT_MODELS.gemini;
export const DEFAULT_GEMINI_PROVIDER = "gemini";
export const LLM_AGENT_IDS = ["ba", "manualQa", "automationQa", "manager"];

const PROVIDER_ORDER = ["gemini", "openai", "claude"];

export function agentIsActive(cfg, keysByProvider) {
  return Boolean(cfg?.provider && cfg?.model && keysByProvider?.[cfg.provider]);
}

export function countActiveAgents(settings, keysByProvider, agentIds = LLM_AGENT_IDS) {
  return agentIds.filter((id) => agentIsActive(settings[id], keysByProvider)).length;
}

export function hasAnyProviderKey(keysByProvider) {
  return Object.values(keysByProvider || {}).some(Boolean);
}

export function preferredConfiguredProvider(keysByProvider) {
  return PROVIDER_ORDER.find((id) => keysByProvider?.[id]) || null;
}

export async function applyProviderToAllAgents(apiUrlFn, provider, agentIds = LLM_AGENT_IDS) {
  const model = DEFAULT_MODELS[provider];
  if (!model) throw new Error(`Unknown provider: ${provider}`);
  await Promise.all(
    agentIds.map((agent) =>
      fetch(apiUrlFn(`/agent-settings/${agent}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed to configure ${agent}`);
        return r.json();
      })
    )
  );
}

export async function applyGeminiToAllAgents(apiUrlFn, agentIds = LLM_AGENT_IDS) {
  return applyProviderToAllAgents(apiUrlFn, DEFAULT_GEMINI_PROVIDER, agentIds);
}

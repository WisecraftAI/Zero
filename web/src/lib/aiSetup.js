/** Shared helpers for AI / LLM setup status in the UI. */

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const DEFAULT_GEMINI_PROVIDER = 'gemini';
export const LLM_AGENT_IDS = ['ba', 'manualQa', 'automationQa', 'manager'];

export function agentIsActive(cfg, keysByProvider) {
  return Boolean(cfg?.provider && cfg?.model && keysByProvider?.[cfg.provider]);
}

export function countActiveAgents(settings, keysByProvider, agentIds = LLM_AGENT_IDS) {
  return agentIds.filter((id) => agentIsActive(settings[id], keysByProvider)).length;
}

export function hasAnyProviderKey(keysByProvider) {
  return Object.values(keysByProvider || {}).some(Boolean);
}

export async function applyGeminiToAllAgents(apiUrlFn, agentIds = LLM_AGENT_IDS) {
  await Promise.all(
    agentIds.map((agent) =>
      fetch(apiUrlFn(`/agent-settings/${agent}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: DEFAULT_GEMINI_PROVIDER,
          model: DEFAULT_GEMINI_MODEL,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed to configure ${agent}`);
        return r.json();
      })
    )
  );
}

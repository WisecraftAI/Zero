import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../apiBase';
import { applyGeminiToAllAgents, countActiveAgents } from '../lib/aiSetup';

function indexSetupItems(agentItems = [], providerItems = []) {
  const settings = Object.fromEntries(agentItems.map((item) => [item.agent, item]));
  const keys = Object.fromEntries(providerItems.map((item) => [item.provider, item.configured]));
  return { settings, keys };
}

export function useAiSetup() {
  const [settings, setSettings] = useState({});
  const [keys, setKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [available, setAvailable] = useState(false);

  const load = useCallback(async () => {
    try {
      const [agentsRes, keysRes] = await Promise.all([
        fetch(apiUrl('/agent-settings')),
        fetch(apiUrl('/provider-keys')),
      ]);
      if (!agentsRes.ok || !keysRes.ok) throw new Error('AI setup status unavailable');

      const [agents, providers] = await Promise.all([agentsRes.json(), keysRes.json()]);
      const indexed = indexSetupItems(agents.items, providers.items);
      setSettings(indexed.settings);
      setKeys(indexed.keys);
      setAvailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {
      // AI setup is optional; the marketing page remains usable without the API.
    });
  }, [load]);

  const enableGemini = useCallback(async () => {
    setEnabling(true);
    try {
      await applyGeminiToAllAgents(apiUrl);
      await load();
    } finally {
      setEnabling(false);
    }
  }, [load]);

  return {
    activeCount: countActiveAgents(settings, keys),
    available,
    enableGemini,
    enabling,
    geminiConfigured: Boolean(keys.gemini),
    loading,
  };
}

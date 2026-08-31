import { countActiveAgents } from '../lib/aiSetup';
import {
  useEnableGeminiForAllMutation,
  useGetAgentSettingsQuery,
  useGetProviderKeysQuery,
} from '../store/settingsApi';

function indexSetupItems(agentItems = [], providerItems = []) {
  const settings = Object.fromEntries(agentItems.map((item) => [item.agent, item]));
  const keys = Object.fromEntries(providerItems.map((item) => [item.provider, item.configured]));
  return { settings, keys };
}

export function useAiSetup() {
  const agents = useGetAgentSettingsQuery();
  const providers = useGetProviderKeysQuery();
  const [enableGeminiForAll, { isLoading: enabling }] = useEnableGeminiForAllMutation();
  const { settings, keys } = indexSetupItems(agents.data?.items, providers.data?.items);
  const loading = agents.isLoading || providers.isLoading;

  return {
    activeCount: countActiveAgents(settings, keys),
    available: !loading && !agents.isError && !providers.isError,
    enableGemini: () => enableGeminiForAll().unwrap(),
    enabling,
    geminiConfigured: Boolean(keys.gemini),
    loading,
  };
}

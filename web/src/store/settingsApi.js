import { createApi } from '@reduxjs/toolkit/query/react';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_PROVIDER, LLM_AGENT_IDS } from '../lib/aiSetup';
import { baseQuery } from './baseQuery';

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery,
  tagTypes: ['AgentSettings', 'ProviderKeys'],
  endpoints: (builder) => ({
    getAgentSettings: builder.query({
      query: () => '/agent-settings',
      providesTags: ['AgentSettings'],
    }),
    updateAgentSetting: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/agent-settings/${encodeURIComponent(id)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['AgentSettings'],
    }),
    getProviderKeys: builder.query({
      query: () => '/provider-keys',
      providesTags: ['ProviderKeys'],
    }),
    saveProviderKey: builder.mutation({
      query: ({ provider, key }) => ({
        url: `/provider-keys/${encodeURIComponent(provider)}`,
        method: 'PUT',
        body: { key },
      }),
      invalidatesTags: ['ProviderKeys'],
    }),
    deleteProviderKey: builder.mutation({
      query: (provider) => ({
        url: `/provider-keys/${encodeURIComponent(provider)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ProviderKeys'],
    }),
    enableGeminiForAll: builder.mutation({
      async queryFn(_arg, _api, _options, executeBaseQuery) {
        const results = await Promise.all(
          LLM_AGENT_IDS.map((id) =>
            executeBaseQuery({
              url: `/agent-settings/${encodeURIComponent(id)}`,
              method: 'PUT',
              body: {
                provider: DEFAULT_GEMINI_PROVIDER,
                model: DEFAULT_GEMINI_MODEL,
              },
            })),
        );
        const failed = results.find((result) => result.error);
        return failed || { data: { configured: LLM_AGENT_IDS.length } };
      },
      invalidatesTags: ['AgentSettings', 'ProviderKeys'],
    }),
  }),
});

export const {
  useDeleteProviderKeyMutation,
  useEnableGeminiForAllMutation,
  useGetAgentSettingsQuery,
  useGetProviderKeysQuery,
  useSaveProviderKeyMutation,
  useUpdateAgentSettingMutation,
} = settingsApi;

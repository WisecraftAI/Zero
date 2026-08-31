import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

function runId(run) {
  return run?.id || run?.runId;
}

function updateRunStatus(draft, id, status) {
  const run = draft?.find?.((item) => runId(item) === id);
  if (run) run.status = status;
}

export const runsApi = createApi({
  reducerPath: 'runsApi',
  baseQuery,
  tagTypes: ['Run'],
  endpoints: (builder) => ({
    getRuns: builder.query({
      query: () => '/runs',
      transformResponse: (response) => (Array.isArray(response) ? response : response?.runs || []),
      providesTags: (result) => [
        { type: 'Run', id: 'LIST' },
        ...(result || []).map((run) => ({ type: 'Run', id: runId(run) })),
      ],
    }),
    getRun: builder.query({
      query: (id) => `/runs/${encodeURIComponent(id)}`,
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, id) => [{ type: 'Run', id }],
    }),
    createRun: builder.mutation({
      query: (formData) => ({
        url: '/runs',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Run', id: 'LIST' }],
    }),
    stopRun: builder.mutation({
      query: (id) => ({
        url: `/runs/${encodeURIComponent(id)}/stop`,
        method: 'POST',
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const listPatch = dispatch(
          runsApi.util.updateQueryData('getRuns', undefined, (draft) => {
            updateRunStatus(draft, id, 'stopping');
          }),
        );
        const detailPatch = dispatch(
          runsApi.util.updateQueryData('getRun', id, (draft) => {
            if (draft) draft.status = 'stopping';
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          listPatch.undo();
          detailPatch.undo();
        }
      },
      invalidatesTags: (_result, _error, id) => [
        { type: 'Run', id },
        { type: 'Run', id: 'LIST' },
      ],
    }),
    rerunFailed: builder.mutation({
      query: (id) => ({
        url: `/runs/${encodeURIComponent(id)}/rerun-failed`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Run', id },
        { type: 'Run', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useCreateRunMutation,
  useGetRunQuery,
  useGetRunsQuery,
  useRerunFailedMutation,
  useStopRunMutation,
} = runsApi;

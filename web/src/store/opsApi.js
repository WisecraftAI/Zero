import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

export const opsApi = createApi({
  reducerPath: 'opsApi',
  baseQuery,
  tagTypes: ['Locator'],
  endpoints: (builder) => ({
    getLocators: builder.query({
      query: (host) => `/locators?host=${encodeURIComponent(host)}`,
      providesTags: (_result, _error, host) => [{ type: 'Locator', id: host }],
    }),
    submitElementLog: builder.mutation({
      query: (body) => ({
        url: '/element-log',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, body) => {
        try {
          return [{ type: 'Locator', id: new URL(body.url).host }];
        } catch {
          return ['Locator'];
        }
      },
    }),
    startRecording: builder.mutation({
      query: (body) => ({
        url: '/recordings/start',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useLazyGetLocatorsQuery,
  useStartRecordingMutation,
  useSubmitElementLogMutation,
} = opsApi;

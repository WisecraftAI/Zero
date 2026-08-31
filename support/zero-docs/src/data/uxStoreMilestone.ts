/**
 * U3 — Redux Toolkit / RTK Query store milestone.
 * Canonical agent spec: support/agent-workflow/milestones/U3-redux-store.md
 * Mirrored here so the Next Milestone / Architecture docs stay agent-readable.
 */

export const UX_STORE_MILESTONE = {
  id: 'U3',
  track: 'ux',
  name: 'Redux Toolkit store (RTK Query)',
  spec: 'milestones/U3-redux-store.md',
  status: 'done',
  state: 'complete',
  dependsOn: 'U1 shell · U2 canvas · S7 SPA split',
  objective:
    'Move run / settings / locator network state into RTK Query. App only routes. SSE patches the cache. Route, theme, wizard, and elapsed ticks stay out of Redux.',
} as const;

export interface StorePhase {
  id: string;
  title: string;
  body: string;
  exit: string;
}

export const STORE_PHASES: readonly StorePhase[] = [
  {
    id: 'P0',
    title: 'Guardrails',
    body: 'eslint-plugin-react + react-hooks (rules-of-hooks + exhaustive-deps as errors). Error boundary around AppShell main. Extract <RunElapsed /> and delete App / Dashboard / RunDetail 1 Hz clocks.',
    exit: 'Lint green for web/; main outlet wrapped; no clock state in App.jsx.',
  },
  {
    id: 'P1',
    title: 'Store + RTK Query',
    body: 'configureStore + Provider. runsApi (list/detail/create/stop/rerun), settingsApi (agent-settings + provider-keys + enableGeminiForAll), opsApi (locators + recordings). RunStreamBridge patches getRun via updateQueryData; artifact refresh invalidates tags. Optional uiSlice for toasts only.',
    exit: 'App has no useState for runs; views use hooks; SSE does not subscribe in App.',
  },
  {
    id: 'P2',
    title: 'React structure',
    body: 'React.lazy each view. Split RunDetailView into views/runDetail/ (<200 lines per file). Same for Agents / NewRun composition. Stable list keys. memo(Sidebar/Topbar/tabs) after RTK — not before.',
    exit: 'Multiple view chunks; Run Detail parent thin; no index keys on growing artifact lists.',
  },
  {
    id: 'P3',
    title: 'Routing / UX polish (optional)',
    body: 'React Router v6 or keep lib/routes.js. Explicit isLoading / isError / isFetching at view edge. content-visibility on long TC tables.',
    exit: 'No route-in-Redux; empty/error/pending UI at the view edge.',
  },
] as const;

export interface StoreEndpoint {
  method: string;
  path: string;
  tags: string;
}

export const RUNS_API_CONTRACT: readonly StoreEndpoint[] = [
  { method: 'GET', path: '/runs', tags: "providesTags: ['Run']" },
  { method: 'GET', path: '/runs/:id', tags: "{ type: 'Run', id }" },
  { method: 'POST', path: '/runs', tags: 'FormData body; invalidates Run' },
  {
    method: 'POST',
    path: '/runs/:id/stop',
    tags: "optimistic status 'stopping' on list+detail; invalidate id",
  },
  { method: 'POST', path: '/runs/:id/rerun-failed', tags: 'invalidate that id' },
];

export const KEEP_OUT_OF_REDUX: readonly string[] = [
  'URL / view / runId / tab — lib/routes.js History API (or React Router later; never sync into Redux)',
  'Theme — lib/themes.js + localStorage',
  'Elapsed-time tick — leaf <RunElapsed /> with its own interval',
  'New Run wizard fields — local form state until submit',
];

export const STORE_LAYOUT: readonly string[] = [
  'web/src/store/index.js — configureStore',
  'web/src/store/baseQuery.js — fetchBaseQuery(API_BASE)',
  'web/src/store/runsApi.js',
  'web/src/store/settingsApi.js',
  'web/src/store/opsApi.js',
  'web/src/store/uiSlice.js — optional toast / runActionError only',
  'web/src/store/selectors.js — selectRunById, selectLiveRunIds, selectRunPassRate',
  'web/src/store/RunStreamBridge.jsx — mount only on run-detail',
];

export const STORE_ACCEPTANCE: readonly string[] = [
  'Phase 0: React hooks ESLint errors; error boundary; no App clock.',
  '@reduxjs/toolkit + react-redux; Provider in main.jsx.',
  'runsApi with getRuns / getRun / create / stop / rerun-failed.',
  'List polling via pollingInterval (hasLiveRun ? 4000 : 0), not App setInterval on runs.',
  'RunStreamBridge + updateQueryData for SSE; artifact refresh invalidates tags.',
  'settingsApi + opsApi replace view-level fetches for those resources.',
  'Route / theme / wizard / elapsed leaf remain outside Redux.',
  'Lazy views + RunDetailView split (< 200 lines parent).',
  'Stable keys on mutable artifact lists.',
  'test/ui-ux-store.test.js passes; workflow:verify -- --milestone U3 exits 0.',
];

export const STORE_OUT_OF_SCOPE: readonly string[] = [
  'Changing /runs contracts or stageKeys',
  'Route, theme, or wizard draft fields in Redux',
  'Classic runsSlice + createAsyncThunk duplicating RTK Query',
  'Next.js / RSC / React.cache / Server Actions',
  'OIDC login screen',
  'Q5 classification UI',
];

export const STORE_AGENT_CUT: readonly string[] = [
  'Phase 0 — lint + boundary + RunElapsed',
  'Store + runsApi + Provider + RunStreamBridge — drain App of runs/SSE/poll/stop/rerun',
  'settingsApi + opsApi',
  'Lazy views + split Run Detail + stable keys + memo',
];

export const STORE_VERIFY: readonly string[] = [
  'npm run lint',
  'npm test -- test/ui-ux-store.test.js',
  'npm run build -w @zero/web',
  'npm run workflow:verify -- --milestone U3',
];

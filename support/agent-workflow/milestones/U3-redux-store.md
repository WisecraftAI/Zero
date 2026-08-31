# U3 — Redux Toolkit store (RTK Query)

**Status:** Done (2026-08-30)

U3 is a **SPA data-layer milestone**. Move run / settings / locator / recording
network state out of `App.jsx` into Redux Toolkit + RTK Query. Keep URL, theme,
wizard fields, and elapsed-time ticks **out of Redux**.

> Presentation + client cache only. U3 does **not** change pipeline behaviour,
> `/runs` contracts, `stageKeys`, classification, or form field `name`s / submit payloads.

## Outcome

After U3:

| Today | After |
|-------|--------|
| `App` owns runs, active run, SSE, poll, stop, rerun | Store + RTK Query + SSE cache patch |
| Hand-rolled `fetch` + loading flags in views | Three API slices (`runsApi`, `settingsApi`, `opsApi`) |
| One large JS chunk pulls every view | `React.lazy` views |
| 1 Hz full-tree re-render from App / Dashboard / Run Detail clocks | One leaf `<RunElapsed />` |
| No error boundary; thin React ESLint | Boundary in `AppShell` + hooks lint errors |

**Honest constraint:** RTK Query is the Toolkit surface this app needs. Do **not**
build a classic `runsSlice` + `createAsyncThunk` that reimplements cache, tags,
polling, and optimistic updates. Use a slice only for UI chrome (toasts /
`runActionError`). Vite + React 18 — skip RSC / `React.cache` / Server Actions.

## Depends on

U1 (shell) · U2 (canvas) · S7 (SPA split). Parallel to **Q5**. Do not block on Q5.
DETECT still prints Q5 first; implement U3 when the user asks for store / RTK / SPA data layer.

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| SPA | `web/` | `/zero-web` |
| Lint (root flat config) | `eslint.config.js` | — |

## Canonical contract

1. **One store.** `@reduxjs/toolkit` + `react-redux`. `configureStore` in
   `web/src/store/index.js`. `<Provider>` in `main.jsx`. No custom middleware until SSE.
2. **RTK Query owns server state.** `runsApi` / `settingsApi` / `opsApi` with tag
   invalidation. Views call hooks — they do not call `fetch` for those resources.
3. **SSE patches the cache.** Keep `useRunStream`. `onPatch` →
   `dispatch(runsApi.util.updateQueryData('getRun', runId, draft => …))` using
   existing `mergeRunStreamState`. Artifact refresh →
   `invalidateTags([{ type: 'Run', id }])`. Subscriber lives in `RunStreamBridge`
   (run-detail only), not in `App`.
4. **Route stays History API.** `lib/routes.js` (or React Router later). **Never**
   sync `view` / `runId` / `tab` into Redux.
5. **Theme stays `lib/themes.js` + localStorage.**
6. **Wizard fields stay local** until `POST /runs`.
7. **Elapsed time is a leaf** (`<RunElapsed />`) with its own interval — delete
   App `clock`, RunDetail `tick`, Dashboard dummy tick.
8. **`App.jsx` only routes.** Read route → pick a lazy view. No `useState` for runs.

## Phases (implement in order)

### Phase 0 — Guardrails (do first)

#### D0a — React ESLint

- Add `eslint-plugin-react` + `eslint-plugin-react-hooks` to root (ESLint 9 flat config).
- Scope `web/**/*.{js,jsx}`: `react/jsx-runtime`, **errors** for
  `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`.
- Fix everything `npm run lint` reports in `web/` before moving state.

**Exit:** hooks rules are errors; lint is green for `web/`.

#### D0b — Error boundary

- Wrap `AppShell` `<main>` children (not the whole shell).
- Reset on navigation (`key={view}` or pathname).
- Bad optional chain in a tab must not white-screen Sidebar / ThemePicker.

**Exit:** boundary component exists; main outlet is wrapped.

#### D0c — Elapsed-time leaf (can land with Phase 0)

- Add `<RunElapsed />` (or equivalent) with local `setInterval`.
- Remove App `clock`, RunDetail `tick`, Dashboard `setTick`.
- Pass wall-clock into `PipelineFlow` only if the bar needs it; else derive from
  `run.startedAt` / `createdAt` inside that component.

**Exit:** no 1 Hz timer in `App.jsx`.

### Phase 1 — Store + RTK Query

#### D1 — Store bootstrap

```
web/src/store/
  index.js           configureStore({ reducer: { [api.reducerPath]: …, ui? } })
  baseQuery.js       fetchBaseQuery({ baseUrl: API_BASE }) via apiBase.js
  runsApi.js
  settingsApi.js
  opsApi.js
  uiSlice.js         optional — runActionError / toast only
  selectors.js       selectRunById, selectLiveRunIds, selectRunPassRate
  RunStreamBridge.jsx
```

`Provider` in `main.jsx` next to `StrictMode`.

**Exit:** store boots; empty Provider does not break MarketingHome.

#### D2 — `runsApi` (80% of the value)

| Endpoint | Tags / behaviour |
|----------|------------------|
| `GET /runs` | `providesTags: ['Run']` |
| `GET /runs/:id` | `{ type: 'Run', id }` |
| `POST /runs` | **FormData** (omit `Content-Type`); invalidates `Run` |
| `POST /runs/:id/stop` | optimistic `status: 'stopping'` on list + detail; invalidate that id |
| `POST /runs/:id/rerun-failed` | invalidate that id |

- `keepUnusedDataFor` on `getRun` (e.g. 300s) so leaving a run and returning does not cold-fetch.
- List polling: `useGetRunsQuery(undefined, { pollingInterval: hasLiveRun ? 4000 : 0 })`.
  **No** `useEffect` + `setInterval` that depends on the runs array.
- `hasLiveRun` from status fields / `selectLiveRunIds`, not a custom poller in `App`.

**Exit:** Dashboard / Runs list / Run detail use hooks; `App` has no runs state.

#### D3 — `settingsApi`

Match real HTTP (not a fictional collection PUT):

- `GET /agent-settings`, `PUT /agent-settings/:id`
- `GET /provider-keys`, `PUT /provider-keys/:provider`, `DELETE /provider-keys/:provider`
- Mutation `enableGeminiForAll` (reuse `applyGeminiToAllAgents`) invalidates both tag types

Replace duplicated fetch in `AgentsView`, `ApiKeysView`, `useAiSetup`.

**Exit:** one cache; enable-Gemini invalidates agents + keys.

#### D4 — `opsApi`

- `POST /element-log`, `GET /locators?host=`
- `POST /recordings/start` (+ stop/save paths `NewRunView` / `RunForm` already use)

CMS capture may stay as one-shot `fetch` until slices land — do not invent a CMS collection.

**Exit:** Locators / recording start use RTK mutations/queries.

#### D5 — SSE bridge

- `RunStreamBridge` mounts only on run-detail.
- `onPatch` → `updateQueryData('getRun', …)` with `mergeRunStreamState` (Immer-safe).
- `onRefresh` → `invalidateTags([{ type: 'Run', id }])`.
- Do **not** subscribe in `App`. Do not add a third poller alongside list
  `pollingInterval` and SSE poll fallback.

**Exit:** live run updates RTK cache; Sidebar does not re-render on every SSE patch
(selectors + memo later).

#### D6 — Selectors + thin `uiSlice`

- `selectRunById`, `selectLiveRunIds`, `selectRunPassRate`.
- Components subscribe to slices of the run, not the whole object, where it matters.
- `uiSlice` only for transient action errors / toasts not tied to a query result.
  **No god-slice** of route + theme + wizard + clock.

**Exit:** Topbar / list rows do not need the full run blob for pass rate / live ids.

### Phase 2 — React structure (after RTK — then `memo`)

#### D7 — Code-split routes

- `React.lazy` each view; `<Suspense>` fallback inside `AppShell` main (with boundary).
- Dashboard must not parse `RunDetailView`.

**Exit:** multiple view chunks in `dist/web/assets`.

#### D8 — Split `RunDetailView` (mandatory by size)

Folder `web/src/views/runDetail/`:

- Parent composes only — target **&lt; 200 lines** per file
- Header, tabs, one file per tab panel, `tabSources.js` (`ALL_TABS` / `TAB_SOURCES`)

Same pattern for `AgentsView` (list vs editor) and `NewRunView` (steps as components;
fields stay local).

**Exit:** `RunDetailView` parent &lt; 200 lines; tabs are separate modules.

#### D9 — Stable list keys

Replace `key={i}` on SSE-growing / mutable lists with `tc.id`, `req.id`, check id, or a
stable hash. Index keys on growing lists are a correctness bug.

**Exit:** no index keys on requirements / TC / execution / a11y issue lists
(static breadcrumbs may keep index keys).

#### D10 — `memo` after RTK

`memo(Sidebar)`, `memo(Topbar)`, memo tab panels. Do not lead with `useCallback` soup;
selectors + Query already stabilize references.

### Phase 3 — Routing / UX polish (optional, still in U3 if cheap)

- React Router v6 **or** keep `lib/routes.js` — both fine. If Router: `useParams()` for
  `runId` / `tab`; nested `/runs/:runId/:tab`. **Do not** put route in Redux.
- Explicit empty / error / pending UI from RTK `isLoading` / `isError` / `isFetching`
  at the view edge (no “Loading…” breadcrumb + broken header).
- `content-visibility: auto` on long execution / manual TC tables after lists are split.

## Success measures

- `App.jsx` has no `useState` for `runs` / `activeRun` / `clock`.
- No view-level `fetch(apiUrl('/runs…'))` / agent-settings / provider-keys / locators
  for the resources owned by the three APIs (CMS may remain).
- `npm run lint` enforces hooks rules as errors on `web/`.
- `npm run build` produces lazy view chunks.
- `npm run workflow:verify -- --milestone U3` exits 0.

## Acceptance

- [x] Phase 0: React hooks ESLint errors; error boundary around main; no App clock.
- [x] `@reduxjs/toolkit` + `react-redux` in `@zero/web`; `Provider` in `main.jsx`.
- [x] `web/src/store/runsApi.js` with getRuns / getRun / create / stop / rerun-failed.
- [x] List polling via `pollingInterval`, not App `setInterval` on the runs array.
- [x] `RunStreamBridge` + `updateQueryData` for SSE; artifact refresh invalidates tags.
- [x] `settingsApi` + `opsApi` replace Agents / ApiKeys / useAiSetup / Locators / recording fetches.
- [x] Route / theme / wizard / elapsed leaf remain outside Redux.
- [x] Lazy views + `RunDetailView` split (&lt; 200 lines parent).
- [x] Stable keys on mutable artifact lists.
- [x] `test/ui-ux-store.test.js` exists and passes (source-level probes).
- [x] `npm run workflow:verify -- --milestone U3` exits 0.
- [x] UI edits stay in `web/src/**` (+ root `eslint.config.js`); rebuilt with `npm run build`.

## Out of scope

- Changing `/runs` HTTP contracts or pipeline `stageKeys`
- Putting route, theme, or wizard draft fields into Redux
- Classic `runsSlice` + thunks that duplicate RTK Query
- Next.js / RSC patterns
- OIDC login screen (M5 gap)
- Q5 classification UI

## Definition of done

U3 is done when acceptance is green, verify U3 exits 0, and `progress.json` `ux.U3`
is `done`. Shipping only `configureStore` without migrating runs/SSE does **not** close U3.

## Verify

```bash
npm run lint
npm test -- test/ui-ux-store.test.js
npm run build -w @zero/web
npm run workflow:verify -- --milestone U3
```

## Agent cut (suggested PR order)

1. Phase 0 (lint + boundary + `RunElapsed`)
2. Store + `runsApi` + Provider + `RunStreamBridge` — drain `App` of runs/SSE/poll/stop/rerun
3. `settingsApi` + `opsApi`
4. Lazy views + split Run Detail + stable keys + memo

## Isolated PR sessions (mandatory)

Start a fresh agent session for each PR above. Pin these two files as the only
static cross-PR references:

- `support/agent-workflow/milestones/U3-redux-store.md` — acceptance contract
- `support/agent-workflow/prompts/ui-ux.md` — UI / data-layer north star

The planner must provide an explicit file allowlist for that PR. Feed the agent
only those files and the smallest direct dependency needed to understand an
import or public interface. Do not preload the repository, earlier PR
transcripts, previously rewritten files, or unrelated `web/src/store/`
directories.

- PR 1 receives only Phase 0 owners (lint configuration, boundary/shell, and
  elapsed-time owners).
- PR 2 receives the run-state seam: `App.jsx`, `main.jsx`,
  `data/useRunStream.js`, the run-consuming views named by the planner, and only
  the new run-store modules required by D1/D2/D5.
- PR 3 receives only settings/ops consumers and their corresponding API
  modules. Do not reopen `runsApi` unless a failing shared interface requires it.
- PR 4 receives route-loading files plus `RunDetailView` and the components
  extracted from it. Do not read unrelated store internals; consume their public
  hooks/selectors as fixed interfaces.

If implementation discovers a necessary file outside the allowlist, stop and
request that single file with a reason before reading or editing it. Verification
commands may inspect the repository mechanically; failures do not authorize
broad source exploration.

Implement via `/zero-web`. North star: `prompts/ui-ux.md` § U3.
Zero-docs plan mirror: `support/zero-docs/src/data/uxStoreMilestone.ts` (Next Milestone tab).

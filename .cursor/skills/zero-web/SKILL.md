---
name: zero-web
description: >-
  Code the ZER0 React UI in web/ (@zero/web): New Run, dashboard, run detail
  SSE, API keys, agents, locators, and AI-setup banners. Use whenever the
  user asks to update the UI, client, views, Vite SPA, EventSource, LLM
  status, website-type hint, or @zero/web. Prefer this over API or
  orchestrator skills when the change is presentation — not route handlers
  or DAG logic. Edit web/src/** then npm run build.
---

# @zero/web

Presentation and form validation. ESM React 18 + Vite. Never holds pipeline business rules, never proxies artifact bytes, never persists login passwords.

## When this skill owns the task

Stay inside `web/src/**` (plus colocated CSS). Rebuild with `npm run build` so `dist/web/` updates. Do not treat `dist/web/assets` or `web/public/` generated copies as source (except `web/public/*.html` architecture pages owned by `zero-architecture`).

Escalate instead of stretching this package when the ask is:

- HTTP contract / SSE payload shape → `@zero/api`
- Stage order / LLM merge → `@zero/orchestrator`
- Classification rules → `@zero/analyzer` (`websiteTypeHint.js` is preview-only)

Read `support/agent-workflow/prompts/repos/web.md` before editing.

## Layout

```
web/src/
  App.jsx                      # view switch + run fetch + SSE wiring
  apiBase.js                   # VITE_API_BASE_URL → http://localhost:3001
  layouts/AppShell.jsx
  views/                       # Dashboard, Runs, NewRun, RunDetail, Locators, ApiKeys, Agents, Integrations
  components/                  # Header, Sidebar, TabContent, AiSetupBanner, Pipeline*, RunForm, …
  data/useRunStream.js         # EventSource on GET /runs/:id/stream
  data/runStream.js            # merge SSE state into the run snapshot
  lib/llmStatus.js             # why a stage fell back to templates
  lib/aiSetup.js               # missing-key / setup copy
  lib/websiteTypeHint.js       # New Run hostname preview (not runtime classification)
  lib/runProgress.js
```

`web/package.json` `"type": "module"`. Do not import `playwright`, `pg`, AWS/GCP SDKs, or `@zero/cloud`.

## API base (S7)

SPA (`:3000` nginx or Vite `:5173`) and API (`:3001`) are different origins. All fetches go through `apiUrl()` / `artifactUrl()` in `apiBase.js`. Paths have **no** `/api` prefix (`/runs`, `/provider-keys`). `artifactUrl` still strips a leftover `/api` prefix from old refs.

`VITE_API_BASE_URL` is baked at build time. Vite dev defaults to `http://localhost:3001`.

## Views

| View | File | Notes |
|------|------|-------|
| Dashboard | `DashboardView.jsx` | Run counts / AI setup |
| Runs | `RunsListView.jsx` | |
| New Run | `NewRunView.jsx` | Target URL required. Guided = Figma / TC file / notes. Autonomous = URL only. `websiteTypeHint` is a preview. |
| Run detail | `RunDetailView.jsx` | Tabs via `TabContent.jsx`. Show domain → sub-domain when `webAnalysis` has it. |
| Locators | `LocatorsView.jsx` | |
| API keys | `ApiKeysView.jsx` | App keys (`/keys`) **and** LLM provider keys (`/provider-keys`) — different endpoints. |
| Agents | `AgentsView.jsx` | `/agent-settings` |
| Integrations | `IntegrationsView.jsx` | |

## Live updates

`useRunStream.js`: `EventSource` on `/runs/:id/stream`. Apply stage/status immediately; debounce full `GET /runs/:id` (~400ms) so artifacts catch up. Close on `done` / terminal status. Poll (`RUN_STREAM_POLL_MS` = 2000) only after **two consecutive SSE failures**. Topbar should show `Live (SSE)` vs `Live (poll fallback)`.

## LLM / AI setup UI

- `AiSetupBanner.jsx` + `aiSetup.js` — prompt to add a provider key when agents would otherwise stay on templates.
- `llmStatus.js` `collectLlmIssues(run)` — surface `metadata.llm.fallbackReason` (invalid_key, quota, cost_cap, …). Ignore `no_key` / `disabled` here if the banner already covers setup.
- Do not put API keys or login passwords in `localStorage` or logs.

## Invariants

- Presentation only. Hostname hints in `websiteTypeHint.js` must not replace Web Analyzer output.
- Passwords: runtime fields on New Run only; never store.
- Colocated CSS per view (`NewRunView.css`, `RunDetailView.css`).

## How to change

1. New screen → `views/` + a branch in `App.jsx` `getTopbarProps` / `navigate`.
2. Shared chrome → `layouts/` / `components/`.
3. Fetch helpers stay in `apiBase.js` so origin + prefix stay consistent.
4. After UI edits: `npm run build` (and `npm run client` for Vite). Verify in the browser, not by screenshot alone.

```bash
npm run build
```

# ZER0 Architecture

Ground truth: `apps/api/server.js`, `apps/orchestrator/`, `apps/executor/`, `packages/*`, `web/`. This doc distinguishes **what ships today** from the **IDE-style target**.

Live HTML: `/architecture.html` (source: `web/public/architecture.html`), Target blueprint: `/architectureV2.html`.

**Autonomous implementation path:** `agent-workflow/` + Cursor skill `/zero-target-arch` (`npm run workflow:status`).

---

## Current runtime (shipped)

```
React web/ ──npm run build──▶ public/
        │
        ▼  /api/runs → queue runs.requested
┌──────────────────┐                 ┌────────────────────────────┐
│  React 18 SPA    │──poll /runs/:id─▶│  Express  @zero/api        │
│  New Run · Detail│                 │  apps/api/server.js        │
│  Agents · Keys   │                 └──────┬───────────┬──────────┘
└──────────────────┘                        │           │
        │                                   ▼           ▼
        │ /record · /recorder.js     ┌────────────┐  @zero/executor
        └───────────────────────────▶│ packages/* │  Chromium
          recording events           │ analyzer   │      │
                                     │ builders   │      ▼
                                     │ locators   │  artifacts/<runId>/
                                     │ domain · db│    run.json · screenshots
                                     │ cloud      │  artifacts/cms-captures/
                                     └─────┬──────┘
                                           │  when DATABASE_URL / PGHOST set
                                           ▼
                                     PostgreSQL (@zero/db)
```

Local run modes:

- `npm start` — **API only** (`apps/api/server.js`)
- `npm run start:all` — API + orchestrator + executor via `scripts/local-stack.js`
- Compose / production — separate `app`, `orchestrator`, and `executor` services

### Pipeline (`stageKeys` in `@zero/domain`)

Order: `webAnalyzer?` → `ba` → `manualQa` → `automationQa` → `execution` → optional `accessibility` / `performance` / `security` → `manager` → `delivery`.

| Stage | When | What it actually does |
|-------|------|------------------------|
| **webAnalyzer** | No TC file and short/empty notes | Playwright crawl via `@zero/analyzer` (`urlAnalyzerPro`, fallback `urlAnalyzer`); BRD-ish insights, suggested TCs |
| **ba** | Always | Template consolidation (`consolidateRequirements`), then optional LLM enrich via `@zero/orchestrator/llm` |
| **manualQa** | Always | Cases from uploaded CSV / UI manual rows / URL analysis / profile templates; optional LLM extra cases |
| **automationQa** | Always | Merge locators → Playwright + Java/Selenium text; optional LLM locator hints |
| **execution** | Always | Playwright in `@zero/executor`; default **minimal** (`EXECUTION_MODE≠full`) = load URL + body wait + screenshot |
| **accessibility** / **performance** / **security** | UI flags | Extra Playwright passes; security is header/cookie/content heuristics |
| **manager** / **delivery** | Always | Deterministic report builders; Manager may add an LLM narrative when a key exists |

Channel profiles: Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic (+ ecommerce helpers in `@zero/locators/ecommerceSelectors`).

### Persistence (today)

| Store | Mechanism | Survives restart? |
|-------|-----------|-------------------|
| Active runs | `runs` `Map` + `artifacts/<id>/run.json` | Partial (disk JSON) |
| Login secrets | `runSecrets` `Map` | No |
| Recordings | in-memory Maps | No |
| Learned selectors | `selectorMemory` | No |
| Provider keys / agent settings | memory Maps (or DB if enabled) | No unless DB |
| Screenshots | object store (`runs/<id>/files/*`) + local cache under `artifacts/` | Yes (object store) |

**Postgres (M1 shipped):** `databaseConfigured()` is true when `DATABASE_URL` or `PGHOST` is set; `initDatabase()` creates schema via `@zero/db` (`qa_runs`, `qa_assets`, `projects`, `stored_scripts`, `recordings`, `element_locators`, `element_logs`, `provider_keys`, `agent_settings`). Runs upsert to Postgres on each `persistRun`; Map + `artifacts/<id>/run.json` remain a cache/fallback. Login passwords stay in `runSecrets` only.

**Object store (M2 shipped):** `ZERO_CLOUD=local` (default) writes to `artifacts/cloud-store` with HMAC-signed `/api/cloud/local` URLs. `POST /api/runs` can return `uploads[]` (presigned PUT) so TC/recording bytes never enter the API process; `POST /api/runs/:id/commit` starts the pipeline. Screenshots and `run.json` are also stored as objects. `/artifacts` is no longer statically served.

**Multi-cloud (M7 shipped):** `ZERO_CLOUD=aws` (S3 / SQS / Secrets Manager / Redis) and `ZERO_CLOUD=gcp` (GCS / Pub/Sub / Secret Manager / Redis) implement the same `@zero/cloud` contracts. SDKs are lazy-required and live only under `packages/cloud/**`. IaC: `infra/aws`, `infra/gcp`. CI: `.github/workflows/ci.yml` (workflow status + Jest smoke). Azure/Vercel adapters are not complete. Default remains `local`.

**Queue + orchestrator (M3 shipped):** `POST /api/runs` publishes `runs.requested` via `@zero/cloud` queue and returns 202. `@zero/orchestrator` (`apps/orchestrator/`) consumes the topic with `ZERO_ORCH_CONCURRENCY` (default 2). Local queue is in-process when using `npm run start:all` or Compose with shared Redis. Stage snapshots go to `cache` (`state.<runId>`); clients can `GET /api/runs/:id/stream` (SSE) or keep polling. Standalone: `npm run orchestrator`.

**Execution farm (M4 shipped):** Orchestrator publishes `execution.requested` (one message = one run’s TC batch) and waits for `execution.completed`. `@zero/executor` (`apps/executor/`) runs Playwright with `ZERO_EXEC_CONCURRENCY` / `ZERO_EXEC_ATTEMPTS`. `API_ONLY=1` does not subscribe to execution. `npm start` is API-only; use `npm run start:all` (or Compose) for a local all-in-one stack. Screenshots go to the object store. `EXECUTION_MODE=minimal` remains URL-load, not E2E proof.

### Auth & tenancy (M5 shipped)

- Identity is a verified API key (`x-api-key` hashed against `ZERO_API_KEYS` / `ZERO_DEV_API_KEY`) or a Bearer JWT (`ZERO_AUTH_JWT_SECRET` HS256, or RS256 when `OIDC_PUBLIC_KEY` + optional `OIDC_ISSUER` / `OIDC_AUDIENCE` are set). `X-User-Email` is ignored.
- `ZERO_AUTH=on` (always on when `NODE_ENV=production`) returns 401 without a verified identity. Local/dev default is off so the UI keeps working; unauthenticated callers are scoped to tenant `local` only.
- Runs store `tenantId` (Postgres `qa_runs.tenant_id`). List/get/files/download/assets/stream/commit/rerun are tenant-filtered (mismatch → 404).
- Production refuses to boot if `KEY_ENC_SECRET` is missing or still the dev default.

### LLM surface (M6 shipped)

UI stores Claude / OpenAI / Gemini keys (`/api/provider-keys`) and per-agent model/prompt (`/api/agent-settings`). `processRun` decrypts the key and calls the provider through `@zero/orchestrator/llm` (`callProvider` → OpenAI `chat.completions`, Anthropic messages, Gemini `generativelanguage`). Template output is always the base; enrichment is best-effort. Guardrails: `ZERO_LLM_RPM` (default 20), `ZERO_LLM_MAX_USD_PER_RUN` (default $0.50), prompt versions `ba.v1` / `manager.v1` / `manualQa.v1` / `automationQa.v1`. `ZERO_LLM=off` forces templates. Env keys (`OPENAI_API_KEY` etc.) are used only when `ZERO_LLM_ENV_KEYS=1`. Artifacts stamp `metadata.llm` (`used`, `provider`, `promptVersion`, `fallbackReason`). Keys are never logged in full.

### Key HTTP surface

| Area | Routes |
|------|--------|
| Runs | `POST/GET /api/runs`, `GET /api/runs/:id`, `POST …/rerun-failed`, `…/download`, `…/assets` |
| Locators | `POST /api/element-log`, `GET /api/locators?host=` |
| Recording | `/api/recordings/*`, `/record`, `/recorder.js` (CORS allowlist: localhost + `RECORDING_ORIGINS` / `ALLOWED_ORIGINS` — never `*`) |
| CMS | `/api/capture-cms-screenshot`, `/api/capture-cms-signal-bulk` |
| Keys / agents | `/api/provider-keys`, `/api/agent-settings`, `/api/keys*` |
| Ops | `/health`, `/api/health/detailed`, `/api-docs` (Swagger) |

`/artifacts` returns 404. Files: `GET /api/runs/:id/files/:name` or a signed `/api/cloud/local` URL. Download: `GET /api/runs/:id/download?format=json&url=1` returns `{ url, key }`.

---

## Target vision (IDE-style — not fully shipped)

Work like an IDE: **project** → upload TC CSV → **record** flow → AI analysis → locators → **Java scripts in SQL** → Manager → execution → Delivery report.

Intended tables/APIs (helpers partially in `@zero/db`; **no `/api/projects` routes in `apps/api` yet**):

- Tables: `projects`, `stored_scripts`, `recordings`, optional `project_id` on runs/locators/logs
- APIs: `POST/GET /api/projects`, `POST …/recordings`, `GET …/scripts`, runs with `projectId`

Why Java: exportable Selenium suites for real CI; in-app execution can stay Playwright while Java is the reusable artifact.

---

## Production gaps (read this to productionize)

Prioritized against the live code, not the marketing surface.

### P0 — blockers

1. **~~Re-enable real persistence~~ (done — M1)** — Postgres activates when `DATABASE_URL`/`PGHOST` is set; `qa_runs` / `qa_assets` DDL lives in `@zero/db`. Remaining durability gaps: recordings / selector memory / multi-instance Maps (partially addressed by M2–M3).
2. **~~Real authentication & authorization~~ (done — M5)** — Verified API keys / JWT; tenant-scoped runs and artifacts. Remaining: full hosted OIDC JWKS fetch (PEM/`OIDC_PUBLIC_KEY` works today); UI has no login screen yet (`ZERO_AUTH=off` locally).
3. **Do not serve secrets or raw artifacts publicly** — `/artifacts` static serving is removed (M2). Recording CORS is allowlisted (M5). Login passwords stay in process memory. Production requires `KEY_ENC_SECRET`.
4. **~~Job isolation for Playwright~~ (done — M4)** — execution is queue-triggered (`execution.requested`) with concurrency/retry caps. Split API / execution processes across machines with Compose or `ZERO_CLOUD=aws|gcp` (M7). `npm start` is API-only; `npm run start:all` co-locates for local dev. Optional a11y/perf/security and Web Analyzer still launch Chromium from the executor path.
5. **Honest execution semantics** — Default minimal mode always “passes” URL load checks. Product/Go-NoGo reports must not be treated as E2E proof without `EXECUTION_MODE=full` or external runners.

### P1 — reliability & ops

6. **Horizontal scale story** — In-memory Maps (`runs`, recordings, secrets, selector memory) break multi-instance deploy. Sticky sessions are not enough; shared store + queue required.
7. **Platform fit** — Vercel path uses `/tmp/artifacts` (ephemeral). Playwright + long runs need a long-lived host (Railway/VM/K8s), not serverless request timeouts.
8. **Observability** — Winston + request IDs exist; add structured metrics (queue depth, run duration, Playwright failures), alerting, and retention/TTL for `artifacts/`.
9. **Config hygiene** — `.env.example` embeds a concrete Railway hostname; use placeholders. Fail startup in production if `KEY_ENC_SECRET` / `NODE_ENV=production` secrets are missing.
10. **Middleware order & CSP** — Duplicate error handlers; catch-all SPA route after error middleware. CSP allows `'unsafe-inline'` / `'unsafe-eval'`. Tighten for production builds.

### P2 — product / architecture debt

11. **~~Monolith split~~ (packaging track)** — HTTP lives in `apps/api`, DAG in `apps/orchestrator`, Chromium in `apps/executor`. Remaining: finish packaging S5–S6 and keep apps from importing sibling `apps/*`.
12. **~~LLM agents are UI-only~~ (done — M6)** — Provider keys drive BA/Manual/Automation/Manager through `@zero/orchestrator/llm`. Remaining: no streaming tokens in the UI; cost is estimated, not billed from the vendor invoice.
13. **Projects / stored scripts API** — Vision tables without HTTP surface; recordings never land in Postgres while DB is off.
14. **Tests** — Jest smoke + HTTP tests exist; expand hermetic Playwright coverage.
15. **apiKeyAuth / Swagger** — Documented enterprise features that are stubs; either finish or gate behind feature flags.
16. **CORS** — Non-production allows all origins; production still allows `*.vercel.app` / `*.up.railway.app` wildcards — narrow to known frontends.

### Suggested productionization sequence

1. ~~Unlock Postgres~~ (M1) — next: object store + signed URLs (M2), then queue/orchestrator (M3).
2. Add auth + artifact access control.
3. Extract `processRun` to a queued worker with `maxConcurrency`.
4. Split “script generation / reports” product path from “true E2E verdict” path in UI copy and Manager logic.
5. Wire or defer LLM agents; ship Dockerfile + health probes + backup for DB/artifacts.
6. Add CI: lint, unit tests, one headed/headless smoke against a static fixture site.

# ZER0 Architecture — V2 (target + gaps)

**AI QA orchestration — target vision and production gaps.** IDE-style project workflow: upload TCs → record → AI agent analysis → locators → Java scripts in SQL → Manager agent → execution → Delivery report.

For what ships today, see [../v1/ARCHITECTURE.md](../v1/ARCHITECTURE.md).

Interactive blueprint: `/architectureV2.html` (source: `web/public/architectureV2.html`). Live docs site Architecture tab: `support/zero-docs` (`:5174`).

**Implement via:** `support/agent-workflow/` + `/zero-target-arch` (`npm run workflow:status`).

---

## Target vision (IDE-style — not fully shipped)

Work like an IDE: **project** → upload TC CSV → **record** flow → AI analysis → locators → **Java scripts in SQL** → Manager → execution → Delivery report.

Intended tables/APIs (helpers partially in `@zero/db`; **no `/projects` routes in `services/api` yet**). Runtime DDL and ER: [../v1/DATABASE.md](../v1/DATABASE.md).

- Tables: `projects`, `stored_scripts`, `recordings`, optional `project_id` on runs/locators/logs
- APIs: `POST/GET /projects`, `POST …/recordings`, `GET …/scripts`, runs with `projectId`

Why Java: exportable Selenium suites for real CI; in-app execution can stay Playwright while Java is the reusable artifact.

---

## Run sequence contract (normative)

One QA run, from **POST** to **signed download**: 36 numbered hops in four phases. Step numbers are stable identifiers — quote them in prompts, PRs, and reviews.

Rendered views (all derived from `support/zero-docs/src/data/sequence.ts`, so they cannot drift):

- Blueprint page — `web/public/architectureV2.html` → tab 03 → *Sequence · start-to-report*
- Docs site — Blueprint tab (`#sequence`) and V3 tab (`#v3-sequence`, ownership view)

### Invariants

Any change to the runtime must keep these true. They are the reason the hops exist.

| ID | Invariant | Enforced at steps |
|----|-----------|-------------------|
| INV-1 | **No in-memory handoff between services.** Every hop crosses Postgres, object store, event bus, Redis, or secrets. | all 34 non-loop steps |
| INV-2 | **Messages carry ids, not payloads.** Consumers re-read state from the source of truth. | 6, 8, 9, 10, 19, 21 |
| INV-3 | **Bytes bypass the API.** Uploads and downloads use presigned URLs; `/artifacts` is never statically served. | 2, 4, 35, 36 |
| INV-4 | **Durable before announce.** The run is `queued` in Postgres before `runs.requested` is published. | 5 → 6 |
| INV-5 | **Persist every stage output.** A retry after a crash never re-pays for the same LLM call. | 14, 26, 30, 32 |
| INV-6 | **Secrets are fetched at point of use.** Never in queue payloads, run records, or artifacts. | 11, 22 |
| INV-7 | **Progress travels by pub/sub.** The orchestrator never holds the client socket; any API replica can relay SSE. | 15, 33 |
| INV-8 | **Chromium runs only in the executor.** API and orchestrator images cannot resolve Playwright. | 24 |
| INV-9 | **Learned locators are written back.** Merge order stays profile → memory → DB. | 18, 26 |
| INV-10 | **One terminal state.** `qa_runs.status = completed` is the single authoritative completion. | 32 |

### A · Intake — steps 1–7

The API accepts metadata, hands back signed upload URLs, records the run as `queued`, and announces it. File bytes never pass through the API process.

| # | Hop | Operation | Crosses | Owner |
|---|-----|-----------|---------|-------|
| 1 | Client → API GW → API | `POST /runs` — metadata only (S7 dropped `/api` prefix) | http | `@zero/api` |
| 2 | API → Object store | presign PUT for `tcFile` / `recordingFile` | object store | `@zero/cloud` |
| 3 | API → Client | `202 { runId, uploads[] }` | http | `@zero/api` |
| 4 | Client → Object store | PUT files directly — bypasses the API | object store | `@zero/web` |
| 5 | API → Postgres | `INSERT qa_runs` (status = queued) | postgres | `@zero/db` |
| 6 | API → Event bus | publish `runs.requested { runId }` | event bus | `@zero/cloud` |
| 7 | API → Client | open SSE `/runs/:id/stream` | http | `@zero/api` |

### B · Plan — steps 8–19

The orchestrator rebuilds every input from durable storage — the message carried only a run id — then runs BA, Manual QA, and Automation QA. No browser starts in this phase.

| # | Hop | Operation | Crosses | Owner |
|---|-----|-----------|---------|-------|
| 8 | Bus → Orchestrator | deliver `runs.requested` | event bus | `@zero/orchestrator` |
| 9 | Orch → Postgres | `SELECT` run | postgres | `@zero/db` |
| 10 | Orch → Object store | GET inputs uploaded at step 4 | object store | `@zero/cloud` |
| 11 | Orch → Secrets manager | fetch LLM + login secrets | secrets | `@zero/cloud` |
| 12 | Orch → LLM | BA agent prompt | llm | `@zero/orchestrator` |
| 13 | LLM → Orch | requirements | llm | `@zero/orchestrator` |
| 14 | Orch → Postgres | persist `artifacts.requirements` | postgres | `@zero/db` |
| 15 | Orch → Redis pub/sub | state `ba:done` — API relays to SSE | redis | `@zero/cloud` |
| 16 | Orch → LLM | Manual QA + Automation QA prompts | llm | `@zero/orchestrator` |
| 17 | LLM → Orch | test cases + selector plan | llm | `@zero/orchestrator` |
| 18 | Orch → Postgres | merge with `element_locators` by host | postgres | `@zero/locators` |
| 19 | Orch → Event bus | publish `execution.requested` per batch | event bus | `@zero/cloud` |

### C · Execute — steps 20–28 (loop per TC batch)

Every batch is a self-contained job — its own secrets, its own inputs, its own Chromium, its own uploads. Batches run in parallel and share nothing.

| # | Hop | Operation | Crosses | Owner |
|---|-----|-----------|---------|-------|
| 20 | — | loop per TC batch (fan-out) — 21–27 repeat, in parallel | control | `@zero/orchestrator` |
| 21 | Bus → Execution worker | deliver `execution.requested` | event bus | `@zero/executor` |
| 22 | Job → Secrets manager | pull runtime login secret | secrets | `@zero/cloud` |
| 23 | Job → Object store | download recording (if any) | object store | `@zero/cloud` |
| 24 | Job → Playwright chromium | isolated container run | chromium | `@zero/executor` |
| 25 | Job → Object store | PUT screenshots + traces | object store | `@zero/cloud` |
| 26 | Job → Postgres | upsert `element_locators` (learned) | postgres | `@zero/locators` |
| 27 | Job → Event bus | publish `execution.completed` | event bus | `@zero/cloud` |
| 28 | — | end loop | control | `@zero/orchestrator` |

### D · Report — steps 29–36

Aggregate the batch results, write the Manager and Delivery reports, mark the run complete — then hand the client a signed URL instead of proxying bytes.

| # | Hop | Operation | Crosses | Owner |
|---|-----|-----------|---------|-------|
| 29 | Bus → Orchestrator | aggregate `execution.completed` | event bus | `@zero/orchestrator` |
| 30 | Orch → Postgres | write `executionReport` | postgres | `@zero/db` |
| 31 | Orch → LLM | Manager + Delivery prompts | llm | `@zero/orchestrator` |
| 32 | Orch → Postgres | `qa_runs.status = completed` | postgres | `@zero/db` |
| 33 | Orch → Redis pub/sub | state `completed` → SSE | redis | `@zero/cloud` |
| 34 | Client → API | `GET /runs/:id/download` | http | `@zero/web` |
| 35 | API → Object store | presign GET (report + screenshots) | object store | `@zero/cloud` |
| 36 | API → Client | `302` signed URL | http | `@zero/api` |

### Boundary budget

`postgres` 7 · `object store` 6 · `event bus` 6 · `http` 5 · `llm` 5 · `redis` 2 · `secrets` 2 · `chromium` 1 · in-memory handoffs **0**.

### Conformance today

Under the default `ZERO_CLOUD=local`, steps 1–6, 8, and 19–27 execute inside one process — the boundaries are function calls through `@zero/cloud` rather than network hops. That is the intended shape: S4/S5 gave the executor and orchestrator their own images, **S7 split the SPA out into its own nginx image (`zero-web`, `:3000`) and dropped the `/api` route prefix from the API service (`zero-api`, `:3001`)**, and switching `ZERO_CLOUD` to `aws`, `gcp`, `azure`, or `vercel` makes the remaining hops real without touching agent code. Vendor SDKs stay inside `packages/cloud/`.

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
7. **Platform fit** — Vercel path uses ephemeral `/tmp/dist`. Playwright + long runs need a long-lived host (Railway/VM/K8s), not serverless request timeouts.
8. **Observability** — Winston + request IDs exist; add structured metrics (queue depth, run duration, Playwright failures), alerting, and retention/TTL for `dist/artifacts/`.
9. **Config hygiene** — `.env.example` embeds a concrete Railway hostname; use placeholders. Fail startup in production if `KEY_ENC_SECRET` / `NODE_ENV=production` secrets are missing.
10. **Middleware order & CSP** — Duplicate error handlers; catch-all SPA route after error middleware. CSP allows `'unsafe-inline'` / `'unsafe-eval'`. Tighten for production builds.

### P2 — product / architecture debt

11. **~~Monolith split~~ (packaging track)** — HTTP lives in `services/api`, DAG in `services/orchestrator`, Chromium in `services/executor`. Remaining: keep services from importing sibling `services/*`.
12. **~~LLM agents are UI-only~~ (done — M6)** — Provider keys drive BA/Manual/Automation/Manager through `@zero/orchestrator/llm`. Remaining: no streaming tokens in the UI; cost is estimated, not billed from the vendor invoice.
13. **Projects / stored scripts API** — Vision tables without HTTP surface; recordings never land in Postgres while DB is off.
14. **Tests** — Jest smoke + HTTP tests exist; expand hermetic Playwright coverage.
15. **apiKeyAuth / Swagger** — Documented enterprise features that are stubs; either finish or gate behind feature flags.
16. **CORS** — Non-production allows all origins; production still allows `*.vercel.app` / `*.up.railway.app` wildcards — narrow to known frontends.

### Suggested ops / product sequence (M1–M7 · S0–S7 · Q1–Q4 done)

Capability, packaging, and autonomous product tracks are complete. Remaining work is ops maturity and product polish:

1. Hermetic Compose smoke (`e2e/smoke.sh`) in CI against web `:3000` + API `:3001`.
2. Observability — dashboards for `queue_lag` / `executor_slots_used`, runbook + SLOs.
3. OIDC login UI (API keys / JWT already work; no browser login screen yet).
4. Crash-resume walker that skips completed stages in `qa_runs.stages_json`.
5. Standalone migrate CLI (boot already runs `runPendingMigrations()`).
6. Wire `enableSecurity` through API intake (UI checkbox exists; only a11y/perf are parsed today), or remove the control.
7. Narrow production CORS wildcards; finish or gate stub Swagger enterprise features.

You are implementing ZER0 (ai-qa-orchestrator) so the **Target architecture** on `/architectureV2.html` (Production Blueprint tab) becomes the live runtime. Do not invent a different cloud shape.

## Ground truth (read before coding)
1. `AGENTS.md` — layout, pipeline, conventions
2. `zero-docs` — target, sequence, per-workspace patterns, done/not-done
3. `web/public/architectureV2.html` (built to `dist/web/architectureV2.html`) — Target architecture diagram, start-to-report sequence, provider matrix, adapter contracts, milestones M1–M7, Ship Checklist
4. `services/api/server.js` — HTTP API composition root (routes in `src/routes/`; Chromium in `@zero/executor`)
5. `packages/*` — `@zero/cloud` · `@zero/db` · `@zero/domain` · `@zero/locators` · `@zero/builders` · `@zero/analyzer`
6. `web/` — React UI
7. `support/agent-workflow/` — autonomous loop, milestone specs, progress.json

Each workspace has **three names** (not three repos): **Folder** (`services/api/`) · **npm package** (`@zero/api`) · **Cursor skill** (`/zero-api`). Roster: `support/agent-workflow/prompts/repos/README.md`.

Distinguish **current runtime** (three workspace-scoped images — `zero-api` · `zero-orchestrator` · `zero-executor` — split by S4/S5; Maps still shadow some tables; Postgres/Redis/object store optional and default to local; `npm run start:all` co-locates the workers for local dev) from **target** (stateless API · queue orchestrator · ephemeral Playwright farm · required Postgres + object store + Redis, autoscaled).

## North-star shape (do not redesign)
Three tiers, one contract:
- **HTTP API** — folder `services/api/` · npm `@zero/api` · skill `/zero-api`. Auth, run intake, status/SSE, signed URLs. Never runs Chromium.
- **Orchestrator worker** — folder `services/orchestrator/` · npm `@zero/orchestrator` · skill `/zero-orchestrator`. BA · Manual · Automation · Manager · Delivery, LLM calls, DAG state. Consumes `runs.requested`.
- **Playwright executor** — folder `services/executor/` · npm `@zero/executor` · skill `/zero-executor`. Ephemeral Playwright jobs on `execution.requested`; screenshots/traces to object store.

Every tier talks only through provider-agnostic primitives in Cloud adapters (`@zero/cloud`, folder `packages/cloud/`, skill `/zero-cloud`):
`queue` · `object store` · `relational DB` · `KV/cache` · `secrets`.
Wire once from `process.env.ZERO_CLOUD` = `aws` | `gcp` | `azure` | `vercel` | `local`. Domain/agent code must not import vendor SDKs.

Honor the numbered start-to-report sequence on the blueprint page (presigned uploads → Postgres `qa_runs` → bus → orch → LLM stages → execution fan-out → Manager/Delivery → signed download).

## Milestone order (ship in order; each unblocks the next)
- **M1 Durable store** — Restore real `databaseConfigured()` / `initDatabase()`. Wire Postgres for `qa_runs`, `qa_assets` (add DDL if missing), `element_locators`, and related tables in `@zero/db`. Kill reliance on in-memory `runs` / `runSecrets` / `recordingSessions` / `selectorMemory` Maps for durability.
- **M2 Object store + signed URLs** — Move `artifacts/` off local disk. Browser uploads via presigned PUT; API never streams large bodies. Screenshots/reports via presigned GET.
- **M3 Queue + orchestrator** — Extract `processRun` into a worker consuming `runs.requested`. API returns immediately; progress via Redis pub/sub → SSE.
- **M4 Execution farm** — Playwright in container jobs behind `execution.requested`. Fan-out per TC batch; retries via queue; concurrency caps.
- **M5 Auth + ACL** — Real OIDC (or verified API keys). Per-tenant scoping on runs/artifacts. Stop spoofable `X-User-Email` and “any non-empty x-api-key”. No public `/artifacts`; recording CORS not `*`.
- **M6 LLM wiring** — Provider keys UI actually drives BA/Manager (and Manual/Automation as designed). Rate limits, cost caps, prompt versioning. Until wired, do not claim LLM agents are live.
- **M7 Multi-cloud adapters** — `@zero/cloud` for AWS + one other; IaC per provider; CI smoke.

## Ship Checklist constraints (fix while building)
P0: Postgres hard-disable, no real auth, public artifacts + open recording CORS, in-process unbounded Playwright, minimal execution ≠ E2E proof.
P1: memory-bound state, wrong host for Chromium on serverless, default `KEY_ENC_SECRET`, missing tests/CSP/CORS hygiene.
P2: disconnected LLM UI, unfinished IDE/projects vision, monolith split as needed for workers — keep focused; no drive-by refactors of all of `services/api/server.js`.

## Product rules to preserve
- Pipeline order: optional `webAnalyzer` → `ba` → `manualQa` → `automationQa` → `execution` → optional a11y/perf/security → `manager` → `delivery`.
- Locator merge: profile → memory → DB (`@zero/locators`).
- Default `EXECUTION_MODE=minimal` stays honest (URL load ≠ release proof); `full` is opt-in/brittle.
- Never log or persist login passwords; secrets via secrets manager / `runSecrets` equivalent only.
- UI source is `web/src/**`; rebuild with `npm run build`.

## How to work
1. Run `npm run workflow:status` — start at the earliest unfinished milestone, or stop when all probes pass.
2. If the user named a workspace, read `support/agent-workflow/prompts/repos/<name>.md` and use that skill (`/zero-api`, `/zero-web`, …). Always spell folder, npm package, and Cursor skill.
3. M1–M7 capability, S0–S7 packaging, and Q1–Q4 product probes are green. Do not re-implement them or invent a new milestone.
4. Small, reviewable PRs; update `support/zero-docs` status when something flips done / not-done.
5. Prefer adapters + interfaces first, then one concrete provider (`local` or AWS) so local/dev still runs.
6. When done, run `npm run workflow:verify -- --milestone Q4` (or the named regressed step). Ask before destructive migrations or public API breaks.

## Acceptance for “Target architecture is real”
- API is stateless; Chromium only in execution workers.
- Run state and artifacts survive multi-instance restarts (Postgres + object store + Redis).
- Uploads/downloads are signed; artifacts are not world-readable.
- Auth scopes tenants; no spoofable identity headers.
- Agents/orchestrator communicate via queues; cloud SDKs only under `@zero/cloud`.
- Capability M1–M7, packaging S0–S7, and product Q1–Q4 probes pass.
- Compose runtime names match the target tiers: `web`/`zero-web`, `api`/`zero-api`, `orchestrator`/`zero-orchestrator`, and `executor`/`zero-executor`.

Verify or repair a regressed target boundary. If all probes pass, report completion and stop. Read `prompts/packaging.md`; ask before destructive migrations or changing public API contracts.

You are implementing ZER0 (ai-qa-orchestrator) so the **Target architecture** on `/architectureV2.html` (Production Blueprint tab) becomes the live runtime. Do not invent a different cloud shape.

## Ground truth (read before coding)
1. `AGENTS.md` — layout, pipeline, conventions
2. `docs/ARCHITECTURE.md` — current vs target + production gaps
3. `public/architectureV2.html` — Target architecture diagram, start-to-report sequence, provider matrix, adapter contracts, milestones M1–M7, Ship Checklist
4. `server.js` — live agents, `stageKeys`, `processRun`, Maps, APIs (~5k lines)
5. `lib/` — `db.js`, locators, script builders, encryption, middleware
6. `agent-workflow/` — autonomous loop, milestone specs, progress.json

Distinguish **current runtime** (in-process Express + Playwright, Maps, optional/disabled Postgres) from **target** (stateless API · queue orchestrator · ephemeral Playwright farm · required Postgres + object store + Redis).

## North-star shape (do not redesign)
Three tiers, one contract:
- **API** — auth, run intake, status/SSE, signed URLs. Never runs Chromium.
- **Orchestrator** — BA · Manual · Automation · Manager · Delivery, LLM calls, DAG state. Consumes `runs.requested`.
- **Execution farm** — ephemeral Playwright jobs on `execution.requested`; screenshots/traces to object store.

Every tier talks only through provider-agnostic primitives in `lib/cloud/*`:
`queue` · `object store` · `relational DB` · `KV/cache` · `secrets`.
Wire once from `process.env.ZERO_CLOUD` = `aws` | `gcp` | `azure` | `vercel` | `local`. Domain/agent code must not import vendor SDKs.

Honor the numbered start-to-report sequence on the blueprint page (presigned uploads → Postgres `qa_runs` → bus → orch → LLM stages → execution fan-out → Manager/Delivery → signed download).

## Milestone order (ship in order; each unblocks the next)
- **M1 Durable store** — Restore real `databaseConfigured()` / `initDatabase()`. Wire Postgres for `qa_runs`, `qa_assets` (add DDL if missing), `element_locators`, and related tables in `lib/db.js`. Kill reliance on in-memory `runs` / `runSecrets` / `recordingSessions` / `selectorMemory` Maps for durability.
- **M2 Object store + signed URLs** — Move `artifacts/` off local disk. Browser uploads via presigned PUT; API never streams large bodies. Screenshots/reports via presigned GET.
- **M3 Queue + orchestrator** — Extract `processRun` into a worker consuming `runs.requested`. API returns immediately; progress via Redis pub/sub → SSE.
- **M4 Execution farm** — Playwright in container jobs behind `execution.requested`. Fan-out per TC batch; retries via queue; concurrency caps.
- **M5 Auth + ACL** — Real OIDC (or verified API keys). Per-tenant scoping on runs/artifacts. Stop spoofable `X-User-Email` and “any non-empty x-api-key”. No public `/artifacts`; recording CORS not `*`.
- **M6 LLM wiring** — Provider keys UI actually drives BA/Manager (and Manual/Automation as designed). Rate limits, cost caps, prompt versioning. Until wired, do not claim LLM agents are live.
- **M7 Multi-cloud adapters** — `lib/cloud/*` for AWS + one other; IaC per provider; CI smoke.

## Ship Checklist constraints (fix while building)
P0: Postgres hard-disable, no real auth, public artifacts + open recording CORS, in-process unbounded Playwright, minimal execution ≠ E2E proof.
P1: memory-bound state, wrong host for Chromium on serverless, default `KEY_ENC_SECRET`, missing tests/CSP/CORS hygiene.
P2: disconnected LLM UI, unfinished IDE/projects vision, monolith split as needed for workers — keep focused; no drive-by refactors of all of `server.js`.

## Product rules to preserve
- Pipeline order: optional `webAnalyzer` → `ba` → `manualQa` → `automationQa` → `execution` → optional a11y/perf/security → `manager` → `delivery`.
- Locator merge: profile → memory → DB (`lib/locatorRegistry.js`).
- Default `EXECUTION_MODE=minimal` stays honest (URL load ≠ release proof); `full` is opt-in/brittle.
- Never log or persist login passwords; secrets via secrets manager / `runSecrets` equivalent only.
- UI source is `client/src/**`; rebuild with `npm run build`. Prefer extracting workers/routers into `lib/` only when matching existing boundaries.

## How to work
1. Run `npm run workflow:status` — start at the earliest unfinished milestone.
2. Small, reviewable PRs per milestone; update `docs/ARCHITECTURE.md` and architecture HTML only when behavior changes.
3. Prefer adapters + interfaces first, then one concrete provider (`local` or AWS) so local/dev still runs.
4. Add CI smoke: health + one hermetic path; do not treat Manager “Go” as E2E without full mode or external runners.
5. When done with a milestone, run `npm run workflow:verify`, update `agent-workflow/progress.json`, and state what flipped from “target” to “shipped”.

## Acceptance for “Target architecture is real”
- API is stateless; Chromium only in execution workers.
- Run state and artifacts survive multi-instance restarts (Postgres + object store + Redis).
- Uploads/downloads are signed; artifacts are not world-readable.
- Auth scopes tenants; no spoofable identity headers.
- Agents/orchestrator communicate via queues; cloud SDKs only under `lib/cloud/*`.
- Milestones M1–M4 complete at minimum; M5–M7 planned or partially landed with clear gaps called out.

Implement the next unfinished milestone now. Ask before destructive migrations or changing public API contracts.

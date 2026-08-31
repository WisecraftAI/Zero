# AGENTS.md — ZER0 (ai-qa-orchestrator)

Architect-level QA orchestration UI: optional Web Analyzer (multi-page crawl) → optional domain inference (LLM when low confidence) → BA → Manual QA → Automation QA → Playwright execution → optional a11y/perf/security → Manager/Delivery reports. Supports **any public URL** (autonomous mode) or guided runs with Figma/notes/CSV. Generates reusable Playwright + Java/Selenium scripts. BA / Manual / Automation / Manager call Claude, OpenAI, or Gemini when a decrypted provider key exists (`@zero/orchestrator/llm`); otherwise they stay on templates.

**Human onboarding (new PC):** [`support/zero-docs/docs/v1/DEVELOPER_GUIDE.md`](./support/zero-docs/docs/v1/DEVELOPER_GUIDE.md) §2 Day-0 — prerequisites, `.env`, Docker / hybrid / `start:all`, verify.

## Quick start

```bash
# optional: copy .env.example to .env and set Postgres/secrets
cp .env.example .env

npm install
npx playwright install chromium
# build the Vite client → dist/web/
npm run build
# API only (default PORT=3001 since S7)
npm start
# local all-in-one: API + orchestrator + executor
npm run start:all
```

> Run each line separately. If you paste with inline `# ...` comments, zsh may treat `#` as a literal arg (INTERACTIVE_COMMENTS is off by default) and break `vite build`. Enable once with `setopt interactive_comments` if you want inline comments to be safe.

- UI: `http://localhost:3000` (nginx serving the SPA)
- API: `http://localhost:3001` (Express, no `/api` prefix — `/runs`, `/cloud/local`, `/health`, `/health/detailed`, …)
- Dev UI: `npm run client` (Vite `:5173`, fetches use absolute URLs via `VITE_API_BASE_URL`)
- Health: `GET http://localhost:3001/health` · `GET http://localhost:3000/health` (nginx liveness)
- Regenerable outputs: `dist/{web,artifacts,coverage,logs}`
- `npm start` = API only (`services/api/server.js`)
- `npm run start:all` = local all-in-one stack (`scripts/local-stack.js`)

### Docker (V3 S7 — split web, API, orchestrator, and executor)

Compose runs four independent, workspace-scoped images. The SPA lives in its own nginx image on `:3000`; the API listens on `:3001`. Playwright is installed only in the executor image. Locally, use `npm run start:all` when you need API + workers without Compose. Full operator guide: `support/zero-docs/docs/v1/DOCKER.md`.

There is also an **optional** `Dockerfile.demo` (`zero-demo`, not in Compose): one container running `scripts/local-stack.js`, so API + orchestrator + executor share a process. That is the only way `ZERO_CLOUD=local` works without Redis — the local queue is in-process. Used for cheap cloud demos: `support/zero-docs/docs/v1/DEPLOY.md`.

```bash
docker compose up --build
# Web UI     http://localhost:3000
# API        http://localhost:3001/health
# Docs       http://localhost:5174
# Workflow   http://localhost:5175/status   (probes the bind-mounted repo)
# Hybrid — infra in Docker, app on host:
docker compose up -d postgres redis
# then set DATABASE_URL=postgres://zero:zero@localhost:5432/zero and npm run start:all

# Optional — S3 adapter drill against MinIO (not used when ZERO_CLOUD=local):
docker compose --profile s3 up -d minio minio-init

# Docs (Vite, bind-mounted — no rebuild on edit) or workflow only:
docker compose up docs
docker compose up --build workflow
```

## Layout

| Path | Role |
|------|------|
| `services/api/` | HTTP intake (`server.js` composition root + `src/routes/`). `npm start` |
| `services/orchestrator/` | DAG worker (`runs.requested`) + `llm/` |
| `services/executor/` | Playwright job worker (`execution.requested`) |
| `packages/cloud` | Queue · object store · secrets · cache (`ZERO_CLOUD`) |
| `packages/{db,domain,locators,builders,analyzer}` | Shared libs imported as `@zero/*` |
| `packages/brand` | Logo paths + theme palettes for server-side rendering (generated from `web/`; `npm run brand:generate`) |
| `web/` | React 18 + Vite SPA (`src/views`, `src/components`, `src/layouts`, SCSS in `src/styles`) |
| `dist/` | Regenerable outputs only (gitignored): `web/` UI build, `artifacts/`, `coverage/`, `logs/` |
| `support/` | Non-runtime supporting folders: `agent-workflow/`, `zero-docs/`, `ml-training/`, `samples/` |
| `support/zero-docs/` | Docs site (`:5174`) + markdown under `docs/v1` (runtime) and `docs/v2` (target). See `support/zero-docs/README.md`. |
| `support/agent-workflow/` | Target-arch: capability M1–M7 (done) + packaging S0–S7 (done) + product Q1–Q4 (done), **Q5 open**, **U1–U3 UI/UX + RTK store done**. Docker: `workflow` service on `:5175` |
| `support/ml-training/` | Optional Python per-agent quality models (separate from Node runtime) |
| `support/samples/` | Example CSV test-case inputs |
| `scripts/set-database.js` | DB helper (`npm run set-db`) |
| `scripts/generate-brand-assets.js` | Mirrors `web/` logo art + theme palettes into `@zero/brand` (`npm run brand:generate`) |
| `scripts/local-stack.js` | `npm run start:all` — co-locate API + orchestrator + executor |

## Pipeline stages

Order in `stageKeys`: optional `webAnalyzer` → `ba` → `manualQa` → `automationQa` → `execution` → optional `accessibility`/`performance`/`security` → `manager` → `delivery`.

1. **Web Analyzer** — whenever no TC file is uploaded (BA notes are a focus hint and do not skip it); multi-page Playwright crawl via `@zero/analyzer` (`crawlLinkedPages`, `ZERO_ANALYZER_MAX_PAGES` default 8)
2. **Domain inference** — after Web Analyzer, before BA: one LLM call when `websiteTypeConfidence < 0.5` or type is `GENERIC` (`@zero/orchestrator/inferDomain.js`); skipped without key or when `ZERO_LLM=off`
3. **BA** — template consolidation of URL + optional Figma / uploaded TCs / notes / analyzer insights
4. **Manual QA** — cases from CSV, UI rows, URL analysis (`majorFunctionalCases`), or channel templates
5. **Automation QA** — locator candidates: profile + in-memory learned (+ Postgres when DB enabled)
6. **Execution** — Playwright with retries + screenshots under `dist/artifacts/`
7. **Optional** — accessibility / performance / security Playwright passes
8. **Manager / Delivery** — executive review + stakeholder delivery report

The PDF report decides the release verdict itself from the automated pass rate — `>= 95%` Full pass (manual spot check), `85–94%` Conditional pass, `< 85%` Manual check, unscored when nothing was recorded (`releaseGate` in `services/api/src/reports/runPdfReport.js`). A **skipped check scores as a failure** everywhere (`gateScore` in the report, `totals.passRate` in the executor, the Manager Go/Hold label): it leaves its journey unverified, so it stays in the denominator. The Manager agent's label (Go / Conditional Go / Hold) is printed alongside as a secondary signal, not as the headline.

Channel profiles (`@zero/domain` `appProfiles`): Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic. Rule-based types also include SAAS, MARKETPLACE, ECOMMERCE, etc. (`@zero/analyzer` `WEBSITE_TYPES`).

## Execution modes (important)

- **`discovered_flows`**: URL-only auto runs (no CSV, web analysis present) — top 3–5 critical flows from crawl as multi-step Playwright checks (`url_analysis_auto` in `@zero/domain`).
- **Default (`minimal`)**: CSV TCs mostly load URL + wait for body — pipeline completes reliably; reports + Java scripts still generated.
- **`uploaded_tc_only`**: CSV upload forces execution derived from uploaded cases.
- **`EXECUTION_MODE=full`**: keyword/selector navigation — brittle on real sites; use only when tuning selectors.
- **`RUN_HEADED=true`** or UI “Show browser”: visible Chromium for validation.

Prefer ZERO for: **URL-only** → crawl → major cases → flow execution → Manager report; or **CSV** → requirements → TCs → Java scripts → Manager report. Run real E2E in an external Java/Playwright project using exported scripts.

## Persistence

**Today:** runs live in an in-memory `Map`, are written to `dist/artifacts/<runId>/run.json`, and — when `DATABASE_URL` or `PGHOST` is set — are upserted to Postgres (`qa_runs` / `qa_assets` plus locator/project/provider/`agent_memory` tables via `@zero/db` `initAllTables`). If Postgres is unset or unreachable, the process falls back to memory + file. Host-scoped agentic memory (BA summaries, extra cases, locator hints, execution failures) is recalled on later runs for the same host; classification keys are not cached.

**Object store (M2):** `ZERO_CLOUD=local` stores blobs under `dist/artifacts/cloud-store` with HMAC-signed `/cloud/local` URLs (S7 dropped the `/api` prefix). `POST /runs` can return presigned `uploads[]`; `POST /runs/:id/commit` starts the run. `/artifacts` is not statically served.

**Queue (M3):** `POST /runs` publishes `runs.requested`; `@zero/orchestrator` consumes it (`ZERO_ORCH_CONCURRENCY`, default 2). Standalone: `npm run orchestrator`. SSE: `GET /runs/:id/stream`.

**Execution farm (M4):** Orchestrator publishes `execution.requested` and waits for `execution.completed`. Worker: `@zero/executor` / `npm run execution`. Caps: `ZERO_EXEC_CONCURRENCY`, `ZERO_EXEC_ATTEMPTS`. The API never subscribes to execution. `npm start` is API-only; `npm run start:all` co-locates workers for local dev.

**Auth + ACL (M5):** Verified `x-api-key` (`ZERO_API_KEYS` / `ZERO_DEV_API_KEY`) or Bearer JWT. `X-User-Email` is not identity. Runs are tenant-scoped. `ZERO_AUTH=on` (forced in production). Recording CORS is an explicit origin allowlist. Production boot fails without `KEY_ENC_SECRET`.

**LLM (M6):** `@zero/orchestrator/llm` calls OpenAI / Claude / Gemini from BA, Manual, Automation, and Manager when a decrypted key exists. Templates always remain the base. Caps: `ZERO_LLM_RPM`, `ZERO_LLM_MAX_USD_PER_RUN`. `ZERO_LLM=off` forces templates.

**Multi-cloud (M7):** `ZERO_CLOUD=local|aws|gcp`. AWS = S3/SQS/Secrets Manager/Redis; GCP = GCS/Pub/Sub/Secret Manager/Redis. Vendor SDKs only under `@zero/cloud` (`packages/cloud/`). IaC in `infra/aws` and `infra/gcp`. CI: `.github/workflows/ci.yml`.

Passwords from UI are runtime-only (`runSecrets`); not persisted in artifacts or DB.

## Key APIs

S7 dropped the `/api` prefix — the API service (`http://localhost:3001`) owns route paths natively.

- `POST /runs` — multipart start (`tcFile`, `recordingFile`) or JSON with `uploads: ["tcFile"]` → presigned PUTs
- `POST /runs/:id/commit` — after presigned uploads, start the pipeline
- `GET /runs`, `GET /runs/:id`, `GET /runs/:id/stream` (SSE), `POST /runs/:id/stop`, `POST /runs/:id/rerun-failed`
- `GET /runs/:id/assets`, `GET /runs/:id/files/:name`, `GET /runs/:id/download` (`?format=json&url=1` for a signed URL; PDF takes `?theme=<data-theme id>` — the UI sends the operator's palette — and `?paper=light` to keep a dark theme's accents on white)
- `GET|PUT /cloud/local` — fulfill local signed URLs
- `POST /element-log`, `GET /locators?host=...`
- Provider / agent settings: `/provider-keys`, `/agent-settings` (drive BA/Manual/Automation/Manager via `@zero/orchestrator/llm`; template fallback if no key)
- Recording: `/recordings/*`, `/record`, `/recorder.js`
- CMS Stream captures: `/capture-cms-screenshot`, `/capture-cms-signal-bulk` → `dist/artifacts/cms-captures/`
- Health / docs: `/health`, `/health/detailed`, `/api-docs` (Swagger UI — name, not a prefix)

## Conventions for agents

- **Quality bar (mandatory):** before writing code, read the matching pro skill (`react-pro` for `web/`, `javascript` + `nodejs-backend-patterns` for Node, `playwright-best-practices` for the executor, `python-pro` for `support/ml-training/`). Cursor rules in `.cursor/rules/` (`quality-bar.mdc`, `web-react.mdc`, `node-javascript.mdc`) apply the same bar. Prefer a correct small change over a clever one. Do not disable hook/lint rules to make code compile.
- **Stack**: CommonJS Node on server (`require`); ESM React in `web/` (`"type": "module"`).
- **UI changes**: edit `web/src/**`, then `npm run build` so `dist/web/` updates. Do not treat `dist/web/assets` as source.
- **Styles**: SCSS (dart-sass via Vite). Each component keeps a sibling `.scss`; shared partials live in `web/src/styles/` — `_tokens.scss` (radius/type/space), `_themes.scss` (the `$themes` map that emits every `[data-theme]` palette), `_base.scss`, `_breakpoints.scss` (`bp.below($width)`), `_glass.scss` (frosted chrome for any palette that declares a `glass-blur` token). Theming stays on CSS custom properties because `ThemePicker` swaps `data-theme` at runtime; Sass variables would compile away.
- **Brand + themes**: `web/` is the source of truth (`src/components/zeroBrandArt.js` traced logo paths, `src/styles/_themes.scss` palettes, `src/lib/themes.js` theme list). After editing any of those run `npm run brand:generate` so `@zero/brand` — the CommonJS mirror the API uses to render the themed PDF report — stays in sync. Logo masters and the tracer live in `support/brand/`.
- **Server changes**: HTTP routes live in `services/api/src/routes/`; DAG walk is `@zero/orchestrator` `processRun`. Chromium runs in `@zero/executor` (`services/executor/`). Compose splits that into its own image; locally use `npm run start:all` (or separate `npm run orchestrator` / `npm run execution`) when you need workers. Shared code is `@zero/*` packages.
- **Output roots**: regenerable files under `dist/` via `@zero/domain` `outputRoots` (`web`, `artifacts`, `coverage`, `logs`). Override with `ZERO_DIST_ROOT`.
- **Locators**: merge order is profile → memory → DB (`@zero/locators`). Normalize element keys via `packages/locators/elementLogger.js`.
- **Secrets**: never commit `.env`; use `.env.example`. Do not log or persist login passwords.
- **Scope**: keep changes focused; avoid drive-by refactors across services unless asked. Services never import sibling `services/*`.
- **Docs**: prefer updating `README.md` / this file only when behavior or run instructions change.

## Input rules (product)

- **Target URL** required (any public site — OTT, SaaS, marketplace, corporate, etc.).
- **Guided mode:** at least one of Figma link, uploaded TC file (`.txt`/`.md`/`.csv`/`.json`; also `.xlsx`/`.xls`), or BA notes.
- **Autonomous mode:** URL only (optionally with BA notes) — Web Analyzer runs whenever no TC file is uploaded; Q1–Q4 pipeline (crawl → cases → flows → optional domain inference) applies automatically.
- Optional: forced channel profile, runtime login credentials, headed browser.

## ML training (optional)

`support/ml-training/` trains separate approve/reject models per agent (`ba`, `manual_qa`, `automation_qa`, `manager`). Not required to run the web app. See `support/ml-training/README.md`.

## Agent skills (this repo)

Project skills live under `.cursor/skills/` (and mirrored in `.agents/skills/`).

Each workspace has **three names** (not three repos): **Folder** (`services/api/`) · **npm package** (`@zero/api`) · **Cursor skill** (`/zero-api`). Roster: `support/agent-workflow/prompts/repos/README.md`.

| Cursor skill | Workspace | Folder | npm package |
|--------------|-----------|--------|-------------|
| `/zero-web` | Web UI | `web/` | `@zero/web` |
| `/zero-api` | HTTP API | `services/api/` | `@zero/api` |
| `/zero-orchestrator` | Orchestrator worker | `services/orchestrator/` | `@zero/orchestrator` |
| `/zero-executor` | Playwright executor | `services/executor/` | `@zero/executor` |
| `/zero-cloud` | Cloud adapters | `packages/cloud/` | `@zero/cloud` |
| `/zero-domain` | Domain contracts | `packages/domain/` | `@zero/domain` |
| `/zero-db` | Postgres helpers | `packages/db/` | `@zero/db` |
| `/zero-locators` | Locator registry | `packages/locators/` | `@zero/locators` |
| `/zero-builders` | Script builders | `packages/builders/` | `@zero/builders` |
| `/zero-analyzer` | URL analyzer | `packages/analyzer/` | `@zero/analyzer` |
| `/zero-target-arch` | Packaging track S3–S6 (not one workspace) | `support/agent-workflow/` | — |

| Skill | Use for |
|-------|---------|
| `init` | Install stack-matched pro skills into `.cursor/skills` + `.agents/skills` |
| `zero-target-arch` | Verify packaging S0–S7 and product Q1–Q4 (done), **advance Q5**, or implement **U1–U3** (operator UI/UX + RTK store) via `support/agent-workflow/` |
| `zero-web` / `zero-api` / `zero-orchestrator` / `zero-executor` | Code one deployable (Web UI · HTTP API · Orchestrator worker · Playwright executor) |
| `zero-cloud` / `zero-domain` / `zero-db` / `zero-locators` / `zero-builders` / `zero-analyzer` | Code one shared package |
| `zero-architecture` | Zero-specific architecture explain / HTML publish |
| `zero-diagrams` | Mermaid / ASCII / flow diagrams for Zero |
| `architecture` | Generic layered HTML architecture diagrams |
| `sf-diagram-mermaid` | Mermaid (Salesforce-oriented; prefer `zero-diagrams` here) |
| `uml` / `graphviz` / `network` | UML, Graphviz, network diagrams |
| `javascript` / `react` / `react-pro` / `python-pro` | Stack pro skills (via `/init`). **Required** when coding that stack — not optional flavor. |
| `xlsx` / `pdf` / `build-check` / `simplify` / `dark-mode` / `design-foundations` | Tooling/UI pro skills (via `/init`) |

Always-on quality: `.cursor/rules/quality-bar.mdc`. Path-scoped: `web-react.mdc`, `node-javascript.mdc`.

Invoke with `/init` to sync pro skills, `/zero-target-arch` to advance the Production Blueprint, a `/zero-*` repo skill to change one workspace, `/zero-architecture` or `/zero-diagrams` for architecture/diagrams, or ask in chat. Prompts live in `support/agent-workflow/prompts/repos/`.

### Target architecture agent workflow

Autonomous path from runtime-today → Target architecture (`dist/web/architectureV2.html` after build, source in `web/public/`):

- Project: `support/agent-workflow/` (capability M1–M7 done; packaging S0–S7 done; product Q1–Q4 done; `progress.json` `current: "Q5"` — trustworthy site understanding, spec `milestones/Q5-domain-subdomain.md`; **U1–U3** operator UI/UX and RTK Query store done, specs `milestones/U1-professional-ui-ux.md`, `milestones/U2-low-friction-canvas.md`, `milestones/U3-redux-store.md`)
- Status: `npm run workflow:status` · Verify: `npm run workflow:verify -- --milestone Q5` (or any M/S/Q/U id)
- Docker instance: `http://localhost:5175/status` (compose service `workflow`, repo mounted at `/repo`)
- Cloud contracts: `@zero/cloud` (`ZERO_CLOUD=local` by default)

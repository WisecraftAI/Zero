# AGENTS.md — ZER0 (ai-qa-orchestrator)

Architect-level QA orchestration UI: optional Web Analyzer → BA → Manual QA → Automation QA → Playwright execution → optional a11y/perf/security → Manager/Delivery reports. Generates reusable Playwright + Java/Selenium scripts from OTT URLs, Figma/notes, and uploaded test cases. BA / Manual / Automation / Manager call Claude, OpenAI, or Gemini when a decrypted provider key exists (`lib/llm`); otherwise they stay on templates.

## Quick start

```bash
# optional: copy .env.example to .env and set Postgres/secrets
cp .env.example .env

npm install
npx playwright install chromium
# build the Vite client → public/
npm run build
# start Express (default PORT=3000)
npm start
```

> Run each line separately. If you paste with inline `# ...` comments, zsh may treat `#` as a literal arg (INTERACTIVE_COMMENTS is off by default) and break `vite build`. Enable once with `setopt interactive_comments` if you want inline comments to be safe.

- UI: `http://localhost:3000` (or next free port logged at startup)
- Dev UI: `npm run client` (Vite `:5173`, proxies `/api` to `:3000`)
- Health: `GET /health`

### Docker (V3 S0 — monolith + Postgres/Redis/MinIO)

No code moves. One image for today's `server.js` + Playwright; infra sidecars for M1+.

```bash
docker compose up --build
# UI/API     http://localhost:3000/health
# Docs       http://localhost:5174
# Workflow   http://localhost:5175/status   (probes the bind-mounted repo)
# MinIO      http://localhost:9001  (zerominio / zerominio123)

# Hybrid — infra in Docker, app on host:
docker compose up -d postgres redis minio
# then set DATABASE_URL=postgres://zero:zero@localhost:5432/zero and npm start

# Docs or workflow only:
docker compose up --build docs
docker compose up --build workflow
```

## Layout

| Path | Role |
|------|------|
| `server.js` | Express app, pipeline agents, Playwright execution, APIs (~5k lines; core logic lives here) |
| `lib/` | urlAnalyzer(Pro), DB helpers, locators, Playwright/Java builders, encryption, middleware |
| `client/` | React 18 + Vite SPA (`src/views`, `src/components`, `src/layouts`) |
| `public/` | Built static UI (do not hand-edit; rebuild from `client/`). Arch page: also `client/public/architecture.html` |
| `artifacts/` | Runtime `run.json` / screenshots / CMS captures (gitignored) |
| `docs/` | Lead briefing (`DEVELOPER_GUIDE.md`), architecture, OSS inventory (`OPEN_SOURCE.md`) |
| `zero-docs/` | Standalone architecture docs site (React 19 + Vite 6 + TS strict + SCSS Modules + Vitest). Host: `:5174`. Docker: `docs` service (`zero-docs/Dockerfile` → nginx). See `zero-docs/README.md`. |
| `agent-workflow/` | Target-arch milestones M1–M7 + detect/verify scripts. Docker: `workflow` service on `:5175` bind-mounts the repo so probes read live `server.js` / `lib/`. |
| `ml-training/` | Optional Python per-agent quality models (separate from Node runtime) |
| `scripts/set-database.js` | DB helper (`npm run set-db`) |

## Pipeline stages

Order in `stageKeys`: optional `webAnalyzer` → `ba` → `manualQa` → `automationQa` → `execution` → optional `accessibility`/`performance`/`security` → `manager` → `delivery`.

1. **Web Analyzer** — when no TC file and notes are short; Playwright crawl (`lib/urlAnalyzerPro.js`)
2. **BA** — template consolidation of OTT URL + optional Figma / uploaded TCs / notes / analyzer insights
3. **Manual QA** — cases from CSV, UI rows, URL analysis, or channel templates
4. **Automation QA** — locator candidates: profile + in-memory learned (+ Postgres when DB enabled)
5. **Execution** — Playwright with retries + screenshots under `artifacts/`
6. **Optional** — accessibility / performance / security Playwright passes
7. **Manager / Delivery** — executive review + stakeholder delivery report

Channel profiles (in `server.js` `appProfiles`): Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic.

## Execution modes (important)

- **Default (`minimal`)**: CSV TCs mostly load URL + wait for body — pipeline completes reliably; reports + Java scripts still generated.
- **`EXECUTION_MODE=full`**: keyword/selector navigation — brittle on real sites; use only when tuning selectors.
- **`RUN_HEADED=true`** or UI “Show browser”: visible Chromium for validation.
- CSV upload forces `uploaded_tc_only` execution derived from uploaded cases.

Prefer ZERO for: CSV → requirements → TCs → Java scripts → Manager report. Run real E2E in an external Java/Playwright project using exported scripts.

## Persistence

**Today:** runs live in an in-memory `Map`, are written to `artifacts/<runId>/run.json`, and — when `DATABASE_URL` or `PGHOST` is set — are upserted to Postgres (`qa_runs` / `qa_assets` plus locator/project/provider tables via `lib/db.js` `initAllTables`). If Postgres is unset or unreachable, the process falls back to memory + file.

**Object store (M2):** `ZERO_CLOUD=local` stores blobs under `artifacts/cloud-store` with HMAC-signed `/api/cloud/local` URLs. `POST /api/runs` can return presigned `uploads[]`; `POST /api/runs/:id/commit` starts the run. `/artifacts` is not statically served.

**Queue (M3):** `POST /api/runs` publishes `runs.requested`; `lib/orchestrator` consumes it in-process (`ZERO_ORCH_CONCURRENCY`, default 2). Standalone: `npm run orchestrator`. SSE: `GET /api/runs/:id/stream`.

**Execution farm (M4):** Orchestrator publishes `execution.requested` and waits for `execution.completed`. Worker: `lib/execution/worker.js` / `npm run execution`. Caps: `ZERO_EXEC_CONCURRENCY`, `ZERO_EXEC_ATTEMPTS`. `API_ONLY=1` never subscribes to execution.

**Auth + ACL (M5):** Verified `x-api-key` (`ZERO_API_KEYS` / `ZERO_DEV_API_KEY`) or Bearer JWT. `X-User-Email` is not identity. Runs are tenant-scoped. `ZERO_AUTH=on` (forced in production). Recording CORS is an explicit origin allowlist. Production boot fails without `KEY_ENC_SECRET`.

**LLM (M6):** `lib/llm` calls OpenAI / Claude / Gemini from BA, Manual, Automation, and Manager when a decrypted key exists. Templates always remain the base. Caps: `ZERO_LLM_RPM`, `ZERO_LLM_MAX_USD_PER_RUN`. `ZERO_LLM=off` forces templates.

**Multi-cloud (M7):** `ZERO_CLOUD=local|aws|gcp`. AWS = S3/SQS/Secrets Manager/Redis; GCP = GCS/Pub/Sub/Secret Manager/Redis. Vendor SDKs only under `lib/cloud/**`. IaC in `infra/aws` and `infra/gcp`. CI: `.github/workflows/ci.yml`.

Passwords from UI are runtime-only (`runSecrets`); not persisted in artifacts or DB.

## Key APIs

- `POST /api/runs` — multipart start (`tcFile`, `recordingFile`) or JSON with `uploads: ["tcFile"]` → presigned PUTs
- `POST /api/runs/:id/commit` — after presigned uploads, start the pipeline
- `GET /api/runs`, `GET /api/runs/:id`, `GET /api/runs/:id/stream` (SSE), `POST /api/runs/:id/rerun-failed`
- `GET /api/runs/:id/assets`, `GET /api/runs/:id/files/:name`, `GET /api/runs/:id/download` (`?format=json&url=1` for a signed URL)
- `GET|PUT /api/cloud/local` — fulfill local signed URLs
- `POST /api/element-log`, `GET /api/locators?host=...`
- Provider / agent settings: `/api/provider-keys`, `/api/agent-settings` (drive BA/Manual/Automation/Manager via `lib/llm`; template fallback if no key)
- Recording: `/api/recordings/*`, `/record`, `/recorder.js`
- CMS Stream captures: `/api/capture-cms-screenshot`, `/api/capture-cms-signal-bulk` → `artifacts/cms-captures/`
- Health / docs: `/health`, `/api/health/detailed`, `/api-docs`

## Conventions for agents

- **Stack**: CommonJS Node on server (`require`); ESM React in `client/` (`"type": "module"`).
- **UI changes**: edit `client/src/**`, then `npm run build` so `public/` updates. Do not treat `public/assets` as source.
- **Server changes**: most agent/execution behavior is in `server.js`; extract to `lib/` only when matching existing module boundaries (`scriptBuilder`, `javaSeleniumBuilder`, `locatorRegistry`, `elementLogger`, `db`).
- **Locators**: merge order is profile → memory → DB (`lib/locatorRegistry.js`). Normalize element keys via `lib/elementLogger.js`.
- **Secrets**: never commit `.env`; use `.env.example`. Do not log or persist login passwords.
- **Scope**: keep changes focused; avoid drive-by refactors of the monolithic `server.js` unless asked.
- **Docs**: prefer updating `README.md` / this file only when behavior or run instructions change.

## Input rules (product)

- OTT URL required.
- At least one of: Figma link, uploaded TC file (`.txt`/`.md`/`.csv`/`.json`; also `.xlsx`/`.xls`), or BA notes.
- Optional: forced channel profile, runtime login credentials, headed browser.

## ML training (optional)

`ml-training/` trains separate approve/reject models per agent (`ba`, `manual_qa`, `automation_qa`, `manager`). Not required to run the web app. See `ml-training/README.md`.

## Agent skills (this repo)

Project skills live under `.cursor/skills/` (and mirrored in `.agents/skills/`):

| Skill | Use for |
|-------|---------|
| `init` | Install stack-matched pro skills into `.cursor/skills` + `.agents/skills` |
| `zero-target-arch` | **Implement** Target architecture (architectureV2 M1–M7) via `agent-workflow/` |
| `zero-architecture` | Zero-specific architecture explain / HTML publish |
| `zero-diagrams` | Mermaid / ASCII / flow diagrams for Zero |
| `architecture` | Generic layered HTML architecture diagrams |
| `sf-diagram-mermaid` | Mermaid (Salesforce-oriented; prefer `zero-diagrams` here) |
| `uml` / `graphviz` / `network` | UML, Graphviz, network diagrams |
| `javascript` / `react` / `python-pro` | Stack pro skills (via `/init`) |
| `xlsx` / `pdf` / `build-check` / `simplify` / `dark-mode` / `design-foundations` | Tooling/UI pro skills (via `/init`) |

Invoke with `/init` to sync pro skills, `/zero-target-arch` to advance the Production Blueprint, `/zero-architecture` or `/zero-diagrams` for architecture/diagrams, or ask in chat.

### Target architecture agent workflow

Autonomous path from runtime-today → Target architecture (`public/architectureV2.html`):

- Project: `agent-workflow/` (milestones M1–M7, agents, `progress.json`)
- Status: `npm run workflow:status` · Verify: `npm run workflow:verify`
- Docker instance: `http://localhost:5175/status` (compose service `workflow`, repo mounted at `/repo`)
- Cloud contracts: `lib/cloud/*` (`ZERO_CLOUD=local` by default)

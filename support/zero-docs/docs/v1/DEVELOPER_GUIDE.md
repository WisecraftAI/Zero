# ZER0 Developer Guide

> **New hire on a new PC?** Start at [§2 Day-0 setup](#2-day-0-setup-new-pc--every-engineer), then skim [§10 Sample local exercise](#10-sample-local-exercise-first-30-minutes). Everyone else: read this briefing first, then `support/zero-docs/docs/v2/ARCHITECTURE.md` for production gaps, then touch code.

**Repo count:** **1 Git repository** — [Wisecarft/Zero](https://github.com/Wisecarft/Zero.git)  
**Packages inside that one repo:** **npm workspaces** (`services/*`, `packages/*`, `web`) + **1 optional Python folder** (not separate Git remotes)

| Unit | Path | Kind | Role |
|------|------|------|------|
| Git remote `origin` | `https://github.com/Wisecarft/Zero.git` | **1 repo** | Entire product |
| `zero` (root) | `/package.json` | npm workspaces root | Scripts · shared tooling |
| `@zero/api` | `/services/api/` | npm (CommonJS) | HTTP intake · Express |
| `@zero/orchestrator` | `/services/orchestrator/` | npm (CommonJS) | DAG worker · LLM |
| `@zero/executor` | `/services/executor/` | npm (CommonJS) | Playwright jobs |
| `@zero/web` | `/web/` | npm (ESM) | React 18 + Vite SPA |
| `@zero/{cloud,db,domain,locators,builders,analyzer}` | `/packages/*` | npm (CommonJS) | Shared libs |
| ML training | `/support/ml-training/` | Python (stdlib only) | Optional agent quality models |

There is **no multi-repo split**. Sibling folders under `~/Product/code/` (aha, canelatv-web-ui, etc.) are **other products**, not part of Zero’s Git remote.

---

## 0. What you are building (elevator)

**ZER0 is an AI QA orchestration platform.** Two primary input modes:

| Mode | Input | What runs |
|------|-------|-----------|
| **Autonomous (URL-only)** | Public URL, no TC file (BA notes optional) | Multi-page crawl → optional domain inference → major functional cases → `discovered_flows` execution |
| **Guided** | URL + Figma / uploaded TCs / BA notes | Same agent chain; Web Analyzer runs unless a TC file is uploaded; CSV runs use `minimal` execution |

Agent chain:

| Agent | Role | LLM when key exists |
|-------|------|---------------------|
| **Web Analyzer** | Multi-page Playwright crawl (`crawlLinkedPages`); page structure + flows + `crawledPages` | — (deterministic crawl) |
| **Domain inference** | One structured LLM call when rule-based type confidence is low | OpenAI · Claude · Gemini |
| **BA** | Requirements consolidation (URL + optional inputs + analyzer insights) | OpenAI · Claude · Gemini |
| **Manual QA** | App-specific manual test cases (`majorFunctionalCases` or CSV/templates) | OpenAI · Claude · Gemini |
| **Automation QA** | Locator merge + Playwright / Java script text | OpenAI · Claude · Gemini |
| **Execution** | Playwright — `discovered_flows` (URL-only auto) or `minimal`/`full` | — (browser worker) |
| **Manager / Delivery** | Executive review + stakeholder report | OpenAI · Claude · Gemini |

Templates run first so the pipeline **always completes**; `@zero/orchestrator/llm` enriches each LLM-capable stage when a decrypted provider key exists. Outputs:

1. Requirements consolidation  
2. Manual test cases  
3. Playwright + Java/Selenium script text  
4. Execution evidence (screenshots under `dist/artifacts/`)  
5. Manager + Delivery reports (PDF/JSON download — PDF headline is the automated `releaseGate`, not the Manager Go/Hold label)

**Product truth your team must internalize:** CSV/default execution is **minimal** (load URL + wait for body). URL-only auto runs use **`discovered_flows`** (multi-step checks on top critical flows). Neither replaces full production E2E in your own CI — export Java/Playwright for that.

---

## 1. Who owns what (team map)

| Role | Own these paths | Do not casually rewrite |
|------|-----------------|-------------------------|
| Backend / API | `services/api/` | Drive-by refactors across all services |
| Orchestrator / pipeline | `services/orchestrator/` | Entire agent logic dump into new frameworks |
| Execution | `services/executor/` | Shipping Chromium into the API image |
| Shared libs | `packages/*` (`@zero/*`) | Path-coupled `require` across services |
| Frontend | `web/src/**` then `npm run build` | Hand-editing `dist/web/assets` |
| Persistence / IDE vision | `packages/db`, `support/zero-docs/docs/v2/ARCHITECTURE.md` target APIs | Assuming every Map is multi-instance safe |
| ML (optional) | `support/ml-training/` | Wiring into Node without a clear contract |
| Docs / agents | `README.md`, `AGENTS.md`, `support/zero-docs/docs/*`, `.cursor/skills/` | Inventing shipped features that are stubs |

**AI agents:** follow `AGENTS.md`. Prefer `/zero-architecture` and `/zero-diagrams` for Zero-specific design. Run `/init` if pro skills are missing.

---

## 2. Day-0 setup (new PC / every engineer)

End-to-end path for a fresh machine. Pick **one** run mode in [§2.4](#24-how-to-run-pick-one); you do not need all three.

### 2.1 Prerequisites

| Tool | Why | Notes |
|------|-----|--------|
| **Git** | Clone the repo | Any recent Git is fine |
| **Node.js 20+** | Runtime for API, workers, Vite | Images use **Node 20** (`node:20-bookworm`). Docs site pins `engines.node >= 20.11.0`. Root `package.json` does not declare `engines` yet — treat **20.x LTS** as the team default |
| **npm** | Workspaces install | Ships with Node |
| **Docker Desktop** (or Docker Engine + Compose v2) | Full stack / Postgres / Redis | Required for Compose; optional if you stay memory-only with `npm run start:all` |
| **Playwright Chromium** | Local executor + Web Analyzer on host | `npx playwright install chromium` after `npm install` (Compose executor image already has browsers) |

Optional but useful:

- **Postgres + Redis** — via Compose (`docker compose up -d postgres redis`) or your own installs; not required for a first smoke run
- A free **Gemini** (or OpenAI / Anthropic) key later — pipeline works on templates without keys

Check versions:

```bash
node -v    # expect v20.x
npm -v
git --version
docker compose version   # if using Docker
```

### 2.2 Clone + install

```bash
git clone https://github.com/Wisecarft/Zero.git
cd Zero
cp .env.example .env
npm install
npx playwright install chromium
```

Run each command on its **own line** (see [zsh gotcha](#zsh-gotcha) below).

### 2.3 Configure `.env`

Copying `.env.example` → `.env` is enough to boot. All variables are optional for local memory mode.

Common edits on a new PC:

| Variable | When to set |
|----------|-------------|
| `PORT=3001` | Default API port (already in example) |
| `ZERO_CLOUD=local` | Default; keep unless you are drilling AWS/GCP adapters |
| `ZERO_PUBLIC_BASE_URL=http://localhost:3001` | Signed URL origin for local cloud adapter |
| `DATABASE_URL=postgres://zero:zero@localhost:5432/zero` | Hybrid / Compose Postgres (matches `docker-compose.yml`) |
| `REDIS_URL=redis://localhost:6379` | When Redis is up (queue / SSE pub-sub) |
| `VITE_API_BASE_URL=http://localhost:3001` | Bake into the SPA at **build** time if the API is not on `:3001` |
| `ZERO_LLM=off` | Force templates only (demos / no keys) |
| `KEY_ENC_SECRET` / `ZERO_AUTH=on` | Only when testing auth; local UI stays open by default |

Honest persistence note: when `DATABASE_URL` or `PGHOST` is set and reachable, Postgres activates via `@zero/db`. If unset or unreachable, runs still work via in-memory `Map` + `dist/artifacts/<runId>/run.json`. Schema / ER: [DATABASE.md](./DATABASE.md). Never commit `.env`.

### 2.4 How to run (pick one)

#### Option A — Docker full stack (closest to production shape)

```bash
docker compose up --build
```

| URL | What |
|-----|------|
| http://localhost:3000 | Web UI (`zero-web`, nginx) |
| http://localhost:3000/health | Web nginx liveness |
| http://localhost:3001/health | API (`zero-api`) |
| http://localhost:5174 | Docs site |
| http://localhost:5175/status | Agent-workflow status |

Operator detail: [DOCKER.md](./DOCKER.md). Port conflicts: `WEB_PORT=3080 API_PORT=3081 POSTGRES_PORT=15432 REDIS_PORT=16379 docker compose up --build`.

#### Option B — Hybrid (infra in Docker, app on host)

Best when you want hot-reload on the host but real Postgres/Redis:

```bash
docker compose up -d postgres redis
# in .env (or export):
# DATABASE_URL=postgres://zero:zero@localhost:5432/zero
# REDIS_URL=redis://localhost:6379
npm install
npx playwright install chromium
npm run build
npm run start:all
```

If host `:5432` is taken: `POSTGRES_PORT=15432 docker compose up -d postgres` and point `DATABASE_URL` at `localhost:15432`.

#### Option C — Local all-in-one (no Docker required)

API + orchestrator + executor in one process tree (`scripts/local-stack.js`). Redis not required for a basic run:

```bash
npm run build                 # Vite web/ → dist/web/
npm run start:all             # API :3001 + workers
```

API-only (no pipeline workers — runs will not progress past intake):

```bash
npm start                     # services/api/server.js only → :3001
```

**Dev UI (hot reload):** keep workers on `:3001`, then in another terminal:

```bash
npm run client                # Vite :5173; fetches use VITE_API_BASE_URL (default http://localhost:3001)
```

Under Compose the SPA is nginx on `:3000`; under Option C without a separate nginx, use Vite `:5173` (or serve `dist/web/` however you prefer). The API never shares the SPA port after S7.

### 2.5 Verify the stack

```bash
curl -s http://localhost:3001/health
curl -s http://localhost:3000/health    # Compose web only
curl -s http://localhost:3001/health/detailed
```

Also open:

- **UI** — http://localhost:3000 (Compose) or http://localhost:5173 (`npm run client`)
- **Swagger** — http://localhost:3001/api-docs
- **Docs** — http://localhost:5174 (Compose `docs` service, or `cd support/zero-docs && npm install && npm run dev`)
- **Smoke tests** — from repo root: `npm test` (health + one pipeline start; Postgres persist when reachable)

You are green when `/health` returns OK and the New Run form loads.

### 2.6 First tasks (where to look)

| Goal | Start here |
|------|------------|
| Change the UI | `web/src/**` → `npm run build` or `npm run client` |
| HTTP routes / auth / SSE | `services/api/src/routes/` |
| Pipeline / agents / LLM | `services/orchestrator/` (`processRun`, stage agents) |
| Playwright jobs | `services/executor/` |
| Shared contracts / stages | `packages/domain` |
| Crawl / URL analysis | `packages/analyzer` |
| Locators / script text | `packages/locators`, `packages/builders` |
| Agent coding contract | root [`AGENTS.md`](../../../../AGENTS.md) |
| Sample CSV inputs | `support/samples/` |

Cursor skills: `/zero-web`, `/zero-api`, `/zero-orchestrator`, `/zero-executor`, and package skills under `.agents/skills/`. Run `/init` if pro skills are missing.

### zsh gotcha

Run install/build/start as **separate lines**. Pasting `# comments` on the same line can break Vite if `INTERACTIVE_COMMENTS` is off. Fix: `setopt interactive_comments`.

### Troubleshooting (basics)

| Symptom | Likely fix |
|---------|------------|
| UI blank / missing assets | Run `npm run build` from repo root so `dist/web/` exists |
| `Could not resolve entry module "#/index.html"` | zsh ate a `#` comment — rerun build on its own line |
| Health OK but runs stuck | You used `npm start` (API only) — use `npm run start:all` or Compose so orchestrator + executor run |
| Port already in use | Override `PORT` / Compose `*_PORT` env vars (see `.env.example`) |
| Postgres connection errors | Unset `DATABASE_URL` for memory mode, or start Compose postgres and match the URL |
| Playwright / browser missing on host | `npx playwright install chromium` |
| CORS / API fetch from Vite | Confirm `VITE_API_BASE_URL` points at `http://localhost:3001` and rebuild if you changed it |
| Auth failures after flipping `ZERO_AUTH=on` | Need `ZERO_API_KEYS` or JWT + `KEY_ENC_SECRET` — leave auth off for local day-0 |

More Docker-specific notes: [DOCKER.md](./DOCKER.md).

---

## 3. Mental model (one diagram)

```
┌─────────────────────┐     multipart      ┌──────────────────────────────┐
│  React SPA          │  POST /runs        │  @zero/api                   │
│  web/src → build    │ ─────────────────▶ │  services/api/server.js          │
│  zero-web  :3000    │  poll GET /runs/:id │  zero-api  :3001             │
└─────────────────────┘                    └───────────┬──────────────────┘
                                                       │ runs.requested
                       ┌───────────────────────────────┼──────────────────┐
                       ▼                               ▼                  ▼
                 packages/*                     @zero/orchestrator   @zero/executor
                 (builders, locators,           processRun / LLM     Chromium jobs
                  analyzer, domain, db,         DAG walk             dist/artifacts/
                  cloud)                                             screenshots
```

**Pipeline order** (`stageKeys` in `@zero/domain`):

`webAnalyzer?` → `ba` → `manualQa` → `automationQa` → `execution` → `accessibility?` / `performance?` / `security?` → `manager` → `delivery`

| Stage | What it actually does today |
|-------|-----------------------------|
| `webAnalyzer` | Whenever no TC file is uploaded (BA notes do not skip it) — multi-page Playwright crawl via `@zero/analyzer` (`crawlLinkedPages`, `ZERO_ANALYZER_MAX_PAGES`) |
| `domainInference` | After Web Analyzer, before BA — one LLM call when `websiteTypeConfidence < 0.5` or type is `GENERIC` |
| `ba` | Template consolidation (`consolidateRequirements`); optional LLM enrich |
| `manualQa` | Cases from CSV / UI rows / `majorFunctionalCases` / channel templates |
| `automationQa` | Merge locators → Playwright + Java text (`@zero/builders`) |
| `execution` | Playwright in `@zero/executor`; **`discovered_flows`** for URL-only auto, **`minimal`** for CSV |
| optional a11y/perf/security | Extra Playwright / heuristic passes |
| `manager` / `delivery` | Deterministic reports from prior artifacts; optional LLM narrative |

Channel profiles: Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic (+ SAAS, MARKETPLACE, ECOMMERCE rule types in `@zero/analyzer`).

---

## 4. Repository layout (where to look)

```
Zero/
├── package.json           # workspaces root · start · start:all · build · test
├── services/
│   ├── api/               # @zero/api — Express composition root + src/routes/
│   ├── orchestrator/      # @zero/orchestrator — processRun, pipeline, llm/
│   └── executor/          # @zero/executor — Playwright worker + jobs
├── packages/
│   ├── cloud/             # @zero/cloud — lib/provider + local/aws/gcp/azure/vercel adapters
│   ├── db/                # @zero/db — lib/{schema,runs,runStore,…} (ER: docs/v1/DATABASE.md)
│   ├── domain/            # @zero/domain — lib/{stages,profiles,outputRoots,execution}
│   ├── locators/          # @zero/locators — lib/{merge,elements,ecommerce,shared}
│   ├── builders/          # @zero/builders — lib/{playwright,selenium,shared}
│   └── analyzer/          # @zero/analyzer — light/pro facades + lib/{strategies,crawl,flows,…}
├── web/                   # @zero/web — React 18 + Vite SPA (source of truth for UI)
│   ├── src/views/         # Dashboard, Runs, NewRun, Detail, Locators, Keys, Agents, …
│   ├── src/components/    # RunForm, Pipeline*, Sidebar, CMS capture, …
│   ├── src/layouts/       # AppShell
│   └── public/architecture.html  # Survives Vite emptyOutDir → copied into dist/web/
├── dist/                  # Regenerable: web/, artifacts/, coverage/, logs/
├── support/agent-workflow/        # Target-arch milestones + probes
├── support/ml-training/           # Optional Python quality models
├── support/zero-docs/docs/  # V1 runtime + V2 target markdown; site at support/zero-docs/
├── AGENTS.md              # Contract for coding agents
├── README.md              # Operator quick start
└── .cursor/skills/        # Agent skills (mirrored in .agents/skills/)
```

---

## 5. What to do by change type

### A. UI change

1. Edit `web/src/**` only.  
2. `npm run build` from repo root (or use `npm run client` while developing).  
3. Confirm `dist/web/` updated.  
4. Architecture HTML: edit `web/public/architecture.html`, rebuild so it lands in `dist/web/`.

### B. Pipeline / agent behavior

1. Find the stage / DAG walk in `services/orchestrator/` (`processRun`, pipeline stages, report generators).  
2. HTTP intake / routes → `services/api/src/routes/`.  
3. Shared locator/script logic → `packages/`.  
4. Keep changes focused; services must not import sibling `services/*`.  
5. Update `AGENTS.md` / `README.md` only if run instructions or behavior change.

### C. Locators / script quality

Merge order (see `@zero/locators`):

1. Profile selectors (`appProfiles` in `@zero/domain`)  
2. In-memory learned selectors  
3. DB locators (when Postgres is configured)

Normalize keys via `packages/locators/elementLogger.js`. Element log API: `POST /element-log` (S7 dropped the `/api` prefix).

### D. Execution semantics

| Mode | When | Behavior |
|------|------|----------|
| `discovered_flows` | URL-only auto (no CSV, web analysis present) | Top 3–5 critical flows — multi-step Playwright with pass/fail + screenshots |
| `minimal` (default for CSV) | Uploaded TC or explicit default | Load URL, wait for body, screenshot — pipeline completes |
| `EXECUTION_MODE=full` | Selector tuning | Keyword/selector navigation — brittle |
| CSV upload | Auto | `uploaded_tc_only` derived from file |
| `RUN_HEADED=true` / UI checkbox | Human validation | Visible Chromium |

Env: `ZERO_ANALYZER_MAX_PAGES` (default 8) caps multi-page crawl depth.

**Team rule:** The PDF **release gate** (`>= 95%` Full pass, `85–94%` Conditional pass, `< 85%` Manual check) and the Manager “Go / Conditional Go / Hold” label are **orchestration confidence**, not full product E2E proof.

### E. Persistence / productionization

Read `support/zero-docs/docs/v2/ARCHITECTURE.md` § Production gaps. Current themes:

1. Multi-instance durability for Maps still in process memory  
2. Auth UI / hosted OIDC polish  
3. Ops maturity — observability, runbook, migrate CLI, `e2e/smoke.sh`  
4. Honest UI copy about `minimal` vs `discovered_flows` vs full E2E in external CI  

### F. LLM keys UI

`/provider-keys` and `/agent-settings` store encrypted keys / prompts. When a decrypted key exists, BA / Manual / Automation / Manager call providers through `@zero/orchestrator/llm`; otherwise they stay on templates.

---

## 6. API surface (contracts)

S7 dropped the `/api` prefix. All paths below are on the API service (`http://localhost:3001`).

| Area | Routes | Notes |
|------|--------|-------|
| Runs | `POST /runs` (multipart: `tcFile`, `recordingFile`), `GET /runs`, `GET /runs/:id`, `POST …/stop`, `POST …/rerun-failed`, `…/download`, `…/assets` | Core product path |
| Locators | `POST /element-log`, `GET /locators?host=` | Needs DB to persist across restarts |
| Recording | `/recordings/*`, `/record`, `/recorder.js` | In-memory sessions today |
| CMS | `/capture-cms-screenshot`, `/capture-cms-signal-bulk` | Gray Stream tab; separate from pipeline |
| Keys / agents | `/provider-keys`, `/agent-settings`, `/keys*` | Drive LLM enrich when keys exist |
| Ops | `/health`, `/health/detailed`, `/api-docs` | Swagger UI at `/api-docs` (name, not a prefix) |

**Input rules:** Target URL required. **Guided:** ≥1 of Figma / TC file (txt/md/csv/json/xlsx/xls) / BA notes. **Autonomous:** URL only (no TC file; notes optional) always runs Web Analyzer + Q1–Q4 pipeline.

Passwords from UI → `runSecrets` only (not written into artifacts). Never log them.

---

## 7. Definition of done (team bar)

A change is done when:

- [ ] Behavior matches the stage you intended (minimal vs full called out if execution-related)  
- [ ] UI changes rebuilt into `dist/web/`  
- [ ] No secrets in git (`.env`, passwords, provider keys)  
- [ ] Docs updated if user-facing run path or API contract changed  
- [ ] You did not invent “Postgres works” / “LLM agents run” unless the path is actually wired  
- [ ] Prefer a small PR: one concern (UI **or** pipeline **or** docs)

Suggested verification:

```bash
npm run lint          # if configured for your change
npm run build
npm run start:all     # smoke: open UI, start a minimal run with sample CSV
curl -s localhost:3001/health
```

---

## 8. Suggested workstreams (what to pick up next)

Capability M1–M7, packaging S0–S7, and product Q1–Q4 are **done**. Ordered like a lead would assign next:

1. **Ops maturity** — observability (`runId` / `traceId` on every log line), runbook + SLOs, `e2e/smoke.sh` against four Compose services.  
2. **Multi-instance durability** — recordings / selector memory off process Maps.  
3. **Product honesty** — Run Detail UI for `crawledPages`, flow step results, `inferredDomain`.  
4. **Auth UI / OIDC** — login screen when `ZERO_AUTH=on`.  
5. **Tests + CI** — expand hermetic API + Playwright smoke.  
6. **IDE vision** — `/projects`, recordings → SQL, stored Java scripts (see architecture target).

---

## 9. Doc map (read order)

| Doc | Audience | Purpose |
|-----|----------|---------|
| [README.md](../../../../README.md) | Operator | Run locally, modes, APIs |
| [AGENTS.md](../../../../AGENTS.md) | Coding agents | Conventions + pipeline facts |
| **This file** | Engineers + AI | New PC Day-0, ownership, DoD |
| [ARCHITECTURE.md](./ARCHITECTURE.md) (V1) | Leads / platform | Current runtime (what ships) |
| [../v2/ARCHITECTURE.md](../v2/ARCHITECTURE.md) (V2) | Leads / platform | Target vision + production gaps |
| [OPEN_SOURCE.md](./OPEN_SOURCE.md) | Legal / onboarding | License + dependency inventory |
| [ml-training/README.md](../../../ml-training/README.md) | ML | Optional Python models |
| `/architecture.html` · `/architectureV2.html` | Visual | Live HTML V1 / V2 |

---

## 10. Sample local exercise (first 30 minutes)

**Path A — autonomous URL-only:**

1. Start the stack (`build` + `npm run start:all`).  
2. Open UI → New Run.  
3. Paste a public URL (e.g. a SaaS landing page) — no TC file, no notes.  
4. Watch Web Analyzer → BA → Manual → Execution (`discovered_flows`) complete.  
5. Open run detail — inspect crawl artifact, test cases, flow results, Manager report.

**Path B — guided CSV:**

1. Use a public URL + `support/samples/amazon_test_cases.csv` (or another sample CSV).  
2. Leave execution on default (`minimal`).  
3. Download JSON; skim generated Java from Automation tab.

Then skim `services/orchestrator/processRun.js`, `packages/analyzer/lib/crawl/multiPage.js`, and `packages/builders/lib/playwright/discoveredFlows.js`.

When you can explain **`discovered_flows` vs `minimal`** and **where agents really live**, you are onboarded.

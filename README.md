# ZER0 (Web)

Architect-level QA orchestration workflow in one UI.

**Repos:** 1 Git repository ([Wisecarft/Zero](https://github.com/Wisecarft/Zero.git)) · **npm workspaces** (`services/*`, `packages/*`, `web`) · **MIT** ([LICENSE](./LICENSE))

**New PC / onboarding:** open the [Developer guide](./support/zero-docs/docs/v1/DEVELOPER_GUIDE.md) (§2 Day-0) — prerequisites, clone, `.env`, Docker vs hybrid vs `npm run start:all`, verify, first tasks.

**Dev docs (humans + AI):** [Developer guide](./support/zero-docs/docs/v1/DEVELOPER_GUIDE.md) · [Architecture V1](./support/zero-docs/docs/v1/ARCHITECTURE.md) · [Docker](./support/zero-docs/docs/v1/DOCKER.md) · [Architecture V2](./support/zero-docs/docs/v2/ARCHITECTURE.md) · [Open source](./support/zero-docs/docs/v1/OPEN_SOURCE.md) · [Docs index](./support/zero-docs/docs/README.md) · [Docs site](./support/zero-docs/README.md)

Pipeline:

1. **Web Analyzer** (optional) — multi-page Playwright crawl when no TC file and notes are short; emits `crawledPages`, domain type, and user flows.
2. **Domain inference** (automatic) — one LLM call when rule-based type confidence is low (`< 0.5`) or `GENERIC`; skipped when no key or `ZERO_LLM=off`.
3. **BA Agent** builds requirements from URL + optional Figma / uploaded TCs / notes / analyzer insights.
4. **Manual QA Agent** creates app-oriented test cases — from CSV, URL analysis (`majorFunctionalCases`), or channel templates.
5. **Automation QA Agent** builds locator candidates (profile → learned → Postgres) and Playwright + Java script text.
6. **Execution Service** runs Playwright — `discovered_flows` for URL-only auto runs (top critical flows), `minimal` for CSV, or `full` when tuned.
7. **Manager / Delivery** — executive review and stakeholder report.

## Run locally

```bash
npm install
npx playwright install chromium
npm run build
npm start              # API only (services/api/server.js)
npm run start:all      # local all-in-one: API + orchestrator + executor
```

Run each line on its own. If you paste with trailing `# comments`, zsh (default `INTERACTIVE_COMMENTS` off) will forward the `#` as an argument to `vite build` and the build fails with `Could not resolve entry module "#/index.html"`. Fix once with `setopt interactive_comments`.

When the API starts, it will log: **API listening on http://localhost:3001 (UI: http://localhost:3000)**. Open the UI URL in your browser to use the pipeline. Under S7 the SPA (`zero-web`, nginx `:3000`) and the API (`zero-api`, Express `:3001`) are two separate origins. For a full local pipeline without Compose, use `npm run start:all` and open the Vite dev server at `http://localhost:5173` (fetches hit the API on `:3001` via `VITE_API_BASE_URL`).

**Docker (full stack):** `docker compose up --build` — web, API, orchestrator, and executor on Compose, docs site on `:5174`, agent-workflow status on `:5175`, plus Postgres and Redis. Infra only: `docker compose up -d postgres redis`. Optional MinIO (S3 drill): `docker compose --profile s3 up -d minio minio-init` (console `:9001`). If host `:5432` is taken: `POSTGRES_PORT=15432 docker compose up -d postgres` then `DATABASE_URL=postgres://zero:zero@localhost:15432/zero`.

**Tests:** `npm test` — health smoke, one pipeline start, and (when Postgres is reachable) run persist/reload.

If the UI does not load: ensure you ran `npm run build` from the project root so `dist/web/index.html` and `dist/web/assets/` are up to date.

**Show browser:** Check "Show browser (run in front of me so I can validate)" when starting a run to open a visible browser window on your machine. You can also set `RUN_HEADED=true` in the environment to always run with a visible browser.

---

## Execution mode (don’t get stuck)

| Mode | When | Behavior |
|------|------|----------|
| **`discovered_flows`** | URL-only auto run (no CSV, web analysis present) | Top 3–5 critical flows from crawl — multi-step Playwright with pass/fail + screenshots |
| **`minimal`** (default for CSV) | Uploaded TC file or explicit default | Load URL, wait for body, screenshot — pipeline always completes |
| **`uploaded_tc_only`** | CSV upload | Checks derived from uploaded cases |
| **`EXECUTION_MODE=full`** | Selector tuning only | Keyword/selector navigation — brittle on real sites |

**Recommended paths:**

1. **URL-only (autonomous QA):** paste any public URL with no TC file — Web Analyzer crawls (up to `ZERO_ANALYZER_MAX_PAGES`, default 8), generates major functional cases, executes discovered flows, and produces a Manager report.
2. **CSV workflow:** upload TCs → requirements → manual TC list → **Java (Selenium) script generation** → Manager report. Default `minimal` execution keeps the pipeline reliable.
3. **Real E2E in your CI:** export generated Java/Playwright from the Automation tab, tune locators in your own Maven/Gradle or Playwright project.

Manager “Go/No-Go” from in-app execution is **orchestration confidence**, not full product E2E proof on every path.

## CMS signal screenshot (Stream tab, all stations)

Separate from the pipeline. Captures the **Stream** tab (signal / preview), **not Playout**.

- **All stations:** paste **one Gray CMS playout URL per line** (each station’s URL), then **Capture signal (Stream) for all stations**. Filenames use the station slug from the path (`/gm/wnem/` → `wnem`).
- **Single URL:** optional one-off capture.
- **Show browser:** one session for the whole bulk run — log in once on the first page, then each URL is opened in order.

Images: `dist/artifacts/cms-captures/` (prefix `cms-signal-stream-`).

## Postgres Persistence (recommended for script reuse)

Set either `DATABASE_URL` or individual `PG*` variables before startup.

Example:

```bash
set DATABASE_URL=postgres://postgres:password@localhost:5432/qa_orchestrator
npm run start:all
```

Stored entities (DDL in `@zero/db`; ER + column catalog in [`support/zero-docs/docs/v1/DATABASE.md`](support/zero-docs/docs/v1/DATABASE.md)):

- full run lifecycle (`qa_runs`)
- manual test cases + generated automation script + manager report (`qa_assets`)
- **element_locators** – per-host reusable locators (from element logs + learned at runtime); used when generating Playwright scripts
- **element_logs** – raw element log snapshots (URL + elements) for traceability
- **projects** / **stored_scripts** / **recordings** – IDE-style helpers (no `/projects` routes yet)
- **provider_keys** / **agent_settings** – encrypted LLM keys and per-agent model/prompt

When Postgres is enabled, the framework merges **profile selectors + in-memory learned selectors + DB-stored locators** so generated scripts reuse stable locators across runs.

Built-in channel profiles currently include `Gray OTT`, `TVNZ+`, `Aha OTT`, `Hotstar-like`, `PrimeVideo-like`, and a fallback generic profile.

## Input Rules

- **Target URL** is required (OTT, SaaS, marketplace, corporate site, etc.).
- **Guided mode:** provide at least one of Figma link, uploaded test-case file (`.txt`, `.md`, `.csv`, `.json`, `.xlsx`, `.xls`), or BA notes.
- **Autonomous mode (URL-only):** URL alone is enough — Web Analyzer runs when no TC file and notes are short/empty; major functional cases and `discovered_flows` execution follow automatically.
- `.xlsx` and `.xls` upload parsing is supported for detailed manual test-case sheets.
- Channel profile can be forced from UI (`Aha OTT`, `Hotstar-like`, `PrimeVideo-like`, `Generic`) to avoid wrong auto-detection.
- Optional runtime login credentials can be passed from UI (`loginUsername`, `loginPassword`) for gated flows.
- Passwords are used for runtime execution only and are not persisted in run artifacts.
- If uploaded file is `.csv`, execution automatically switches to `uploaded_tc_only` mode and runs checks derived from uploaded test cases.

## API

S7 dropped the `/api` prefix — the API service (`http://localhost:3001`) owns its routes natively.

- `POST /runs` (multipart/form-data) starts a run
- `GET /runs` lists recent runs
- `GET /runs/:id` fetches status + artifacts
- `POST /runs/:id/rerun-failed` reruns only failed execution checks
- `GET /runs/:id/assets` fetches persisted scripts/test cases for reuse
- `GET /runs/:id/download` downloads final PDF report with screenshots
- `GET /runs/:id/download?format=json` downloads raw JSON payload
- **`POST /element-log`** (JSON body) – submit element log; stores locators in Postgres by host so the framework can build scripts from them. Body: `{ "url": "https://...", "elements": [ { "key": "playCta", "selector": "button.play-btn" }, ... ] }`. Requires Postgres.
- **`GET /locators?host=...`** – returns stored locators for a host (for reuse in script generation)

## Framework: element logs and reusable scripts

1. **Element log** – Use the "Element log" tab or `POST /element-log` with a JSON payload: `url` + `elements` array. Each element can have `key` (e.g. `playCta`, `contentCard`, `loginCta`), `selector`, optional `xpath`/`role`/`label`. The framework normalizes keys and stores them in `element_locators` by host.
2. **Script generation** – When generating the automation bundle, the server merges (1) built-in profile selectors, (2) in-memory learned selectors from the current run, and (3) **Postgres-stored locators** for the run’s host. The generated Playwright script is built from this merged set so scripts reuse your stored locators.
3. **Reuse** – After execution, selectors that worked are persisted to Postgres (when configured). You can also submit element logs from external tools (e.g. DOM analysis or AI) so the same framework builds scripts from them on the next run.

PostgreSQL is required for element logging and for locator reuse across runs; without it, only in-memory selector memory is used.

## Python ML Training for Agents

Separate per-agent ML training pipeline is available in `support/ml-training/`.

- trains independent quality models for BA, Manual QA, Automation QA, Manager
- scores generated outputs and suggests rewrite instructions
- designed for feedback-loop retraining using accepted/rejected artifacts

See `support/ml-training/README.md`.

# ZER0 (Web)

Architect-level QA orchestration workflow in one UI.

**Repos:** 1 Git repository ([Wisecarft/Zero](https://github.com/Wisecarft/Zero.git)) · **npm workspaces** (`services/*`, `packages/*`, `web`) · **MIT** ([LICENSE](./LICENSE))

**Dev docs (humans + AI):** [Developer guide](./support/zero-docs/docs/v1/DEVELOPER_GUIDE.md) · [Architecture V1](./support/zero-docs/docs/v1/ARCHITECTURE.md) · [Docker](./support/zero-docs/docs/v1/DOCKER.md) · [Architecture V2](./support/zero-docs/docs/v2/ARCHITECTURE.md) · [Open source](./support/zero-docs/docs/v1/OPEN_SOURCE.md) · [Docs index](./support/zero-docs/docs/README.md) · [Docs site](./support/zero-docs/README.md)

Pipeline:

1. BA Agent builds channel-specific requirements from OTT URL + Figma (optional) + uploaded test cases (optional) + notes.
2. Manual QA Agent creates app-oriented manual test cases (not generic templates).
3. Automation QA Agent builds adaptive locator candidates using profile + learned selectors.
4. Execution Service runs Playwright checks with retries and screenshot evidence.
5. Manager Agent produces an executive review with root cause analysis and action plan.

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

**Default: minimal execution.** For CSV-uploaded test cases, each test only loads the OTT URL and waits for the page body. No selector or keyword logic. So the pipeline **always completes**, you get one result per TC (passed + screenshot), and the Manager report and Java scripts are still generated. This gives you a working run end-to-end without fighting navigation/selectors.

- To try **keyword-based navigation** (Playwright looking for Login, Play, etc.), set **`EXECUTION_MODE=full`** before starting. It is brittle on real sites and may fail; use only if you’re tuning selectors.

**Recommended path so you’re not stuck:**

1. **Use ZERO for:** CSV → requirements → manual TC list → **Java (Selenium) script generation** → Manager/Delivery report. Run with default (minimal) execution so you see a full run and reports.
2. **For real E2E against your app:** take the **generated Java** from the Automation tab (or from DB/API), copy it into your own Java/Maven project, fix locators for your site, and run tests from your IDE or CI. Or use a separate Playwright/Cypress project you control. ZERO gives you the structure and scripts; you run them where you have full control.

That way you get value (requirements, traceability, Java scripts, reports) without depending on in-app navigation matching every TC.

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

- `OTT URL` is required.
- Provide at least one of:
  - `Figma Link`, or
  - uploaded test-case file (`.txt`, `.md`, `.csv`, `.json`), or
  - BA notes.
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

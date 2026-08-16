# ZER0 (Web)

Architect-level QA orchestration workflow in one UI. Works against **any website**, not just OTT platforms.

Pipeline:

1. BA Agent builds channel-specific requirements from URL + Figma (optional) + uploaded test cases (optional) + notes.
2. Manual QA Agent creates app-oriented manual test cases from a deterministic template baseline, then **enriches them with real LLM-generated cases grounded in the actually-crawled page** (see "AI-grounded test generation" below) - not generic templates.
3. Automation QA Agent builds adaptive locator candidates using profile + learned selectors, **verifies each candidate against the live page with Playwright**, and generates both a Playwright script and a Java **Page Object Model** (locators flagged VERIFIED/UNVERIFIED).
4. Execution Service runs Playwright checks with retries and screenshot evidence.
5. Manager Agent produces an executive review with root cause analysis and action plan.

## AI-grounded test generation (real LLM, not templates)

Set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` (see `.env.example`) to enable real LLM-based test case generation (`lib/aiTestGenerator.js`). When configured:

- The Manual QA stage sends the LLM a **grounded context** built from the page actually crawled during Web Analysis (`lib/urlAnalyzerPro.js`) - real headings, discovered elements, forms, and user flows - never a bare URL. This is what prevents hallucinated/generic test cases.
- Results are **cached by a content fingerprint** of the page (`lib/aiTestGenerator.js#buildContextCacheKey`), in-memory and in Postgres (`ai_generation_cache` table) when configured, so re-running against an unchanged page costs zero additional tokens.
- Token-cost controls: dynamic `max_tokens` sized to the expected output (not a flat 8000), strict JSON response mode where supported, and a cheap-model repair pass instead of a full expensive re-generation if the first response isn't valid JSON.
- Without any key configured, the pipeline **still runs end-to-end** using only the deterministic template baseline (previous behavior) - AI is additive, never a hard dependency.

## Selector verification + Page Object Model

Before scripts are generated, `lib/selectorVerifier.js` opens the live target page and checks every candidate selector for actual visibility. Verified selectors are promoted first; the Java output (`lib/pageObjectBuilder.js`) is a proper **Page Object Model** class with each locator clearly commented `VERIFIED` or `UNVERIFIED - TODO: confirm manually`, plus a JUnit test class that consumes it. This replaces "guessed selectors that don't work" with code grounded in what's actually on the page.

## Run locally

```bash
npm install
npx playwright install chromium
npm start
```

When the server starts, it will log: **Open the UI at: http://localhost:3000** (or the next free port if 3000 is in use). Open that URL in your browser to use the pipeline.

If the UI does not load: ensure you ran `npm run build` from the project root so `public/index.html` and `public/assets/` are up to date.

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

Images: `artifacts/cms-captures/` (prefix `cms-signal-stream-`).

## Postgres Persistence (recommended for script reuse)

Set either `DATABASE_URL` or individual `PG*` variables before startup.

Example:

```bash
set DATABASE_URL=postgres://postgres:password@localhost:5432/qa_orchestrator
npm start
```

Stored entities:

- full run lifecycle (`qa_runs`)
- manual test cases + generated automation script + manager report (`qa_assets`)
- **element_locators** – per-host reusable locators (from element logs + learned at runtime); used when generating Playwright scripts
- **element_logs** – raw element log snapshots (URL + elements) for traceability
- **ai_generation_cache** – fingerprinted LLM test-generation results, so an unchanged page never triggers a repeat paid API call

Tables are created automatically on startup (`lib/db.js#initAllTables`) - no manual migration step needed.

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

- `POST /api/runs` (multipart/form-data) starts a run
- `GET /api/runs` lists recent runs
- `GET /api/runs/:id` fetches status + artifacts
- `POST /api/runs/:id/rerun-failed` reruns only failed execution checks
- `GET /api/runs/:id/assets` fetches persisted scripts/test cases for reuse
- `GET /api/runs/:id/download` downloads final PDF report with screenshots
- `GET /api/runs/:id/download?format=json` downloads raw JSON payload
- **`POST /api/element-log`** (JSON body) – submit element log; stores locators in Postgres by host so the framework can build scripts from them. Body: `{ "url": "https://...", "elements": [ { "key": "playCta", "selector": "button.play-btn" }, ... ] }`. Requires Postgres.
- **`GET /api/locators?host=...`** – returns stored locators for a host (for reuse in script generation)

## Framework: element logs and reusable scripts

1. **Element log** – Use the "Element log" tab or `POST /api/element-log` with a JSON payload: `url` + `elements` array. Each element can have `key` (e.g. `playCta`, `contentCard`, `loginCta`), `selector`, optional `xpath`/`role`/`label`. The framework normalizes keys and stores them in `element_locators` by host.
2. **Script generation** – When generating the automation bundle, the server merges (1) built-in profile selectors, (2) in-memory learned selectors from the current run, and (3) **Postgres-stored locators** for the run’s host. The generated Playwright script is built from this merged set so scripts reuse your stored locators.
3. **Reuse** – After execution, selectors that worked are persisted to Postgres (when configured). You can also submit element logs from external tools (e.g. DOM analysis or AI) so the same framework builds scripts from them on the next run.

PostgreSQL is required for element logging and for locator reuse across runs; without it, only in-memory selector memory is used.

## Python ML Training for Agents

Separate per-agent ML training pipeline is available in `ml-training/`.

- trains independent quality models for BA, Manual QA, Automation QA, Manager
- scores generated outputs and suggests rewrite instructions
- designed for feedback-loop retraining using accepted/rejected artifacts

See `ml-training/README.md`.

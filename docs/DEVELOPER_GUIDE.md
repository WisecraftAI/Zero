# ZER0 Developer Guide

> Lead briefing for humans and AI agents. Read this first, then `docs/ARCHITECTURE.md` for production gaps, then touch code.

**Repo count:** **1 Git repository** — [Wisecarft/Zero](https://github.com/Wisecarft/Zero.git)  
**Packages inside that one repo:** **2 npm packages** + **1 optional Python folder** (not separate Git remotes)

| Unit | Path | Kind | Role |
|------|------|------|------|
| Git remote `origin` | `https://github.com/Wisecarft/Zero.git` | **1 repo** | Entire product |
| `ai-qa-orchestrator` | `/package.json` | npm (CommonJS) | Express API, pipeline, Playwright |
| `zer0-client` | `/client/package.json` | npm (ESM) | React 18 + Vite SPA |
| ML training | `/ml-training/` | Python (stdlib only) | Optional agent quality models |

There is **no multi-repo split**. Sibling folders under `~/Product/code/` (aha, canelatv-web-ui, etc.) are **other products**, not part of Zero’s Git remote.

---

## 0. What you are building (elevator)

ZER0 is an **architect-level QA orchestration UI**. A user gives an OTT URL plus at least one of: Figma link, uploaded test cases, or BA notes. The system runs a **deterministic pipeline** (mostly templates + Playwright crawl — **not** live LLM calls today) and produces:

1. Requirements consolidation  
2. Manual test cases  
3. Playwright + Java/Selenium script text  
4. Execution evidence (screenshots under `artifacts/`)  
5. Manager + Delivery reports (PDF/JSON download)

**Product truth your team must internalize:** default execution is **minimal** (load URL + wait for body). That makes the pipeline reliable. Real E2E lives in **exported Java/Playwright** run outside Zero, or in `EXECUTION_MODE=full` (brittle). Do not sell minimal mode as proof of full E2E.

---

## 1. Who owns what (team map)

| Role | Own these paths | Do not casually rewrite |
|------|-----------------|-------------------------|
| Backend / pipeline | `server.js`, `lib/*` | Entire agent logic dump into new frameworks |
| Frontend | `client/src/**` then `npm run build` | Hand-editing `public/assets` |
| Persistence / IDE vision | `lib/db.js`, `docs/ARCHITECTURE.md` target APIs | Assuming Postgres is live (it is **hard-disabled**) |
| ML (optional) | `ml-training/` | Wiring into Node without a clear contract |
| Docs / agents | `README.md`, `AGENTS.md`, `docs/*`, `.cursor/skills/` | Inventing shipped features that are stubs |

**AI agents:** follow `AGENTS.md`. Prefer `/zero-architecture` and `/zero-diagrams` for Zero-specific design. Run `/init` if pro skills are missing.

---

## 2. Day-0 setup (every engineer)

```bash
git clone https://github.com/Wisecarft/Zero.git
cd Zero
cp .env.example .env          # optional; see honesty note on Postgres below
npm install
npx playwright install chromium
npm run build                 # Vite client → public/
npm start                     # Express; logs UI URL (default :3000)
```

**Dev UI (hot reload):** keep `npm start` on `:3000`, then in another terminal:

```bash
npm run client                # Vite :5173, proxies /api → :3000
```

**Health:** `GET /health`  
**Architecture page:** `http://localhost:3000/architecture.html`  
**Swagger:** `/api-docs`

### zsh gotcha

Run install/build/start as **separate lines**. Pasting `# comments` on the same line can break Vite if `INTERACTIVE_COMMENTS` is off. Fix: `setopt interactive_comments`.

### Honest env note

`.env.example` documents `DATABASE_URL` / Railway URLs. In **current code**, `databaseConfigured()` in `server.js` **always returns `false`** — Postgres init is a no-op. Runs still work via in-memory `Map` + `artifacts/<runId>/run.json`. Treat DB docs as **target / re-enable work**, not “it works if you set the var.”

---

## 3. Mental model (one diagram)

```
┌─────────────────────┐     multipart      ┌──────────────────────────────┐
│  React SPA          │  POST /api/runs    │  Express  server.js (~5k LOC)│
│  client/src → build │ ─────────────────▶ │  stageKeys pipeline          │
│  → public/          │  poll GET /runs/:id │  Playwright + PDF + recording│
└─────────────────────┘                    └───────────┬──────────────────┘
                                                       │
                       ┌───────────────────────────────┼──────────────────┐
                       ▼                               ▼                  ▼
                 lib/ (builders,                 Chromium            artifacts/
                 locators, analyzers,            headed/headless     run.json +
                 encryption, db stubs)                               screenshots
```

**Pipeline order** (`stageKeys` in `server.js`):

`webAnalyzer?` → `ba` → `manualQa` → `automationQa` → `execution` → `accessibility?` / `performance?` / `security?` → `manager` → `delivery`

| Stage | What it actually does today |
|-------|-----------------------------|
| `webAnalyzer` | Only if no TC file and notes are short/empty — Playwright crawl via `lib/urlAnalyzerPro.js` |
| `ba` | Template consolidation (`consolidateRequirements`) — **not** an LLM call |
| `manualQa` | Cases from CSV / UI rows / analyzer / channel templates |
| `automationQa` | Merge locators → Playwright + Java text (`scriptBuilder`, `javaSeleniumBuilder`) |
| `execution` | Playwright; default **minimal** |
| optional a11y/perf/security | Extra Playwright / heuristic passes |
| `manager` / `delivery` | Deterministic reports from prior artifacts |

Channel profiles: Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic (+ ecommerce helpers in `lib/ecommerceSelectors.js`).

---

## 4. Repository layout (where to look)

```
Zero/
├── server.js              # THE monolith: agents, APIs, Playwright, PDF, CMS, recording
├── lib/                   # Extracted helpers (prefer extending these over bloating server.js further)
│   ├── scriptBuilder.js          # Playwright script text
│   ├── javaSeleniumBuilder.js    # Java/Selenium export text
│   ├── locatorRegistry.js        # profile + memory + DB merge order
│   ├── elementLogger.js          # normalize element keys
│   ├── urlAnalyzer.js / Pro.js   # crawl / BRD-ish insights
│   ├── db.js                     # schema helpers (DB currently disabled at runtime)
│   ├── encryption.js             # provider key AES-GCM
│   ├── middleware.js, logger.js, swagger.js, apiKeyManager.js
│   └── ecommerceSelectors.js
├── client/                # Source of truth for UI
│   ├── src/views/         # Dashboard, Runs, NewRun, Detail, Locators, Keys, Agents, Integrations
│   ├── src/components/    # RunForm, Pipeline*, Sidebar, CMS capture, …
│   ├── src/layouts/       # AppShell
│   └── public/architecture.html  # Survives Vite emptyOutDir — sync/copy to public/
├── public/                # BUILT output — do not hand-edit assets
├── artifacts/             # Runtime evidence (gitignored)
├── ml-training/           # Optional Python quality models
├── docs/                  # This guide + architecture + OSS inventory
├── AGENTS.md              # Contract for coding agents
├── README.md              # Operator quick start
└── .cursor/skills/        # Agent skills (mirrored in .agents/skills/)
```

---

## 5. What to do by change type

### A. UI change

1. Edit `client/src/**` only.  
2. `npm run build` from repo root (or use `npm run client` while developing).  
3. Confirm `public/` updated.  
4. Architecture HTML: edit `client/public/architecture.html`, keep `public/architecture.html` in sync.

### B. Pipeline / agent behavior

1. Find the stage function in `server.js` (`consolidateRequirements`, `generateManualCases`, `processRun`, report generators, …).  
2. Shared locator/script logic → `lib/`.  
3. Keep changes focused; do not “while you’re here” rewrite the monolith.  
4. Update `AGENTS.md` / `README.md` only if run instructions or behavior change.

### C. Locators / script quality

Merge order (see `lib/locatorRegistry.js` + server merge helpers):

1. Profile selectors (`appProfiles`)  
2. In-memory learned selectors  
3. DB locators (**inactive** while DB stubbed)

Normalize keys via `lib/elementLogger.js`. Element log API: `POST /api/element-log`.

### D. Execution semantics

| Mode | When | Behavior |
|------|------|----------|
| `minimal` (default) | Always unless overridden | Load URL, wait for body, screenshot — pipeline completes |
| `EXECUTION_MODE=full` | Selector tuning | Keyword/selector navigation — brittle |
| CSV upload | Auto | `uploaded_tc_only` derived from file |
| `RUN_HEADED=true` / UI checkbox | Human validation | Visible Chromium |

**Team rule:** Manager “Go/No-Go” from minimal mode is **orchestration confidence**, not full product E2E proof.

### E. Persistence / productionization

Read `docs/ARCHITECTURE.md` § Production gaps. Current P0 themes:

1. Re-enable real DB (or explicit durable file design)  
2. Real auth (today: spoofable `X-User-Email`, any non-empty `x-api-key`)  
3. Lock down `/artifacts` and recording CORS `*`  
4. Queue Playwright work (in-process concurrency is dangerous)  
5. Be honest in UI copy about minimal vs full execution  

### F. LLM keys UI

`/api/provider-keys` and `/api/agent-settings` store encrypted keys / prompts. **Pipeline agents do not call Claude/OpenAI/Gemini yet.** Either wire them or do not claim live AI agents in customer-facing copy.

---

## 6. API surface (contracts)

| Area | Routes | Notes |
|------|--------|-------|
| Runs | `POST /api/runs` (multipart: `tcFile`, `recordingFile`), `GET /api/runs`, `GET /api/runs/:id`, `POST …/rerun-failed`, `…/download`, `…/assets` | Core product path |
| Locators | `POST /api/element-log`, `GET /api/locators?host=` | Needs DB to persist across restarts |
| Recording | `/api/recordings/*`, `/record`, `/recorder.js` | In-memory sessions today |
| CMS | `/api/capture-cms-screenshot`, `/api/capture-cms-signal-bulk` | Gray Stream tab; separate from pipeline |
| Keys / agents | `/api/provider-keys`, `/api/agent-settings`, `/api/keys*` | Storage / stubs — verify before relying |
| Ops | `/health`, `/api/health/detailed`, `/api-docs` | |

**Input rules:** OTT URL required; plus ≥1 of Figma / TC file (txt/md/csv/json/xlsx/xls) / BA notes.

Passwords from UI → `runSecrets` only (not written into artifacts). Never log them.

---

## 7. Definition of done (team bar)

A change is done when:

- [ ] Behavior matches the stage you intended (minimal vs full called out if execution-related)  
- [ ] UI changes rebuilt into `public/`  
- [ ] No secrets in git (`.env`, passwords, provider keys)  
- [ ] Docs updated if user-facing run path or API contract changed  
- [ ] You did not invent “Postgres works” / “LLM agents run” unless you re-enabled them  
- [ ] Prefer a small PR: one concern (UI **or** pipeline **or** docs)

Suggested verification:

```bash
npm run lint          # if configured for your change
npm run build
npm start             # smoke: open UI, start a minimal run with sample CSV
curl -s localhost:3000/health
```

`jest` is in `package.json` but there is **no real suite yet** — adding hermetic API + fixture-site smoke is a P2 from architecture docs.

---

## 8. Suggested workstreams (what to pick up next)

Ordered like a lead would assign after onboarding:

1. **P0 persistence** — restore `databaseConfigured` / `initDatabase` or document file-only forever; fix `qa_assets` vs `lib/db.js` schema drift.  
2. **P0 auth + artifact ACL** — stop public `/artifacts` and open recording CORS.  
3. **P0 worker queue** — extract `processRun` to bounded concurrency.  
4. **Product honesty** — UI labels for minimal vs full; Manager wording.  
5. **LLM wire-up or defer** — connect provider keys or hide “AI agent” implication.  
6. **Tests + CI** — lint, unit, one Playwright smoke against a static fixture.  
7. **Split monolith** — routers + worker; keep `lib/` boundaries.  
8. **IDE vision** — `/api/projects`, recordings → SQL, stored Java scripts (see architecture target).

---

## 9. Doc map (read order)

| Doc | Audience | Purpose |
|-----|----------|---------|
| [README.md](../README.md) | Operator | Run locally, modes, APIs |
| [AGENTS.md](../AGENTS.md) | Coding agents | Conventions + pipeline facts |
| **This file** | Engineers + AI | Lead briefing, ownership, DoD |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Leads / platform | Runtime vs vision + production gaps |
| [OPEN_SOURCE.md](./OPEN_SOURCE.md) | Legal / onboarding | License + dependency inventory |
| [ml-training/README.md](../ml-training/README.md) | ML | Optional Python models |
| `/architecture.html` | Visual | Live HTML architecture |

---

## 10. Sample local exercise (first 30 minutes)

1. Start the stack (`build` + `start`).  
2. Open UI → New Run.  
3. Use a public URL + `amazon_test_cases.csv` (or another sample CSV in repo root).  
4. Leave execution on default (minimal).  
5. Watch stages complete; open run detail + download JSON.  
6. Open Automation artifacts / Java text — understand export is the path to real E2E.  
7. Skim `server.js` around `stageKeys` and `POST /api/runs`.  
8. Skim `lib/scriptBuilder.js` and `lib/javaSeleniumBuilder.js`.

When you can explain **minimal vs full** and **where agents really live**, you are onboarded.

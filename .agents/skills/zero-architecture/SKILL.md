---
name: zero-architecture
description: >-
  Document, explain, and publish ZER0 (ai-qa-orchestrator) architecture —
  pipeline stages, layers, APIs, execution modes, and standalone HTML arch pages.
  Use whenever the user asks about Zero architecture, how the system works,
  system design, publish architecture as HTML, update architecture.html,
  AGENTS.md architecture sections, or support/zero-docs/docs/v2/ARCHITECTURE.md. Prefer this over
  generic architecture skills for Zero-specific facts.
---

# ZER0 Architecture

## When this skill owns the task

Use for ZER0 architecture questions, design write-ups, and publishing arch docs as HTML.
For generic layered HTML templates, also read `.cursor/skills/architecture/SKILL.md`.
For Mermaid/flow diagrams of Zero, use `zero-diagrams`.

## Ground truth (read first)

1. `AGENTS.md` — runtime layout, pipeline, conventions
2. `README.md` — how to run, execution modes, APIs
3. `support/zero-docs/docs/v1/ARCHITECTURE.md` — **current runtime** (what ships)
4. `support/zero-docs/docs/v2/ARCHITECTURE.md` — **target** IDE-style vision (projects, recording, Java in SQL)
5. `services/api/server.js` — HTTP API composition root + `src/routes/`
6. `services/orchestrator/` — DAG walk (`processRun.js`), `stageKeys`, agents, LLM
7. `packages/*` — `@zero/domain` (`stageKeys`, `appProfiles`), `@zero/locators`, `@zero/builders`, `@zero/analyzer`, `@zero/db`, `@zero/cloud`

Distinguish **current runtime** (split services + shared packages) from **target vision** (`support/zero-docs/docs/v2/ARCHITECTURE.md` + `dist/web/architectureV2.html`, source `web/public/`).

To **implement** the Production Blueprint (M1–M7 done, S0–S7 done, Q1–Q4 done, **Q5 open**), use skill `zero-target-arch` and `support/agent-workflow/` — not this skill.

## Runtime architecture (today)

```
React web/ → dist/web/  →  @zero/api (services/api/server.js)  →  @zero/orchestrator  →  @zero/executor (Playwright)
                              ↓
                         packages/* (@zero/domain · locators · builders · analyzer · db · cloud)
                              ↓ optional
                         PostgreSQL (@zero/db)
```

**Pipeline:** optional `webAnalyzer` → optional domain inference → `ba` → `manualQa` → `automationQa` → `execution` → optional `accessibility`/`performance`/`security` → `manager` → `delivery`

**Locator merge:** learned DB and memory selectors ahead of profile fallbacks (`element_locators` → in-memory → `appProfiles`)

## How to run (include when explaining)

```bash
npm install && npx playwright install chromium
npm run build && npm start
```

Default execution is **minimal**. `EXECUTION_MODE=full` is brittle. Postgres via `DATABASE_URL` is optional.

## Publish as HTML

When the user asks to publish architecture as HTML:

1. Put the page at `web/public/architecture.html` (survives Vite `emptyOutDir`)
2. Rebuild so it lands in `dist/web/architecture.html` for serving
3. Serve at `/architecture.html` when `npm start` is running
4. Keep brand-first hero (ZER0), one composition, include: how to run, diagram, pipeline, layers, runtime notes
5. Match existing visual language if updating: deep slate + teal signal (`#3dd6c6`), Syne + IBM Plex Mono

Do **not** hand-edit only `dist/web/` — rebuild wipes it. The source lives under `web/public/`.

## Writing rules

- Name real modules: `services/api/server.js`, `@zero/locators` (`locatorRegistry`), stage keys, API paths
- Call out optional Postgres and minimal vs full execution
- Do not invent project APIs as shipped unless they exist in `services/api`
- Optional stages and CMS capture are separate from the core pipeline

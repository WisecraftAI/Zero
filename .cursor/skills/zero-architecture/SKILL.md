---
name: zero-architecture
description: >-
  Document, explain, and publish ZER0 (ai-qa-orchestrator) architecture —
  pipeline stages, layers, APIs, execution modes, and standalone HTML arch pages.
  Use whenever the user asks about Zero architecture, how the system works,
  system design, publish architecture as HTML, update architecture.html,
  AGENTS.md architecture sections, or docs/ARCHITECTURE.md. Prefer this over
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
3. `docs/ARCHITECTURE.md` — **target** IDE-style vision (projects, recording, Java in SQL)
4. `server.js` — live agents, `stageKeys`, `appProfiles`, APIs
5. `lib/` — locators, script builders, DB

Distinguish **current runtime** (run-based pipeline in `server.js`) from **target vision** (`docs/ARCHITECTURE.md` + `public/architectureV2.html`).

To **implement** the Production Blueprint (M1–M7), use skill `zero-target-arch` and `agent-workflow/` — not this skill.

## Runtime architecture (today)

```
React client/ → public/  →  Express server.js  →  Playwright
                              ↓
                         lib/ (locators, scripts, db)
                              ↓ optional
                         PostgreSQL
```

**Pipeline:** `ba` → `manualQa` → `automationQa` → `execution` → optional `accessibility`/`performance` → `manager` → `delivery`

**Locator merge:** profile selectors → in-memory learned → Postgres `element_locators`

## How to run (include when explaining)

```bash
npm install && npx playwright install chromium
npm run build && npm start
```

Default execution is **minimal**. `EXECUTION_MODE=full` is brittle. Postgres via `DATABASE_URL` is optional.

## Publish as HTML

When the user asks to publish architecture as HTML:

1. Put the page at `client/public/architecture.html` (survives Vite `emptyOutDir`)
2. Copy or sync to `public/architecture.html` for immediate serving
3. Serve at `/architecture.html` when `npm start` is running
4. Keep brand-first hero (ZER0), one composition, include: how to run, diagram, pipeline, layers, runtime notes
5. Match existing visual language if updating: deep slate + teal signal (`#3dd6c6`), Syne + IBM Plex Mono

Do **not** hand-edit only `public/` — rebuild wipes it unless the file also lives under `client/public/`.

## Writing rules

- Name real modules: `server.js`, `lib/locatorRegistry.js`, stage keys, API paths
- Call out optional Postgres and minimal vs full execution
- Do not invent project APIs as shipped unless they exist in `server.js`
- Optional stages and CMS capture are separate from the core pipeline

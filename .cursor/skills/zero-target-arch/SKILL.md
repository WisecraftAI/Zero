---
name: zero-target-arch
description: >-
  Advance ZER0 agent workflow: packaging S0–S7, then product Q1–Q4 (autonomous
  any-URL QA). Use for target architecture, /zero-target-arch, agent workflow,
  autonomous QA, any-URL testing, or milestone Q1–Q4.
---

# ZER0 Agent Workflow — Packaging + Product

## When this skill owns the task

- **Packaging:** four images, split routes, `/api` prefix drop (S0–S7)
- **Product:** URL-only QA — crawl → domain cases → execute flows → AI gate (Q1–Q4)

For explain/publish HTML only → use `zero-architecture`.
For diagrams → use `zero-diagrams`.

## First actions (mandatory)

1. Read `support/agent-workflow/WORKFLOW.md`
2. Run `npm run workflow:status`
3. Open the earliest unfinished spec:
   - `milestones/S{N}-*.md` + `prompts/packaging.md` (packaging)
   - `milestones/Q{N}-*.md` + `prompts/autonomous-qa.md` (product)
4. Follow: **plan → implement → verify → update progress.json → continue if asked**

Do **not** invent a different cloud shape. Do **not** re-implement M1–M7.

## North star (do not redesign)

| Tier | Folder | npm package | Cursor skill |
|------|--------|-------------|--------------|
| HTTP API | `services/api/` | `@zero/api` | `/zero-api` |
| Orchestrator worker | `services/orchestrator/` | `@zero/orchestrator` | `/zero-orchestrator` |
| Playwright executor | `services/executor/` | `@zero/executor` | `/zero-executor` |

Primitives via `@zero/cloud` (`ZERO_CLOUD=local|aws|gcp|azure|vercel`).

## Order

Capability (frozen): `M1` → … → `M7`

Packaging: `S0` → … → `S7` — done.

**Product:** `Q1` → `Q2` → `Q3` → `Q4` — autonomous any-URL QA — **done**. Prompt: `prompts/autonomous-qa.md`.

If every hardened probe is green, do not invent another milestone without an approved requirement.

## Agent roles

| Phase | Prompt |
|-------|--------|
| Plan | `support/agent-workflow/agents/planner.md` |
| Implement | `support/agent-workflow/agents/implementer.md` |
| Verify | `support/agent-workflow/agents/verifier.md` |

## Commands

```bash
npm run workflow:status
npm run workflow:verify -- --milestone Q1
```

## Progress

Update `support/agent-workflow/progress.json` only after verify exits 0. Flip `support/zero-docs/src/data/migration.ts` when a packaging step lands.

## Product rules (preserve)

- Pipeline `stageKeys` order; locator merge profile → memory → DB
- `EXECUTION_MODE=minimal` is not E2E proof
- No login passwords in artifacts/logs
- UI edits in `web/src/**` + `npm run build`
- Services never import sibling `services/*`
- Ask before destructive migrations or public API breaks

---
name: zero-target-arch
description: >-
  Advance ZER0 agent workflow: packaging S0–S7, product Q1–Q5 (autonomous
  any-URL QA), and UX U1–U3 (operator console + RTK store). Use for target
  architecture, /zero-target-arch, agent workflow, autonomous QA, any-URL
  testing, milestone Q1–Q5, or U3 Redux/RTK store.
---

# ZER0 Agent Workflow — Packaging + Product + UX

## When this skill owns the task

- **Packaging:** four images, split routes, `/api` prefix drop (S0–S7)
- **Product:** URL-only QA — crawl → domain cases → execute flows → AI gate → quality proof (Q1–Q5)
- **UX:** operator console U1–U2 (done) · **U3 RTK Query store** (open)

For explain/publish HTML only → use `zero-architecture`.
For diagrams → use `zero-diagrams`.

## First actions (mandatory)

1. Read `support/agent-workflow/WORKFLOW.md`
2. Run `npm run workflow:status`
3. Open the earliest unfinished spec:
   - `milestones/S{N}-*.md` + `prompts/packaging.md` (packaging)
   - `milestones/Q{N}-*.md` + `prompts/autonomous-qa.md` (product)
   - `milestones/U{N}-*.md` + `prompts/ui-ux.md` (UX — when the user asked for UI/UX or SPA store)
4. For **U3**, also read the zero-docs plan mirror: `support/zero-docs/src/data/uxStoreMilestone.ts` (Next Milestone → U3 Store)
5. Follow: **plan → implement → verify → update progress.json → continue if asked**

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

**Product:** `Q1` → `Q2` → `Q3` → `Q4` → `Q5` — Q1–Q4 done; Q5 reopened for trustworthy site understanding and test-plan quality. Prompt: `prompts/autonomous-qa.md`.

**UX:** `U1`–`U2` **done**; **`U3` Redux Toolkit / RTK Query store open** (parallel to Q5). Spec `milestones/U3-redux-store.md`. Prompt: `prompts/ui-ux.md`. Skill `/zero-web`.

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
npm run workflow:verify -- --milestone U3
```

## Progress

Update `support/agent-workflow/progress.json` only after verify exits 0. Flip `support/zero-docs/src/data/migration.ts` (and for U3: `uxMilestone.ts` / `uxStoreMilestone.ts`) when status lands.

## Product rules (preserve)

- Pipeline `stageKeys` order; locator merge profile → memory → DB
- `EXECUTION_MODE=minimal` is not E2E proof
- No login passwords in artifacts/logs
- UI edits in `web/src/**` + `npm run build`
- Services never import sibling `services/*`
- Ask before destructive migrations or public API breaks
- U3: do not put route / theme / wizard / elapsed into Redux; prefer RTK Query over classic runsSlice thunks

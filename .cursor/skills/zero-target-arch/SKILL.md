---
name: zero-target-arch
description: >-
  Autonomously advance ZER0 packaging S3–S6 (split routes, executor image,
  orchestrator image, remaining cloud providers) after M1–M7 probes are green.
  Use when the user says target architecture, make target real, /zero-target-arch,
  packaging track, S3, split routes, four images, or agent workflow.
  Prefer this over zero-architecture when the goal is to implement (not just document).
---

# ZER0 Target Architecture — Packaging workflow

## When this skill owns the task

User wants the **live runtime** to match the Target architecture: four images, not one process.

For explain/publish HTML only → use `zero-architecture`.
For diagrams → use `zero-diagrams`.

## First actions (mandatory)

1. Read `agent-workflow/WORKFLOW.md`
2. Read `agent-workflow/prompts/packaging.md`
3. Run `npm run workflow:status`
4. Open the matching `agent-workflow/milestones/S{N}-*.md` (capability M* only if a probe regressed)
5. Follow: **plan → implement → verify → update progress.json → continue if asked**

Do **not** invent a different cloud shape. Do **not** re-implement M1–M7.

## North star (do not redesign)

| Tier | Folder | npm package | Cursor skill |
|------|--------|-------------|--------------|
| HTTP API | `apps/api/` | `@zero/api` | `/zero-api` |
| Orchestrator worker | `apps/orchestrator/` | `@zero/orchestrator` | `/zero-orchestrator` |
| Playwright executor | `apps/executor/` | `@zero/executor` | `/zero-executor` |

Primitives via `@zero/cloud` (`ZERO_CLOUD=local|aws|gcp|azure|vercel`).

## Order

Capability (frozen): `M1` → … → `M7`

Packaging: `S5` → `S6`  (S0–S4 done)

Never skip. Earliest unfinished wins. Today that is **S5**.

## Agent roles

| Phase | Prompt |
|-------|--------|
| Plan | `agent-workflow/agents/planner.md` |
| Implement | `agent-workflow/agents/implementer.md` |
| Verify | `agent-workflow/agents/verifier.md` |

## Commands

```bash
npm run workflow:status
npm run workflow:verify -- --milestone S5
```

## Progress

Update `agent-workflow/progress.json` only after verify exits 0. Flip `zero-docs/src/data/migration.ts` when a packaging step lands.

## Product rules (preserve)

- Pipeline `stageKeys` order; locator merge profile → memory → DB
- `EXECUTION_MODE=minimal` is not E2E proof
- No login passwords in artifacts/logs
- UI edits in `web/src/**` + `npm run build`
- Apps never import sibling `apps/*`
- Ask before destructive migrations or public API breaks

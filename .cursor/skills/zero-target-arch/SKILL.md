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

1. Read `support/agent-workflow/WORKFLOW.md`
2. Read `support/agent-workflow/prompts/packaging.md`
3. Run `npm run workflow:status`
4. Open the matching `support/agent-workflow/milestones/S{N}-*.md` (capability M* only if a probe regressed)
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

Packaging: `S0` → … → `S6` — complete.

If every hardened probe is green, do not invent another packaging milestone. Move to an explicitly requested product or operational-hardening task.

## Agent roles

| Phase | Prompt |
|-------|--------|
| Plan | `support/agent-workflow/agents/planner.md` |
| Implement | `support/agent-workflow/agents/implementer.md` |
| Verify | `support/agent-workflow/agents/verifier.md` |

## Commands

```bash
npm run workflow:status
npm run workflow:verify -- --milestone S6
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

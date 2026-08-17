---
name: zero-target-arch
description: >-
  Autonomously advance ZER0 from runtime-today to the Target architecture in
  public/architectureV2.html (Production Blueprint: three tiers, lib/cloud
  adapters, milestones M1–M7). Use when the user says target architecture,
  make target real, /zero-target-arch, advance milestones, production blueprint,
  durable store, object store, orchestrator queue, execution farm, or agent
  workflow. Prefer this over zero-architecture when the goal is to implement
  (not just document) the blueprint.
---

# ZER0 Target Architecture — Autonomous Workflow

## When this skill owns the task

User wants the **live runtime** to become the Target architecture on `public/architectureV2.html` (not a redesign, not docs-only).

For explain/publish HTML only → use `zero-architecture`.
For diagrams → use `zero-diagrams`.

## First actions (mandatory)

1. Read `agent-workflow/WORKFLOW.md`
2. Read `agent-workflow/prompts/target-arch.md`
3. Run `npm run workflow:status`
4. Open the matching `agent-workflow/milestones/M{N}-*.md`
5. Follow the loop: **plan → implement → verify → update progress.json → continue if asked**

Do **not** invent a different cloud shape. Honor the three tiers and `lib/cloud/*` contracts.

## North star (do not redesign)

| Tier | Owns |
|------|------|
| API | Auth, intake, SSE, signed URLs — **never Chromium** |
| Orchestrator | BA · Manual · Automation · Manager · Delivery · LLM · DAG — consumes `runs.requested` |
| Execution farm | Playwright jobs on `execution.requested` |

Primitives: `queue` · `object store` · `DB` · `cache` · `secrets` via `lib/cloud` and `ZERO_CLOUD=local|aws|gcp|azure|vercel`.

## Milestone order

`M1` → `M2` → `M3` → `M4` (acceptance floor) → `M5` → `M6` → `M7`

Never skip. Earliest unfinished wins.

## Agent roles

| Phase | Prompt |
|-------|--------|
| Plan | `agent-workflow/agents/planner.md` |
| Implement | `agent-workflow/agents/implementer.md` |
| Verify | `agent-workflow/agents/verifier.md` |

## Commands

```bash
npm run workflow:status
npm run workflow:verify -- --milestone M1
```

## Progress

Update `agent-workflow/progress.json` only after verify exits 0.

## Product rules (preserve)

- Pipeline `stageKeys` order; locator merge profile → memory → DB
- `EXECUTION_MODE=minimal` is not E2E proof
- No login passwords in artifacts/logs
- UI edits in `client/src/**` + `npm run build`
- Ask before destructive migrations or public API breaks

## Done criteria (“Target architecture is real”)

M1–M4 probe green; API stateless; Chromium only in execution workers; Postgres + object store + Redis/cache; signed artifacts; cloud SDKs only under `lib/cloud/**`. Call out M5–M7 gaps.

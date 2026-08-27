---
name: zero-target-arch
description: >-
  Advance ZER0 agent workflow: packaging S0–S7 (done), product Q1–Q4 (done),
  then Q5 domain + sub-domain classification. Use for target architecture,
  /zero-target-arch, agent workflow, autonomous QA, any-URL testing, or
  milestone Q5. Prefer this over zero-architecture when the goal is to
  implement (not just document).
---

# ZER0 Agent Workflow — Packaging + Product

## When this skill owns the task

- **Packaging:** four images, split routes, `/api` prefix drop (S0–S7) — **done**
- **Product:** URL-only QA — crawl → domain cases → execute flows → AI gate (Q1–Q4) — **done**
- **Current:** Q5 — domain + sub-domain classification (`progress.json` `"current": "Q5"`)

For explain/publish HTML only → use `zero-architecture`.
For diagrams → use `zero-diagrams`.

## First actions (mandatory)

1. Read `support/agent-workflow/WORKFLOW.md`
2. Run `npm run workflow:status`
3. Open the earliest unfinished spec:
   - Packaging: `milestones/S{N}-*.md` + `prompts/packaging.md` (all done)
   - Product: `milestones/Q5-domain-subdomain.md` + `prompts/autonomous-qa.md`
4. Follow: **plan → implement → verify → update progress.json → continue if asked**

Do **not** invent a different cloud shape. Do **not** re-implement M1–M7 or S0–S7.

## North star (do not redesign)

| Tier | Folder | npm package | Cursor skill |
|------|--------|-------------|--------------|
| HTTP API | `services/api/` | `@zero/api` | `/zero-api` |
| Orchestrator worker | `services/orchestrator/` | `@zero/orchestrator` | `/zero-orchestrator` |
| Playwright executor | `services/executor/` | `@zero/executor` | `/zero-executor` |

Primitives via `@zero/cloud` (`ZERO_CLOUD=local|aws|gcp|azure|vercel`). Azure/Vercel adapters exist (S6); default remains `local`.

## Order

Capability (frozen): `M1` → … → `M7` — done.

Packaging: `S0` → … → `S7` — done.

**Product:** `Q1` → `Q2` → `Q3` → `Q4` — done. **`Q5` open** — two-level site taxonomy (domain + sub-domain) drives generated cases. Spec: `milestones/Q5-domain-subdomain.md`. Workspaces: `/zero-analyzer` (taxonomy + detection), `/zero-orchestrator` (`inferDomain`), `/zero-executor` (artifact bridge), `/zero-db` (optional cache table), `/zero-web` (run view).

If Q5 probes are green, do not invent another milestone without an approved requirement.

## Agent roles

| Phase | Prompt |
|-------|--------|
| Plan | `support/agent-workflow/agents/planner.md` |
| Implement | `support/agent-workflow/agents/implementer.md` |
| Verify | `support/agent-workflow/agents/verifier.md` |

## Commands

```bash
npm run workflow:status
npm run workflow:verify -- --milestone Q5
```

## Progress

Update `support/agent-workflow/progress.json` only after verify exits 0. Flip `support/zero-docs/src/data/migration.ts` when a packaging step lands.

## Product rules (preserve)

- Pipeline `stageKeys` order; locator merge prefers DB then memory then profile
- `EXECUTION_MODE=minimal` is not E2E proof
- No login passwords in artifacts/logs
- UI edits in `web/src/**` + `npm run build`
- Services never import sibling `services/*`
- Ask before destructive migrations or public API breaks
- Sub-domain means the taxonomy level (`ECOMMERCE` / grocery), not the DNS label

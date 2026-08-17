# Autonomous agent loop

This is the state machine every coding agent must follow when advancing ZER0 toward the Target architecture. One milestone per loop iteration. No skipping.

Two tracks, in order:

1. **Capability** M1–M7 — probes are green. Do not re-implement.
2. **Packaging** S0–S6 — S0–S4 done. Earliest unfinished is **S5**.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│  DETECT     │────▶│  PLAN        │────▶│  IMPLEMENT  │────▶│  VERIFY    │
│  earliest   │     │  (planner)   │     │  (impl)     │     │  (verifier)│
│  unfinished │     │              │     │             │     │            │
└─────────────┘     └──────────────┘     └─────────────┘     └─────┬──────┘
                                                                   │
                     ┌──────────────┐     ┌─────────────┐          │
                     │  STOP / ASK  │◀────│  ADVANCE    │◀─────────┘
                     │  (if blocked)│     │  progress   │   pass
                     └──────────────┘     └─────────────┘
```

## Step 0 — Load context

Read in order:

1. `zero-docs` — Target architecture, workspaces, S0–S6
2. `AGENTS.md` — conventions
3. `agent-workflow/progress.json`
4. If the user named a workspace → `prompts/repos/<name>.md` + `agents/repo-coder.md`
5. Else the spec for the detected id: `milestones/M{N}-*.md` or `milestones/S{N}-*.md`
6. Capability north-star: `prompts/target-arch.md`
7. Packaging north-star: `prompts/packaging.md`

## Step 1 — DETECT

```bash
npm run workflow:status
```

Use the printed id (`M1`…`M7` or `S0`…`S6`). If capability is complete, implement the earliest unfinished **S** step. Do not stop at “M1–M7 passed”.

## Step 2 — PLAN

Act as **planner** (`agents/planner.md`):

- List concrete files to touch (prefer `apps/` and `packages/`; avoid drive-by rewrites of all of `apps/api/server.js`)
- List acceptance criteria from the milestone file
- Flag anything that needs user approval (destructive migrations, public API contract breaks)
- Keep the PR scope to **one** milestone / packaging step

## Step 3 — IMPLEMENT

Act as **implementer** (`agents/implementer.md`):

- Honor north-star: HTTP API · Orchestrator worker · Playwright executor; adapters only under `@zero/cloud`
- Preserve pipeline order and product rules
- Prefer `ZERO_CLOUD=local` adapters so `npm start` still works without AWS
- Ask before destructive DB migrations or breaking `/api/runs` contracts
- For S3–S6, follow `prompts/packaging.md` and the matching `/zero-*` skill

## Step 4 — VERIFY

```bash
npm run workflow:verify -- --milestone S5
# or M1 … M7 / S0 … S6
```

Act as **verifier** (`agents/verifier.md`). Fix failures in-loop. Do not mark progress until verify exits 0.

## Step 5 — ADVANCE

Update `agent-workflow/progress.json` only after verify exits 0:

- Set that id `status` to `done` (under `milestones` or `packaging`)
- Set `completedAt` ISO timestamp
- Set `current` to the next unfinished packaging step (or `null` if S3–S6 done)
- Set `track` to `packaging` until S6 is done
- Append a short note under `history`
- Flip the matching row in `zero-docs/src/data/migration.ts` when status changes

## Step 6 — CONTINUE or STOP

- If user asked for a single step → stop and summarize what flipped.
- If user asked to run autonomously / “make target real” → loop from DETECT.
- Stop and ask when blocked (secrets, infra credentials, irreversible data loss).

## Hard stops (never bypass)

- Do not redesign the three-tier shape
- Do not put Playwright Chromium back in the HTTP API after S4
- Do not skip S3 to jump to images
- Do not import vendor SDKs outside `@zero/cloud`
- Do not serve `/artifacts` world-readable
- Apps never import sibling `apps/*`

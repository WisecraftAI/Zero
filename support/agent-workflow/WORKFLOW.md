# Autonomous agent loop

This is the state machine every coding agent must follow when advancing ZER0 toward the Target architecture. One milestone per loop iteration. No skipping.

Two tracks, in order:

1. **Capability** M1–M7 — probes are green. Do not re-implement.
2. **Packaging** S0–S7 — done.
3. **Product** Q1–Q5 — autonomous any-URL QA. Q1–Q4 done; **Q5 is open and is the active product milestone**.
4. **UX** U1–U3 — operator console. **U1–U3 done**. Q5 remains the active product milestone.

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

1. `support/zero-docs` — Target architecture, workspaces, M1–M7 / S0–S7 / Q1–Q4 done, Q5 open, **U1–U3 done**
2. `AGENTS.md` — conventions
3. `support/agent-workflow/progress.json`
4. If the user named a workspace → `prompts/repos/<name>.md` + `agents/repo-coder.md`
5. Else the spec for the detected id: `milestones/M{N}-*.md`, `milestones/S{N}-*.md`, `milestones/Q{N}-*.md`, or `milestones/U{N}-*.md`
6. Capability north-star: `prompts/target-arch.md`
7. Packaging north-star: `prompts/packaging.md`
8. Product north-star: `prompts/autonomous-qa.md`
9. UX north-star: `prompts/ui-ux.md` (U3 plan also mirrored in `support/zero-docs/src/data/uxStoreMilestone.ts`)

## Step 1 — DETECT

```bash
npm run workflow:status
```

Use the printed id (`M1`…`M7`, `S0`…`S7`, `Q1`…`Q5`, or `U1`/`U2`/`U3`). Order: earliest failing **M** → **S** → **Q** → **U**. When all probes pass and `current` is `null`, stop. Do not invent another milestone without an explicitly approved requirement. Today the active product step is `Q5`; UX U1–U3 is complete.

## Step 2 — PLAN

Act as **planner** (`agents/planner.md`):

- List concrete files to touch (prefer `services/` and `packages/`; avoid drive-by rewrites of all of `services/api/server.js`)
- List acceptance criteria from the milestone file
- Flag anything that needs user approval (destructive migrations, public API contract breaks)
- Keep the PR scope to **one** milestone / packaging step

## Step 3 — IMPLEMENT

Act as **implementer** (`agents/implementer.md`):

- Honor north-star: HTTP API · Orchestrator worker · Playwright executor; adapters only under `@zero/cloud`
- Preserve pipeline order and product rules
- Prefer `ZERO_CLOUD=local` adapters so `npm start` still works without AWS
- Ask before destructive DB migrations or breaking `/runs` (S7) contracts
- For S3–S6, follow `prompts/packaging.md` and the matching `/zero-*` skill
- For U1–U3, follow `prompts/ui-ux.md` and `/zero-web`; do not change APIs or the pipeline

## Step 4 — VERIFY

```bash
npm run workflow:verify -- --milestone S5
# or M1 … M7 / S0 … S7 / Q1 … Q5 / U1 … U3
# use S6 for a full completed-workflow verification
```

Act as **verifier** (`agents/verifier.md`). Fix failures in-loop. Do not mark progress until verify exits 0.

## Step 5 — ADVANCE

Update `support/agent-workflow/progress.json` only after verify exits 0:

- Set that id `status` to `done` (under `milestones`, `packaging`, `product`, or `ux`)
- Set `completedAt` ISO timestamp
- Set `current` to the next unfinished step on the active track
- Set `track` to `capability` | `packaging` | `product` | `ux`
- Append a short note under `history`
- Flip the matching row in `support/zero-docs/src/data/migration.ts` when status changes
- For U3, also flip `support/zero-docs/src/data/uxMilestone.ts` / `uxStoreMilestone.ts` status

## Step 6 — CONTINUE or STOP

- If user asked for a single step → stop and summarize what flipped.
- If user asked to run autonomously / “make target real” → loop from DETECT.
- If all M1–M7, S0–S7, Q1–Q5, and U1–U3 probes pass → stop and report complete.
- Stop and ask when blocked (secrets, infra credentials, irreversible data loss).

## Hard stops (never bypass)

- Do not redesign the three-tier shape
- Compose runtime services and images remain `api` / `zero-api`, `orchestrator` / `zero-orchestrator`, and `executor` / `zero-executor`
- Do not put Playwright Chromium back in the HTTP API after S4
- Do not skip S3 to jump to images
- Do not invent Azure as the only cloud; keep `ZERO_CLOUD=local|aws|gcp|azure|vercel`
- Do not put route / theme / wizard drafts into Redux during U3

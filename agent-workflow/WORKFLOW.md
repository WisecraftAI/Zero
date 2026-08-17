# Autonomous agent loop

This is the state machine every coding agent must follow when advancing ZER0 toward the Target architecture. One milestone per loop iteration. No skipping.

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

1. `public/architectureV2.html` — Target architecture, sequence, adapters, M1–M7
2. `docs/ARCHITECTURE.md` — gaps / current runtime
3. `AGENTS.md` — conventions
4. `agent-workflow/progress.json`
5. `agent-workflow/milestones/M{N}-*.md` for the detected milestone
6. `agent-workflow/prompts/target-arch.md`

## Step 1 — DETECT

```bash
npm run workflow:status
```

Use the printed milestone id (`M1`…`M7`). If all complete, stop and report acceptance status.

## Step 2 — PLAN

Act as **planner** (`agents/planner.md`):

- List concrete files to touch (prefer `lib/`, new routers/workers; avoid drive-by rewrites of all of `server.js`)
- List acceptance criteria from the milestone file
- Flag anything that needs user approval (destructive migrations, public API contract breaks)
- Keep the PR scope to **one milestone**

## Step 3 — IMPLEMENT

Act as **implementer** (`agents/implementer.md`):

- Honor north-star: API · Orchestrator · Execution farm; adapters only under `lib/cloud/*`
- Preserve pipeline order and product rules from the target-arch prompt
- Prefer `ZERO_CLOUD=local` adapters so `npm start` still works without AWS
- Ask before destructive DB migrations or breaking `/api/runs` contracts

## Step 4 — VERIFY

```bash
npm run workflow:verify -- --milestone M{N}
```

Act as **verifier** (`agents/verifier.md`). Fix failures in-loop. Do not mark progress until verify exits 0.

## Step 5 — ADVANCE

Update `agent-workflow/progress.json`:

- Set the milestone `status` to `done`
- Set `completedAt` ISO timestamp
- Set `current` to the next unfinished milestone (or `null` if M1–M7 done)
- Append a short note under `history`

Optionally update `docs/ARCHITECTURE.md` when behavior flips from “target” to “shipped”.

## Step 6 — CONTINUE or STOP

- If user asked for a single milestone → stop and summarize what flipped.
- If user asked to run autonomously / “until M4” / “make target real” → loop from DETECT.
- Stop and ask when blocked (secrets, infra credentials, irreversible data loss).

## Hard stops (never bypass)

- Do not redesign the three-tier shape
- Do not put Playwright Chromium back in the API process after M4
- Do not claim LLM agents are live until M6
- Do not serve `/artifacts` world-readable after M2/M5
- Do not skip M1 to jump to queues

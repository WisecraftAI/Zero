# ZER0 Target-Architecture Agent Workflow

Autonomous coding-agent workflow that drives this repo from **runtime today** to the **Target architecture** in [`public/architectureV2.html`](../public/architectureV2.html) (Production Blueprint tab · milestones **M1–M7**).

Do not invent a different cloud shape. Ground truth:

| Source | Role |
|--------|------|
| `public/architectureV2.html` | Target diagram, sequence, adapters, M1–M7, ship checklist |
| `docs/ARCHITECTURE.md` | Current vs target + production gaps |
| `AGENTS.md` | Layout, pipeline, conventions |
| `agent-workflow/progress.json` | Live milestone status for agents |

## Quick start (agent or human)

```bash
# 1. Detect earliest unfinished milestone
npm run workflow:status

# 2. In Cursor, invoke the skill and implement that milestone
#    /zero-target-arch

# 3. Re-run acceptance probes after the change
npm run workflow:verify
```

Docker instance (probes the bind-mounted repo, not a baked snapshot):

```bash
docker compose up --build workflow
# GET http://localhost:5175/health
# GET http://localhost:5175/status
# GET http://localhost:5175/verify?milestone=M1
```

Or tell the agent:

> Run `/zero-target-arch` and implement the next unfinished milestone until verify passes. Do not skip milestones.

## Layout

```
agent-workflow/
├── README.md                 ← this file
├── WORKFLOW.md               ← agent loop (plan → implement → verify → advance)
├── progress.json             ← milestone status (agents update this)
├── agents/                   ← role prompts (planner / implementer / verifier)
├── milestones/               ← M1–M7 specs + acceptance
├── prompts/target-arch.md    ← north-star prompt (from architectureV2)
└── scripts/
    ├── detect-milestone.js   ← probes codebase → earliest unfinished
    └── verify-milestone.js   ← acceptance checks for a milestone
```

## Cursor skill

Project skill: `.cursor/skills/zero-target-arch/` (mirrored under `.agents/skills/`).

Invoke with `/zero-target-arch` or ask to “advance the target architecture”.

## Milestone order (strict)

1. **M1** Durable store (Postgres)
2. **M2** Object store + signed URLs
3. **M3** Queue + orchestrator
4. **M4** Execution farm
5. **M5** Auth + ACL
6. **M6** LLM wiring
7. **M7** Multi-cloud adapters

Acceptance for “Target architecture is real” (from the blueprint): M1–M4 complete at minimum; M5–M7 planned or partially landed with gaps called out.

## Cloud adapters

Provider-agnostic contracts live in `lib/cloud/`. Domain/agent code must import those — never vendor SDKs directly. Wire via `ZERO_CLOUD=local|aws|gcp|azure|vercel`.

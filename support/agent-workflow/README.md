# ZER0 Target-Architecture Agent Workflow

Two tracks. Same loop. Do not invent a different cloud shape.

| Track | Ids | Status |
|-------|-----|--------|
| Capability | M1–M7 | Probes green. Do not re-implement. |
| Packaging | S0–S6 | Complete. Hardened boundary probes are green. |

Ground truth:

| Source | Role |
|--------|------|
| `support/zero-docs` | Target, sequence, workspaces, S0–S6 done/not-done |
| `AGENTS.md` | Layout, pipeline, conventions |
| `support/agent-workflow/progress.json` | Live status (`current`, `track`) |
| `prompts/packaging.md` | North-star for S3–S6 |
| `prompts/target-arch.md` | North-star for M1–M7 (frozen) |
| `prompts/repos/` | One coding contract per workspace |

## Quick start

```bash
# 1. Where are we? Prints M1–M7 and S0–S6.
npm run workflow:status

# 2. In Cursor:
#    /zero-target-arch          → verify completed target boundaries
#    /zero-api etc.             → change one workspace

# 3. After the change
npm run workflow:verify -- --milestone S6
```

Docker instance (probes the bind-mounted repo):

```bash
docker compose up --build workflow
# GET http://localhost:5175/status
# GET http://localhost:5175/verify?milestone=S6
```

## Layout

```
support/agent-workflow/
├── README.md
├── WORKFLOW.md               DETECT → PLAN → IMPLEMENT → VERIFY → ADVANCE
├── progress.json             M1–M7 + packaging S0–S6
├── agents/                   planner · implementer · verifier · repo-coder
├── milestones/
│   ├── M1-durable-store.md … M7-multi-cloud.md
│   └── S0-containerize.md … S6-cloud-providers.md
├── prompts/
│   ├── target-arch.md        capability north-star (done)
│   ├── packaging.md          packaging north-star (S3–S6)
│   └── repos/                one prompt per workspace
└── scripts/
    ├── detect-milestone.js   M* and S* probes
    ├── verify-milestone.js
    └── status-server.js
```

## Packaging order (strict)

1. **S0** Containerize — done
2. **S1** Smoke tests — done
3. **S2** Workspaces — done
4. **S3** Split routes from stages — done
5. **S4** Extract executor image — done · skill `/zero-executor`
6. **S5** Extract orchestrator image — done · skill `/zero-orchestrator`
7. **S6** Azure / Vercel + GATE-9 — done · skill `/zero-cloud`

The packaging workflow has no next milestone. Docker Compose exposes the runtime
tiers as `api`, `orchestrator`, and `executor`, with matching
`zero-api`, `zero-orchestrator`, and `zero-executor` image names. Run the status
or verification command after changing runtime boundaries; begin a new milestone
only when an explicitly approved target-architecture requirement is added.

Each workspace has three names: **Folder** · **npm package** · **Cursor skill**. See `prompts/repos/README.md`.

## Per-workspace coding

| Ask | Workspace | Skill | Prompt |
|-----|-----------|-------|--------|
| UI / React | Web UI | `/zero-web` | `prompts/repos/web.md` |
| HTTP / auth / SSE | HTTP API | `/zero-api` | `prompts/repos/api.md` |
| DAG / agents / LLM | Orchestrator worker | `/zero-orchestrator` | `prompts/repos/orchestrator.md` |
| Playwright jobs | Playwright executor | `/zero-executor` | `prompts/repos/executor.md` |
| Adapters | Cloud adapters | `/zero-cloud` | `prompts/repos/cloud.md` |

Router: `agents/repo-coder.md`.

## Cursor skill

`.cursor/skills/zero-target-arch/` (mirrored under `.agents/skills/`).

Invoke `/zero-target-arch` to verify or repair the completed target boundaries.

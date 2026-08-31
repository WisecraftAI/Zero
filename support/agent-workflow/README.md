# ZER0 Target-Architecture Agent Workflow

Two tracks plus product plus UX. Same loop. Do not invent a different cloud shape.

| Track | Ids | Status |
|-------|-----|--------|
| Capability | M1–M7 | Probes green. Do not re-implement. |
| Packaging | S0–S7 | Done. |
| **Product** | **Q1–Q5** | **Q1–Q4 done. `Q5` trustworthy site understanding is reopened — this is the active product track.** |
| **UX** | **U1–U3** | **U1–U3 done.** |

Ground truth:

| Source | Role |
|--------|------|
| `support/zero-docs` | Target, sequence, workspaces, M1–M7 / S0–S7 / Q1–Q4 done, Q5 open, **U1–U3 done** |
| `AGENTS.md` | Layout, pipeline, conventions |
| `support/agent-workflow/progress.json` | Live status (`current`, `track`) |
| `prompts/packaging.md` | North-star for S3–S7 |
| `prompts/autonomous-qa.md` | North-star for Q1–Q5 (any-URL QA) |
| `prompts/ui-ux.md` | North-star for U1–U3 (operator console + store) |
| `prompts/target-arch.md` | North-star for M1–M7 (frozen) |
| `prompts/repos/` | One coding contract per workspace |

## Quick start

```bash
# 1. Where are we? Prints M1–M7, S0–S7, Q1–Q5, and U1–U3.
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
├── progress.json             M1–M7 + S0–S7 + Q1–Q5 + U1–U3
├── agents/                   planner · implementer · verifier · repo-coder
├── milestones/
│   ├── M1-durable-store.md … M7-multi-cloud.md
│   ├── S0-containerize.md … S7-web-image.md
│   ├── Q1-deep-crawl.md … Q5-domain-subdomain.md
│   └── U1-professional-ui-ux.md
│       U2-low-friction-canvas.md
│       U3-redux-store.md
├── prompts/
│   ├── target-arch.md        capability north-star (done)
│   ├── packaging.md          packaging north-star (S3–S6)
│   ├── autonomous-qa.md      product north-star (Q1–Q5)
│   ├── ui-ux.md              UX north-star (U1–U3)
│   └── repos/                one prompt per workspace
└── scripts/
    ├── detect-milestone.js   M* · S* · Q* · U* probes
    ├── verify-milestone.js
    └── status-server.js
```

## Product order (autonomous any-URL QA) — Q5 open

1. **Q1** Deep crawl — multi-page site map · `/zero-analyzer` ✓
2. **Q2** Domain-driven major functional cases · `/zero-analyzer`, `/zero-orchestrator` ✓
3. **Q3** Execute discovered flows · `/zero-executor` ✓
4. **Q4** AI inference gate on low confidence · `/zero-orchestrator` ✓
5. **Q5** Trustworthy site understanding and test-plan quality · `/zero-analyzer`, `/zero-orchestrator` — **current**

Prompt: `prompts/autonomous-qa.md` · Spec: `milestones/Q5-domain-subdomain.md`

## UX order — U1–U3 done

1. **U1** Professional operator UI/UX · `/zero-web` — landmarks, tokens, theme ✓
2. **U2** Ultra-low-friction canvas · `/zero-web` — single-canvas New Run, hover rail ✓
3. **U3** Redux Toolkit store (RTK Query) · `/zero-web` — **done** — App only routes; SSE patches RTK cache

Prompt: `prompts/ui-ux.md` · Specs: `milestones/U1-*.md`, `U2-*.md`, `U3-redux-store.md`
Zero-docs: Next Milestone → **U3 Store** (`src/data/uxStoreMilestone.ts`)

## Packaging order (strict)

1. **S0** Containerize — done
2. **S1** Smoke tests — done
3. **S2** Workspaces — done
4. **S3** Split routes from stages — done
5. **S4** Extract executor image — done · skill `/zero-executor`
6. **S5** Extract orchestrator image — done · skill `/zero-orchestrator`
7. **S6** Azure / Vercel + GATE-9 — done · skill `/zero-cloud`
8. **S7** Web image split + `/api` prefix drop — done · skill `/zero-web`

Capability, packaging, and UX U1–U3 are complete. The product track is active at `Q5`. Runtime follow-ons (not new milestones): host-scoped `agent_memory`, split `llm/` modules, pathname SPA routes, Run Detail flow diagram. Run status/verify after boundary changes; begin a further milestone only when an explicitly approved requirement is added.

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

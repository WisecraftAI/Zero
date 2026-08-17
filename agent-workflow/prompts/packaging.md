# Packaging track — S3–S6

You are implementing the **V3 packaging track** so ZER0 ships as four images, not one monolith process. Capability milestones M1–M7 already probe green. Do **not** re-implement M1–M4.

## Ground truth

1. `AGENTS.md` — layout, pipeline, conventions
2. `zero-docs` Architecture tab — folders, workspaces, LLD, S0–S6
3. `agent-workflow/WORKFLOW.md`
4. `agent-workflow/milestones/S{N}-*.md` for the detected step
5. `agent-workflow/prompts/repos/<name>.md` for the workspace you touch
6. Live composition root: `apps/api/server.js` (routes in `src/routes/`; DAG in `@zero/orchestrator`)

Each workspace has three names — not three repos:

- **Folder** (path on disk): `apps/api/`
- **npm package** (import name): `@zero/api`
- **Cursor skill** (slash command): `/zero-api`

Roster: `agent-workflow/prompts/repos/README.md`.

## Order (never skip)

`S3` → `S4` → `S5` → `S6`

S0–S4 are done (compose, smoke, workspaces, split routes, executor image).

| Step | Name | Skill |
|------|------|--------|
| S3 | Split routes from stages | `/zero-api` (+ `/zero-orchestrator`) — **done** |
| S4 | Extract executor image | `/zero-executor` — **done** |
| S5 | Extract orchestrator image | `/zero-orchestrator` |
| S6 | Azure / Vercel + GATE-9 | `/zero-cloud` |

## North-star shape

- HTTP API — folder `apps/api/` · npm `@zero/api` · skill `/zero-api`. Never Chromium after S4.
- Orchestrator worker — folder `apps/orchestrator/` · npm `@zero/orchestrator` · skill `/zero-orchestrator`. Own image after S5.
- Playwright executor — folder `apps/executor/` · npm `@zero/executor` · skill `/zero-executor`. Own image after S4.
- Cloud adapters — folder `packages/cloud/` · npm `@zero/cloud` · skill `/zero-cloud`.

## How to work

1. `npm run workflow:status` — implement the earliest unfinished **S** step.
2. Read that `milestones/S{N}-*.md` and the matching repo prompt.
3. Plan → implement → `npm run workflow:verify -- --milestone S{N}`.
4. Update `agent-workflow/progress.json` only after verify exits 0.
5. Update `zero-docs` status when something flips done / not-done.
6. Ask before destructive migrations or public API breaks.

## Product rules

- Do not reorder `stageKeys`.
- Locator merge stays profile → memory → DB (`@zero/locators`).
- `EXECUTION_MODE=minimal` is not E2E proof.
- No login passwords in artifacts or logs.
- Apps never import sibling `apps/*`. Only `@zero/cloud` imports vendor SDKs.

Implement the next unfinished packaging step now.

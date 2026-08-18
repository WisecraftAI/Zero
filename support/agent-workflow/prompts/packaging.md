# Packaging track — S3–S6

You are implementing the **V3 packaging track** so ZER0 ships as four images, not one monolith process. Capability milestones M1–M7 already probe green. Do **not** re-implement M1–M4.

## Ground truth

1. `AGENTS.md` — layout, pipeline, conventions
2. `support/zero-docs` Architecture tab — folders, workspaces, LLD, S0–S6
3. `support/agent-workflow/WORKFLOW.md`
4. `support/agent-workflow/milestones/S{N}-*.md` for the detected step
5. `support/agent-workflow/prompts/repos/<name>.md` for the workspace you touch
6. Live composition root: `services/api/server.js` (routes in `src/routes/`; DAG in `@zero/orchestrator`)

Each workspace has three names — not three repos:

- **Folder** (path on disk): `services/api/`
- **npm package** (import name): `@zero/api`
- **Cursor skill** (slash command): `/zero-api`

Roster: `support/agent-workflow/prompts/repos/README.md`.

## Order (never skip)

`S3` → `S4` → `S5` → `S6`

S0–S6 are done. The workflow now verifies these boundaries; do not create a
new packaging step unless the target architecture is explicitly extended.

| Step | Name | Skill |
|------|------|--------|
| S3 | Split routes from stages | `/zero-api` (+ `/zero-orchestrator`) — **done** |
| S4 | Extract executor image | `/zero-executor` — **done** |
| S5 | Extract orchestrator image | `/zero-orchestrator` — **done** |
| S6 | Azure / Vercel + GATE-9 | `/zero-cloud` — **done** |

## North-star shape

- HTTP API — folder `services/api/` · npm `@zero/api` · skill `/zero-api`. Never Chromium after S4.
- Orchestrator worker — folder `services/orchestrator/` · npm `@zero/orchestrator` · skill `/zero-orchestrator`. Own image after S5.
- Playwright executor — folder `services/executor/` · npm `@zero/executor` · skill `/zero-executor`. Own image after S4.
- Cloud adapters — folder `packages/cloud/` · npm `@zero/cloud` · skill `/zero-cloud`.
- Compose names mirror the runtime tiers: service/image `api`/`zero-api`, `orchestrator`/`zero-orchestrator`, and `executor`/`zero-executor`.

## How to work

1. `npm run workflow:status` — implement the earliest unfinished **S** step, or stop when all probes pass.
2. Read that `milestones/S{N}-*.md` and the matching repo prompt.
3. Plan → implement → `npm run workflow:verify -- --milestone S{N}`.
4. Update `support/agent-workflow/progress.json` only after verify exits 0.
5. Update `support/zero-docs` status when something flips done / not-done.
6. Ask before destructive migrations or public API breaks.

## Product rules

- Do not reorder `stageKeys`.
- Locator merge stays profile → memory → DB (`@zero/locators`).
- `EXECUTION_MODE=minimal` is not E2E proof.
- No login passwords in artifacts or logs.
- Services never import sibling `services/*`. Only `@zero/cloud` imports vendor SDKs.

Verify or repair the completed packaging boundaries. If all probes pass, report
completion and do not invent another milestone.

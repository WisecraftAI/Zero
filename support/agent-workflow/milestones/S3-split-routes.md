# S3 — Split routes from stages

Carve the HTTP API composition root so routes live in files and the DAG walk lives in the Orchestrator worker. Same container, two clear halves — last step that is a pure refactor. Chromium may still launch in-process until S4.

## Depends on

S2. Capability M1–M7 probes stay green.

## Workspace

| | |
|--|--|
| **Workspace** | HTTP API |
| **Folder** | `services/api/` |
| **npm package** | `@zero/api` |
| **Cursor skill** | `/zero-api` |
| Also touch | Orchestrator worker · folder `services/orchestrator/` · npm `@zero/orchestrator` · skill `/zero-orchestrator` |

## Scope

- Move Express route handlers out of `services/api/server.js` into `services/api/src/routes/` (or `services/api/routes/`).
- `processRun` / stage walk must not be defined in `services/api/server.js`. Require it from `@zero/orchestrator`.
- `npm start` still boots one process. Do not add a second image yet.
- Do not remove `playwright` from `@zero/api` in this step (that is S4).

## Acceptance

- [x] At least two route modules under `services/api/src/routes/` or `services/api/routes/`
- [x] `services/api/server.js` does not contain `async function processRun`
- [x] Orchestrator worker owns the DAG (`processRun` / `stageKeys` walk in `services/orchestrator/`)
- [x] `npm start` still runs; smoke test still passes
- [x] `npm run workflow:verify -- --milestone S3` exits 0

## Out of scope

- Separate Docker images (S4 / S5)
- Azure / Vercel adapters (S6)
- Rewriting agent behavior

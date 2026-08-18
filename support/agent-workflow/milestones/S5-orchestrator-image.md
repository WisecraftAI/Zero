# S5 — Extract the orchestrator image

Orchestrator worker is its own long-lived process. HTTP API returns immediately after publishing `runs.requested` and relays SSE from cache/Redis.

## Depends on

S4.

## Workspace

| | |
|--|--|
| **Workspace** | Orchestrator worker |
| **Folder** | `services/orchestrator/` |
| **npm package** | `@zero/orchestrator` |
| **Cursor skill** | `/zero-orchestrator` |

## Scope

- Add `services/orchestrator/Dockerfile` (Node alpine, **no** Playwright).
- Add a compose `orchestrator` service.
- Name the orchestrator image `zero-orchestrator`.
- `services/orchestrator/worker.js` must not `require("../api/server.js")`.
- HTTP API does not walk `stageKeys` in-request; it publishes and streams.

## Acceptance

- [x] `services/orchestrator/Dockerfile` exists
- [x] `docker-compose.yml` has an `orchestrator` service
- [x] The orchestrator service uses image `zero-orchestrator`
- [x] Orchestrator worker does not boot the HTTP API file
- [x] `npm run workflow:verify -- --milestone S5` exits 0

## Out of scope

- Azure / Vercel / GATE-9 (S6)
- Changing `stageKeys` order

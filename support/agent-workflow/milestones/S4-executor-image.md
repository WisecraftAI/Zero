# S4 — Extract the executor image

Playwright leaves the HTTP API image. Chromium runs only in the Playwright executor container on `execution.requested`.

## Depends on

S3.

## Workspace

| | |
|--|--|
| **Workspace** | Playwright executor |
| **Folder** | `services/executor/` |
| **npm package** | `@zero/executor` |
| **Cursor skill** | `/zero-executor` |

## Scope

- Add `services/executor/Dockerfile` (Playwright base image).
- Name the HTTP API compose service/image `api` / `zero-api`.
- Add a compose `executor` service that does **not** boot `services/api/server.js`.
- Name the executor image `zero-executor`.
- Remove `playwright` from `@zero/api` dependencies.
- `services/api/server.js` must not call `chromium.launch`.
- `services/executor/main.js` / `worker.js` consume `execution.requested` without requiring the HTTP API file.

## Acceptance

- [x] `services/executor/Dockerfile` exists
- [x] `docker-compose.yml` has an `api` service using image `zero-api`
- [x] `docker-compose.yml` has an `executor` service
- [x] The executor service uses image `zero-executor`
- [x] `@zero/api` `package.json` has no `playwright` dependency
- [x] `services/api/server.js` has no `chromium.launch`
- [x] `npm run workflow:verify -- --milestone S4` exits 0

## Out of scope

- Orchestrator as its own image (S5)
- Changing TC execution semantics (`EXECUTION_MODE=minimal` stays the default)

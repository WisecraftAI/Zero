# S4 — Extract the executor image

Playwright leaves the HTTP API image. Chromium runs only in the Playwright executor container on `execution.requested`.

## Depends on

S3.

## Workspace

| | |
|--|--|
| **Workspace** | Playwright executor |
| **Folder** | `apps/executor/` |
| **npm package** | `@zero/executor` |
| **Cursor skill** | `/zero-executor` |

## Scope

- Add `apps/executor/Dockerfile` (Playwright base image).
- Add a compose `executor` service that does **not** boot `apps/api/server.js`.
- Remove `playwright` from `@zero/api` dependencies.
- `apps/api/server.js` must not call `chromium.launch`.
- `apps/executor/main.js` / `worker.js` consume `execution.requested` without requiring the HTTP API file.

## Acceptance

- [ ] `apps/executor/Dockerfile` exists
- [ ] `docker-compose.yml` has an `executor` service
- [ ] `@zero/api` `package.json` has no `playwright` dependency
- [ ] `apps/api/server.js` has no `chromium.launch`
- [ ] `npm run workflow:verify -- --milestone S4` exits 0

## Out of scope

- Orchestrator as its own image (S5)
- Changing TC execution semantics (`EXECUTION_MODE=minimal` stays the default)

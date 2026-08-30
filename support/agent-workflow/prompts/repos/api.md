# HTTP API — coding prompt

**Workspace:** HTTP API  
**Folder:** `services/api/`  
**npm package:** `@zero/api`  
**Cursor skill:** `/zero-api`

## Purpose

Stateless HTTP intake. Auth, validate, persist metadata, presign uploads, publish `runs.requested`, stream SSE. **Never launches Chromium.**

## Design patterns

- Ports & adapters — talk to infra only through `@zero/cloud`
- Middleware pipeline: requestId → helmet → cors → rateLimit → auth → validate → route
- Transactional outbox for `runs.requested` (target; today publish after insert)
- Config-once: do not sprinkle new `process.env` reads through handlers

## You may change

- Route handlers and HTTP middleware
- SSE hub (`GET /runs/:id/stream`)
- Presign + commit paths
- Cooperative `POST /runs/:id/stop` (does not unwind in-flight Chromium)

## You must not

- `require('playwright')` or launch a browser
- Import vendor SDKs (`@aws-sdk`, `@google-cloud`) — go through `@zero/cloud`
- Serve `/artifacts` as static files
- Accept spoofable `X-User-Email` as identity

## Honour

- `ZERO_AUTH=on` in production; verified API key or Bearer JWT
- Tenant-scoped `qa_runs` reads/writes
- Ask before breaking `POST /runs` or `POST /runs/:id/commit` (no `/api` prefix since S7)
- `createRun` selects `webAnalyzer` whenever there is no TC file; BA notes never suppress it
- PDF download is rendered in `src/reports/runPdfReport.js`. The headline verdict is `releaseGate` from the automated pass rate (`>= 95%` Full pass, `85–94%` Conditional pass, `< 85%` or unscored Manual check). The Manager agent's Go / Conditional Go / Hold label is a secondary signal only. Query: `?theme=<data-theme id>` and `?paper=light`

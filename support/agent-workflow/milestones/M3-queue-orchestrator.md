# M3 — Queue + orchestrator

Extract `processRun` into a worker that consumes `runs.requested`. API returns immediately; progress via cache pub/sub → SSE.

## Depends on

M1 + M2.

## Scope

- `Queue` adapter in `lib/cloud/` (`local` in-process/file queue acceptable for dev).
- API `POST /api/runs`: persist + publish `runs.requested` + return; do not await full pipeline.
- Worker entrypoint (e.g. `workers/orchestrator.js` or `lib/orchestrator/`) runs BA → Manual → Automation → (publishes execution) → Manager → Delivery.
- Redis/KV (`Cache`) for run state + SSE fan-out across API replicas (`local` memory pub/sub OK for single-node).
- Cap concurrency for orchestrator jobs.

## Out of scope

- Playwright farm isolation (M4) — orchestrator may still call execution inline until M4, but must be queue-triggered
- Auth (M5)

## Acceptance

- [ ] `runs.requested` (or equivalent topic) exists and is published on run create
- [ ] API request does not block until Manager/Delivery complete
- [ ] SSE or polling reflects stage transitions from shared state (not only in-process Map)
- [ ] Domain code uses `lib/cloud` queue — no vendor SDK in agents
- [ ] `npm run workflow:verify -- --milestone M3` exits 0

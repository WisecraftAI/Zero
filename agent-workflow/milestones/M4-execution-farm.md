# M4 — Execution farm

Playwright runs in isolated jobs behind `execution.requested`. Fan-out per TC batch; retries via queue; concurrency caps.

## Depends on

M3.

## Scope

- Separate execution worker / job runner (container-ready).
- Orchestrator publishes `execution.requested` batches; does not `chromium.launch()` in the API process.
- Screenshots/traces → object store; learned locators → Postgres.
- Concurrency limits + retry on queue failure.
- Keep `EXECUTION_MODE=minimal` honest (URL load ≠ release proof).

## Acceptance

- [ ] API process path does not launch Playwright for normal runs
- [ ] Execution consumed from queue topic `execution.requested` (or equivalent)
- [ ] Fan-out / batching documented; retries exist
- [ ] `npm run workflow:verify -- --milestone M4` exits 0

## Floor note

M1–M4 complete = blueprint “Target architecture is real” minimum. Call out M5–M7 gaps explicitly.

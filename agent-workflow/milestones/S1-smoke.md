# S1 — Smoke tests

Jest boots the app, starts a run, and (when Postgres is up) asserts a `qa_runs` row. Without that, later splits are unverifiable.

## Status

**Done.** `test/smoke.test.js` exists; `npm test -- --testPathPattern=smoke` is the local check.

## Depends on

S0.

## Acceptance

- [x] `test/smoke.test.js` exists
- [x] `npm run workflow:verify -- --milestone S1` exits 0

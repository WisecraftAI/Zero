# M1 — Durable store

Restore real Postgres persistence. Kill durability dependence on in-memory Maps.

## Why first

Queues and object storage need a durable run row (`qa_runs`) and locator tables. Nothing else in the blueprint works while `databaseConfigured()` always returns `false`.

## Scope

- Restore `databaseConfigured()` / `initDatabase()` in `server.js` (or extracted `lib/db` bootstrap) so `DATABASE_URL` actually enables Postgres.
- Add missing DDL for `qa_runs` and `qa_assets` in `lib/db.js` (today `persistAssets` references `qa_assets` but DDL is missing).
- Ensure `element_locators`, `element_logs`, `projects`, `stored_scripts`, `recordings`, `provider_keys`, `agent_settings` remain creatable.
- Persist runs to Postgres (not only `artifacts/<id>/run.json` + Map). Map may remain as a cache, not source of truth.
- Keep login passwords out of DB/artifacts (`runSecrets` / secrets adapter only).

## Out of scope

- Object store / presigned URLs (M2)
- Queue extraction of `processRun` (M3)
- Auth (M5)

## Touch preferentially

- `lib/db.js`
- `server.js` (`databaseConfigured`, `initDatabase`, run load/save paths)
- `.env.example` (placeholder `DATABASE_URL`, never real hostnames)
- `docs/ARCHITECTURE.md` (mark durable store shipped when done)

## Acceptance

- [ ] `databaseConfigured()` is not hard-coded `return false`
- [ ] `qa_runs` and `qa_assets` DDL exist in `lib/db.js`
- [ ] With `DATABASE_URL` set, `initDatabase()` creates tables (or no-ops cleanly when unset in local-file mode — document which)
- [ ] Creating a run writes a durable row (or equivalent) that survives process restart when DB is configured
- [ ] `npm run workflow:verify -- --milestone M1` exits 0

## Probe signals (`detect-milestone.js`)

Fails M1 while any of:

- `server.js` contains `function databaseConfigured() { return false; }`
- `lib/db.js` lacks `qa_runs` or `qa_assets` table DDL

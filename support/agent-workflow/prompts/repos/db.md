# Postgres helpers — coding prompt

**Workspace:** Postgres helpers  
**Folder:** `packages/db/`  
**npm package:** `@zero/db`  
**Cursor skill:** `/zero-db`

## Purpose

Postgres pool, table names, versioned migrations. The one place that knows DDL.

## Design patterns

- Repository helpers (`upsertRun`, `replaceAssets`, locator queries, `upsertAgentMemory`)
- Forward + reversible migrations (today `CREATE TABLE IF NOT EXISTS` plus `runPendingMigrations`)

## You may change

- `packages/db` schema and helpers
- `lib/memory.js` + `migrations/002_agent_memory.sql`

## You must not

- Store login passwords
- Store taxonomy / `classification` keys in `agent_memory` (Q5)
- Hard-disable `databaseConfigured()` again
- Hand-edit production SQL outside a migration

## Honour

- Tables: `qa_runs`, `qa_assets`, `element_locators`, `provider_keys`, `agent_settings`, `agent_memory`, …
- Init when `DATABASE_URL` or `PGHOST` is set; memory fallback when unset
- Ten tables; the only enforced FK is `qa_assets.run_id → qa_runs(id)`

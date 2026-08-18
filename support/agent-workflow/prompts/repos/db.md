# Postgres helpers — coding prompt

**Workspace:** Postgres helpers  
**Folder:** `packages/db/`  
**npm package:** `@zero/db`  
**Cursor skill:** `/zero-db`

## Purpose

Postgres pool, table names, versioned migrations. The one place that knows DDL.

## Design patterns

- Repository helpers (`upsertRun`, `replaceAssets`, locator queries)
- Forward + reversible migrations (V3; today `CREATE TABLE IF NOT EXISTS`)

## You may change

- `packages/db` schema and helpers

## You must not

- Store login passwords
- Hard-disable `databaseConfigured()` again
- Hand-edit production SQL outside a migration

## Honour

- Tables: `qa_runs`, `qa_assets`, `element_locators`, `provider_keys`, `agent_settings`, …
- Init when `DATABASE_URL` or `PGHOST` is set; memory fallback when unset

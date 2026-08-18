# Locator registry — coding prompt

**Workspace:** Locator registry  
**Folder:** `packages/locators/`  
**npm package:** `@zero/locators`  
**Cursor skill:** `/zero-locators`

## Purpose

Locator merge and element-key normalizer. Used by orchestrator (build) and executor (upsert learned).

## Design patterns

- Chain of responsibility: profile → memory → DB
- Pure merge; persist only at the edges

## You may change

- Merge logic, key normalization, ecommerce selector library

## You must not

- Change merge **order**
- Import Express or cloud SDKs
- Drop the DB branch when `DATABASE_URL` is set

## Honour

- `packages/locators/elementLogger.js` is the only key normalizer
- Learned selectors should persist per `(tenant, host, key)` — today the hot path is still a process Map

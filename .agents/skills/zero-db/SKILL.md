---
name: zero-db
description: >-
  Code ZER0 Postgres helpers in packages/db (@zero/db): qa_runs, qa_assets,
  element_locators, provider_keys, migrations, and sanitizeRunInput. Use
  whenever the user asks to update Postgres, DDL, run persistence,
  databaseConfigured, or @zero/db. Prefer this over API skills when the
  change is schema or repository helpers — not HTTP handlers.
---

# @zero/db

Postgres pool helpers and DDL. The one place that knows table names. Init when `DATABASE_URL` or `PGHOST` is set; callers fall back to memory + `dist/artifacts` when unset or unreachable.

## When this skill owns the task

Stay inside `packages/db/` for schema, migrations, and repository functions.

Escalate instead of stretching this package when the ask is:

- When to persist a run → API / orchestrator / executor `runStore`
- Locator *merge* → `@zero/locators` (this package only stores rows)

Read `support/agent-workflow/prompts/repos/db.md` before editing.

## Layout

```
packages/db/
  index.js                 # public helpers
  runStore.js              # createRunStore({ cloud }) — memory Map + file + optional Postgres
  lib/config.js            # isDatabaseConfigured
  lib/sanitize.js          # strip loginPassword / buffers before persist
  lib/runs.js / assets.js / elements.js / projects.js / providers.js
  lib/schema/tables.js     # CREATE TABLE IF NOT EXISTS strings
  lib/schema/init.js       # initAllTables
  lib/schema/migrate.js    # runPendingMigrations
```

`isDatabaseConfigured()` is `Boolean(env.DATABASE_URL || env.PGHOST)`. Do not hard-disable it.

## Tables (`lib/schema/tables.js`)

| Table | Role |
|-------|------|
| `qa_runs` | Run snapshot JSON columns + `tenant_id` |
| `qa_assets` | Named artifacts per run |
| `projects` / `stored_scripts` / `recordings` | Guided-mode extras |
| `element_locators` / `element_logs` | Learned selectors (unique `host, element_key, selector_value`) |
| `provider_keys` | Encrypted LLM keys (`user_email`, `provider`) |
| `agent_settings` | Per-agent provider/model/prompt |

Q5 may add `site_classification` (host → domain/sub-domain, TTL). Put it here, not ad-hoc in the API.

Today init is still `CREATE TABLE IF NOT EXISTS` plus `runPendingMigrations`. Prefer a versioned migration over hand-editing production SQL.

## Public helpers

`initAllTables`, `upsertRun` / `getRunById` / `listRunRows`, `replaceAssets` / `listAssetsByRunId`, `upsertLocator` / `getLocatorsByHost`, `insertElementLog`, project/script/recording helpers, `listProviderKeys` / `upsertProviderKey` / `getEncryptedProviderKey`, `listAgentSettings` / `upsertAgentSettings`.

`@zero/db/runStore` is the shared Map+file+DB facade used by API, orchestrator, and executor. Do not fork a second store.

## Invariants

- **Never store login passwords.** `sanitizeRunInput` deletes `loginPassword` / `password` / `tcFileBuffer` and strips `login.password`. Call it before `upsertRun`.
- Encrypted provider keys stay encrypted in this package; decrypt only in the orchestrator.
- Do not import Express or Playwright.

## How to change

1. New column/table → `tables.js` + `init.js` (and a migration if you need existing DBs).
2. New query → the matching `lib/*.js` repository, re-export from `lib/index.js`.
3. Persistence behaviour shared across processes → `runStore.js`.

```bash
npm test -- test/db.config.test.js test/db.persist.test.js
```

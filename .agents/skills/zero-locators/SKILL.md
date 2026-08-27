---
name: zero-locators
description: >-
  Code ZER0 locator merge in packages/locators (@zero/locators): profile →
  memory → DB candidate lists, element-key normalization, and e-commerce
  domain selectors. Use whenever the user asks to update locators, selectors,
  element keys, elementLogger, ecommerceSelectors, or @zero/locators.
  Prefer this over builders or executor skills when the change is merge or
  key shape — not emitted spec text or Chromium.
---

# @zero/locators

Locator merge and element-key normalizer. Orchestrator uses it to build specs; executor upserts learned selectors. Pure merge; persist only at the edges via `@zero/db`.

## When this skill owns the task

Stay inside `packages/locators/` for merge, key normalization, and the e-commerce selector library.

Escalate instead of stretching this package when the ask is:

- Profile *contents* (which CSS strings a channel ships) → `@zero/domain` `appProfiles`
- Interpolating selectors into Playwright/Java text → `@zero/builders`
- HTTP `/element-log` → `@zero/api` (it should call `processElementLog` here)

Read `support/agent-workflow/prompts/repos/locators.md` before editing.

## Layout

```
packages/locators/
  index.js
  locatorRegistry.js       # thin re-export of merge
  elementLogger.js         # thin re-export of processElementLog
  ecommerceSelectors.js    # thin re-export of ecommerce runtime
  lib/merge/registry.js    # mergeSelectorCandidates, getMergedSelectors, hydrateSelectorMemory
  lib/elements/            # keys, parser, logger
  lib/ecommerce/           # detectDomain + per-shop selector maps
  lib/shared/url.js        # hostFromUrl
```

Keep the root files as one-line re-exports so `@zero/locators/locatorRegistry` etc. stay stable.

## Public API

| Export | Use |
|--------|-----|
| `mergeSelectorCandidates(host, profile, memory, dbLocatorsByKey)` | Concatenate **DB, then memory, then profile**, unique, cap 10. First-match prefers learned over profile fallbacks. |
| `getMergedSelectors(pool, host, profile, memory)` | Same, loading DB via `getLocatorsByHost` when `pool` is set. |
| `hydrateSelectorMemory(pool, memoryMap, host)` | Prefill the in-process Map from Postgres. |
| `normalizeElementKey` / `ELEMENT_KEYS` | Only through `lib/elements/keys.js` (`elementLogger.js`). |
| `processElementLog` / `parseElementEntry` | Recorder / `/element-log` intake. |
| `detectDomain` / `getSelectors` / `getDomainConfig` | E-commerce maps (`flipkart`, `amazon`, `generic`, …). |

## Merge order

Do not reverse the candidate list. Tests lock: `["button.db", "button.memory", "button.profile"]`.

Do not reverse this to profile-first without a product ask and a test change. Dropping the DB branch when `DATABASE_URL` is set is a bug.

Learned selectors should persist per `(tenant, host, key)`; the hot path is still a process `Map` plus optional Postgres.

## Invariants

- `elementLogger` / `normalizeElementKey` is the only key normalizer. Do not invent a second mapping in builders or executor.
- Do not import Express or cloud SDKs. `@zero/db` is allowed for the DB merge branch.
- E-commerce selector maps are data; builders call `loadEcommerceConfig` / `@zero/locators/ecommerceSelectors` rather than hard-coding shop CSS.

## How to change

1. Merge / cap → `lib/merge/registry.js` + `test/locators.test.js`.
2. New element key → `lib/elements/keys.js` and the profile objects that should ship a default.
3. New shop → `lib/ecommerce/selectors.js` + `detectDomain` hostname match.

```bash
npm test -- test/locators.test.js
```

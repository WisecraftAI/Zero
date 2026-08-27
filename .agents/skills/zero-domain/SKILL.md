---
name: zero-domain
description: >-
  Code ZER0 shared contracts in packages/domain (@zero/domain): stageKeys,
  appProfiles, execution modes, run-input schemas, and output roots. Use
  whenever the user asks to update domain types, stage keys, channel
  profiles, EXECUTION_MODE, normalizeTargetUrl, or @zero/domain. Prefer
  this over orchestrator or analyzer skills when the change is a shared
  enum/schema — not crawl, DAG walk, or HTTP.
---

# @zero/domain

Shared kernel: stage keys, OTT channel profiles, execution-mode resolution, id/url helpers. **No I/O.** No Express, Playwright, `pg`, or vendor SDKs. Do not read `process.env` for connections.

## When this skill owns the task

Stay inside `packages/domain/` so `@zero/api` and `@zero/orchestrator` (and executor) import the same enums.

Escalate instead of stretching this package when the ask is:

- Website *type* / sub-domain taxonomy (Q5) → `@zero/analyzer` `WEBSITE_TYPES` / `SUB_DOMAINS`
- How a stage *runs* → orchestrator / executor
- Locator maps on a profile → you may add selector strings here; merge logic stays in `@zero/locators`

Read `support/agent-workflow/prompts/repos/domain.md` before editing.

## Layout

```
packages/domain/
  index.js                 # public surface
  execution.js             # requestExecution + topic names
  outputRoots.js           # dist/{web,artifacts,coverage,logs}
  lib/stages.js            # stageKeys
  lib/profiles.js          # appProfiles
  lib/executionModes.js
  lib/schemas.js           # validateRunInput
  lib/targetUrl.js         # normalizeTargetUrl
  lib/outputRoots.js
```

## Public API

| Export | Use |
|--------|-----|
| `stageKeys` | `webAnalyzer`, `ba`, `manualQa`, `automationQa`, `execution`, `accessibility`, `performance`, `security`, `manager`, `delivery` |
| `optionalStageKeys` | currently `accessibility`, `performance` (security is still in `stageKeys`; do not silently drop it) |
| `RUNS_REQUESTED` | `"runs.requested"` |
| `appProfiles` | OTT: `gray`, `tvnz`, `aha`, `hotstar`, `primevideo`, `default` (Generic OTT). Non-OTT: `retail_store`, `ecommerce`, `healthcare`, `corporate`, `banking`, `food_delivery`, `travel`, `education`, `news_media`. Each has modules, journeys, `selectorCandidates`. |
| `EXECUTION_MODES` / `resolveExecutionMode` | `minimal`, `full`, `discovered_flows`, `uploaded_tc_only`; `url_analysis_auto` aliases `discovered_flows` |
| `validateRunInput` | Pure helper (zod-free). Requires `ottUrl` plus figma/notes/tc. **API intake is looser** — URL-only is allowed when `testCaseInputMode=auto` or `url_analysis_auto`. Do not “fix” the API by enforcing this schema on autonomous runs. |
| `normalizeTargetUrl` | Shared URL cleanup (UI preview + ingest) |
| `outputRoots` | Override with `ZERO_DIST_ROOT` |
| `@zero/domain/execution` | `EXECUTION_REQUESTED` / `EXECUTION_COMPLETED`, `requestExecution(queue, job)` (publish + wait + timeout) |

## Invariants

- **Do not reorder `stageKeys`.** Adding a key is a product ask; inserting in the middle breaks `processRun` and the UI pipeline.
- Do not invent channel profiles without a product ask.
- Execution-mode resolution: explicit `uploaded_tc_only` / `discovered_flows` win; else `EXECUTION_MODE=full` in env; else `minimal`.
- This package is not the website-type taxonomy. Analyzer owns `WEBSITE_TYPES`.

## How to change

1. New stage → `lib/stages.js` then orchestrator `processRun` and web pipeline UI in the same change set.
2. New profile → `lib/profiles.js` with the same selector keys other profiles already use (`playCta`, `contentCard`, …).
3. New execution mode → `lib/executionModes.js` **and** executor `jobs.js`.
4. Keep `package.json` `exports` in sync (`./execution`, `./outputRoots`, `./schemas`).

```bash
npm test -- test/domain.test.js test/packaging.boundaries.test.js
```

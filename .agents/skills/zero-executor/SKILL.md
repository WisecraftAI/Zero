---
name: zero-executor
description: >-
  Code ZER0 Playwright jobs in services/executor (@zero/executor): Chromium
  launch, execution modes, webAnalyzer job, discovered_flows, screenshots,
  and optional a11y/perf/security passes. Use whenever the user asks to
  update execution, jobs.js, browser.js, headed Chromium, CMS capture, or
  @zero/executor. Prefer this over analyzer or builders skills when the
  change is launching a browser or running a job — not crawl internals or
  spec-string emitters.
---

# @zero/executor

Ephemeral Playwright worker. Consumes `execution.requested`. One browser context per job; close in `finally`. **No HTTP server.** `npm start` → `main.js`.

## When this skill owns the task

Stay inside `services/executor/` for job kinds, launch flags, step players, and object-store upload of screenshots.

Escalate instead of stretching this service when the ask is:

- Crawl / classify / BRD shape → `@zero/analyzer` (this service *calls* it)
- Spec text or discovered-flow *closures* → `@zero/builders`
- When to enqueue a job → `@zero/orchestrator`
- HTTP → `@zero/api`

Read `support/agent-workflow/prompts/repos/executor.md` before editing.

## Layout

```
services/executor/
  main.js          # boot: db + cloud + startExecutionWorker({ runJob })
  worker.js        # subscribe execution.requested; retries + concurrency
  jobs.js          # createJobs(deps) — generateWebAnalysis / execution / a11y / perf / security
  browser.js       # chromium launch, resolveHeadless, RUN_HEADED
  cmsCapture.js    # cms-screenshot / cms-bulk (no full run DAG)
```

Caps: `ZERO_EXEC_CONCURRENCY` (default 2), `ZERO_EXEC_ATTEMPTS` (default 2).

## Job kinds (`main.js` `runJob`)

| `job.kind` | Handler |
|------------|---------|
| `webAnalyzer` | `jobs.generateWebAnalysis` — apply `ANALYZER_BROWSER_CONTEXT`, `analyzeUrlPro`, persist `webAnalysis` |
| `execution` (default) | `jobs.generateExecutionReport` |
| `accessibility` / `performance` / `security` | optional Playwright passes |
| `cms-screenshot` / `cms-bulk` | `cmsCapture.js` — does not need a full run snapshot |

Orchestrator publishes; this worker is the only subscriber that should call Playwright.

## Execution modes (`@zero/domain` `resolveExecutionMode`)

| Mode | Behaviour |
|------|-----------|
| `minimal` (default) | Load URL, wait for `body`, screenshot. Completes reliably. **Not E2E proof.** |
| `full` | Keyword/selector navigation. Brittle; opt-in via `EXECUTION_MODE=full`. |
| `discovered_flows` (`url_analysis_auto`) | `@zero/builders/playwright/discoveredFlows` `buildDiscoveredFlowTests` on an already-open page. Caps at 5 flows. |
| `uploaded_tc_only` | Drive from uploaded CSV/manual cases. |

`RUN_HEADED=true` or UI “Show browser” → `browser.js` `wantsHeaded`. Login secrets come from cache `runSecret.${runId}` at runtime; never log the password; skip typing secrets in discovered flows (builders already skip sensitive `input` steps).

## Browser lifecycle

- `launch` / `newContext` / `newPage` in the job; `browser.close()` in `finally`.
- `resolveHeadless`: headed only if `runHeaded` / `RUN_HEADED` **and** `DISPLAY` is set. The Docker executor has no X11 — “Show browser” is ignored there.
- Analyzer jobs **must** use `@zero/analyzer` `ANALYZER_BROWSER_CONTEXT` (desktop UA, `en-IN`, geolocation) and persist `webAnalysis.domainClassification` beside `baInsights`. Playwright's default headless UA is treated as a bot by grocery SPAs and yields a thin crawl.
- Upload screenshots/traces via `@zero/cloud` object store. Do not leave files only on a local disk that other services must read.
- Learned locators: upsert through `@zero/locators` / `@zero/db` at the job edge.

## Invariants

- No Express routes.
- Do not claim `EXECUTION_MODE=minimal` is E2E proof.
- Do not persist login passwords.
- Import discovered flows via `@zero/builders/playwright/discoveredFlows`, not a deep `lib/` path.

## How to change

1. Launch flags / headed → `browser.js`.
2. What a kind *does* → `jobs.js` (keep `createJobs(deps)` injectable for tests).
3. Retry/concurrency → `worker.js` only.
4. New kind → `main.js` `runJob` branch **and** an orchestrator enqueue site.

```bash
npm test -- test/execution.worker.test.js test/flow-execution.test.js test/packaging.boundaries.test.js
```

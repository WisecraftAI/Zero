# Playwright executor — coding prompt

**Workspace:** Playwright executor  
**Folder:** `services/executor/`  
**npm package:** `@zero/executor`  
**Cursor skill:** `/zero-executor`

## Purpose

Ephemeral Playwright job. One browser context per batch. Upload screenshots. Upsert learned locators. **No HTTP server.**

## Design patterns

- Worker / job on `execution.requested`
- Semaphore (`ZERO_EXEC_CONCURRENCY`)
- Command objects per step (navigate, click, type, wait, screenshot)
- Always `browserContext.close()` in `finally`

## You may change

- Job runner, browser launch flags, step players, optional a11y/perf/security *passes*
- Object-store upload of screenshots/traces
- Learned-locator upsert

## You must not

- Expose Express routes
- Write screenshots only to a local folder that other services must read (use object store)
- Log login passwords
- Claim `EXECUTION_MODE=minimal` is E2E proof

## Honour

- Default mode stays `minimal` (URL + body + screenshot)
- `full` is opt-in and brittle
- Caps: `ZERO_EXEC_CONCURRENCY`, `ZERO_EXEC_ATTEMPTS`

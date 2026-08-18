# Q3 — Execute discovered flows (beyond minimal load)

Wire analyzer-generated flows into Playwright execution so URL-only runs **run** major functional checks, not just load the homepage and wait.

## North star

Top N critical flows from `webAnalysis` become executable Playwright steps with pass/fail and screenshots.

## Depends on

Q2 (major functional test cases / userFlows with steps). M4 execution farm.

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| Execution contract | `packages/domain/lib/execution.js` | `/zero-domain` |
| Flow runner | `services/executor/jobs.js`, `browser.js` | `/zero-executor` |
| Step builder | `packages/builders/` (if shared step emit) | `/zero-builders` |

## Scope

- Add execution mode `discovered_flows` (or extend `full`) derived automatically when URL-only + webAnalysis present:
  - Run top **3–5 Critical** flows from `userFlows` or major functional cases
  - Steps: navigate, verify visible, click (when selector resolved from crawl), input (non-secret placeholders only)
  - Never submit real payment or post PII; skip steps tagged `requiresAuth` unless run secrets provided
- Map crawl element keys → selectors via `@zero/locators` merge (profile → memory → DB)
- `executionReport` includes per-flow results: `{ flowName, status, steps[], screenshot }`
- Default remains `EXECUTION_MODE=minimal` for uploaded CSV runs; auto URL runs use `discovered_flows`

## Acceptance

- [x] Executor runs ≥1 multi-step flow (not only `page.goto` + `waitForBody`) on analyzer fixture
- [x] `executionReport.totals` reflects flow step pass/fail counts
- [x] Screenshots captured per failed flow step under `dist/artifacts/`
- [x] `test/flow-execution.test.js` passes (unit or integration with mocked browser)
- [x] `npm run workflow:verify -- --milestone Q3` exits 0
- [x] Headless forced in Docker when `DISPLAY` unset (existing behavior preserved)

## Out of scope

- LLM self-healing locators
- Logged-in checkout on production sites

## Verify

```bash
npm test -- test/flow-execution.test.js
npm run workflow:verify -- --milestone Q3
```

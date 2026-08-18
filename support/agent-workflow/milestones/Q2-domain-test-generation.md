# Q2 — Domain-driven major functional test cases

Turn crawl + domain type into **major functional test cases** automatically when the user provides URL only (no CSV, no manual rows). Rules and templates first — not LLM.

## North star

Detected domain type + element evidence + user flows → P0/P1 manual test cases without human input.

## Depends on

Q1 (multi-page crawl artifact). Existing `WEBSITE_TYPES`, `lightFlows`, `generateCasesFromUrlAnalysis`.

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| Case generation | `packages/analyzer/lib/generate/` | `/zero-analyzer` |
| Pipeline merge | `services/orchestrator/pipeline.js` | `/zero-orchestrator` |
| UI copy (optional) | `web/src/views/NewRunView.jsx` | `/zero-web` |

## Scope

- Add `packages/analyzer/lib/generate/majorFunctionalCases.js`:
  - Input: `websiteType`, `userFlows`, `crawledPages`, `allElements`
  - Output: test cases `{ id, module, scenario, priority, steps[], expectedResult }` aligned to `testPriorities` / `criticalFlows`
  - Map each **Critical** user flow to at least one test case
  - Cap total cases (e.g. 12–20) ranked by priority
- Orchestrator: when `testCaseInputMode=auto` and no upload, prefer `majorFunctionalCases` output over generic template cases
- Expand `WEBSITE_TYPES` if needed: `SAAS`, `MARKETPLACE` (minimal priorities + critical flows)
- `consolidateRequirements` and `generateCasesFromUrlAnalysis` consume the same major-case list

## Acceptance

- [x] `majorFunctionalCases.js` exists and is called from analyzer output or orchestrator pipeline
- [x] URL-only auto run produces ≥5 test cases on a fixture e-commerce or corporate HTML
- [x] Cases reference detected flows (module names match flow names or priorities)
- [x] `test/domain-test-generation.test.js` passes
- [x] `npm run workflow:verify -- --milestone Q2` exits 0

## Out of scope

- LLM extra cases (existing Manual QA enrich remains optional)
- Playwright execution of cases (Q3)

## Verify

```bash
npm test -- test/domain-test-generation.test.js
npm run workflow:verify -- --milestone Q2
```

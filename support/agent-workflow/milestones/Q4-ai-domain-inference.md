# Q4 — AI domain inference gate (low-confidence sites)

When rule-based domain detection is uncertain, call the LLM **once** with a structured crawl snapshot to infer site purpose and major functional test areas. Templates remain the fallback when no key or LLM fails.

## North star

Long-tail / GENERIC URLs still get sensible major functional coverage without a human picking channel profile.

## Depends on

Q1 (rich crawl JSON), Q2 (case generation consumes inferred priorities). M6 (LLM wiring).

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| LLM agent + prompt | `services/orchestrator/llm/index.js` | `/zero-orchestrator` |
| Gate + merge | `services/orchestrator/processRun.js`, `pipeline.js` | `/zero-orchestrator` |
| Agents UI (optional) | `web/src/views/AgentsView.jsx` | `/zero-web` |

## Scope

- Add LLM agent `domainInference` in `PROMPT_VERSIONS`:
  - System: infer `{ domainLabel, confidence, testPriorities[], criticalFlows[], summary }` from crawl JSON only
  - Input capped ~6k chars: url, titles, nav labels, form purposes, element categories, rule-based type + confidence
- Orchestrator after Web Analyzer, **before** BA:
  - If `websiteTypeConfidence < 0.5` OR type is `GENERIC` → call `applyLlm('domainInference', ...)`
  - Merge result into `_webAnalysisInsights` (override or augment `testPriorities` / `criticalFlows`)
  - Stamp `metadata.llm` on insights; skip when `ZERO_LLM=off` or no key (keep rule-based output)
- Manual QA LLM enrich remains optional second pass; do not double-call on high-confidence rule matches
- Document in Agents UI: domain inference runs automatically (not a user-configured agent row) OR add read-only card

## Acceptance

- [x] `PROMPT_VERSIONS.domainInference` exists with version id
- [x] `processRun.js` gates call on confidence / GENERIC type
- [x] Low-confidence fixture run sets `webAnalysis.baInsights.inferredDomain` (or equivalent) when key present
- [x] Without key, pipeline completes unchanged (template path)
- [x] `test/domain-inference.test.js` passes (mock LLM provider)
- [x] `npm run workflow:verify -- --milestone Q4` exits 0

## Out of scope

- Local models (Ollama)
- Vision / screenshot LLM
- Replacing rule-based detection when confidence ≥ 0.5

## Verify

```bash
npm test -- test/domain-inference.test.js
npm run workflow:verify -- --milestone Q4
```

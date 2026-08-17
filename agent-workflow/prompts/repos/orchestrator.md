# Orchestrator worker — coding prompt

**Workspace:** Orchestrator worker  
**Folder:** `apps/orchestrator/`  
**npm package:** `@zero/orchestrator`  
**Cursor skill:** `/zero-orchestrator`

## Purpose

Long-lived DAG worker. Consume `runs.requested`, walk `stageKeys`, call LLM/templates, publish `execution.requested`, persist artifacts, publish state for SSE.

## Design patterns

- DAG walker over `stageKeys` (do not reorder)
- Strategy: one agent file, one `run(runId, ctx)`
- LLM facade (`@zero/orchestrator/llm`) + deterministic template fallback
- Idempotent writes on `(runId, stage)`

## You may change

- Stage agents (BA, Manual, Automation, Manager, Delivery, optional a11y/perf/security *orchestration*)
- Queue subscribe/publish wiring
- Prompt versions and cost/RPM caps

## You must not

- Launch Chromium here after S4 (execution belongs to `@zero/executor`)
- Import vendor cloud SDKs
- Persist login passwords into artifacts or Postgres
- Skip stages or invent a new pipeline order

## Honour

- `webAnalyzer? → ba → manualQa → automationQa → execution → a11y/perf/security? → manager → delivery`
- Locator merge stays in Locator registry (`@zero/locators`, folder `packages/locators/`)

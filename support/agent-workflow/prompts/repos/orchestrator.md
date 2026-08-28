# Orchestrator worker — coding prompt

**Workspace:** Orchestrator worker  
**Folder:** `services/orchestrator/`  
**npm package:** `@zero/orchestrator`  
**Cursor skill:** `/zero-orchestrator`

## Purpose

Long-lived DAG worker. Consume `runs.requested`, walk `stageKeys`, call LLM/templates, publish `execution.requested`, persist artifacts, publish state for SSE.

## Design patterns

- DAG walker over `stageKeys` (do not reorder)
- Strategy: one agent file, one `run(runId, ctx)` (templates still share `pipeline.js`)
- LLM facade (`@zero/orchestrator/llm`) + deterministic template fallback
- Host-scoped agentic memory (`agentMemory.js`) recalled into later LLM contexts
- Idempotent writes on `(runId, stage)`

## You may change

- Stage agents (BA, Manual, Automation, Manager, Delivery, optional a11y/perf/security *orchestration*)
- Queue subscribe/publish wiring
- Prompt versions and cost/RPM caps
- `llm/` modules (`index.js`, `providers.js`, `enrichment.js`, `prompts.js`, `utils.js`)
- `agentMemory.js` observation shape (never classification keys)

## You must not

- Launch Chromium here after S4 (execution belongs to `@zero/executor`)
- Import vendor cloud SDKs
- Persist login passwords into artifacts or Postgres
- Skip stages or invent a new pipeline order
- Cache taxonomy / `classification` keys in `agent_memory` (Q5)

## Honour

- `webAnalyzer? → ba → manualQa → automationQa → execution → a11y/perf/security? → manager → delivery`
- Locator merge stays in Locator registry (`@zero/locators`, folder `packages/locators/`)
- Memory helpers live in `@zero/db` (`upsertAgentMemory` / `getAgentMemoryByHost`)

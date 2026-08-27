---
name: zero-orchestrator
description: >-
  Code the ZER0 DAG worker in services/orchestrator (@zero/orchestrator):
  processRun stage walk, BA/Manual/Automation/Manager agents, LLM facade,
  domain inference, and execution.requested handoff. Use whenever the user
  asks to update the orchestrator, pipeline stages, inferDomain, applyLlm,
  prompt versions, ZERO_LLM caps, generateAutomationBundle, or
  @zero/orchestrator. Prefer this over executor or analyzer skills when the
  change is DAG order, templates, or LLM merge — not Chromium or crawl internals.
---

# @zero/orchestrator

Long-lived DAG worker. Consumes `runs.requested`, walks `stageKeys`, enriches templates via LLM when a decrypted key exists, publishes `execution.requested`, and persists artifacts for SSE. It does not launch Chromium.

## When this skill owns the task

Stay inside `services/orchestrator/` for stage order, agent templates, LLM merge, and queue subscribe/publish. There is no `agents/` folder — a stage is a `pipeline.js` template plus `applyLlm(agentName, …)`.

Escalate instead of stretching this service when the ask is:

- Crawl / taxonomy / case *shape* → `@zero/analyzer`
- Opening Chromium or running discovered flows → `@zero/executor`
- Spec *text* (Playwright/Java strings) → `@zero/builders`
- Locator merge → `@zero/locators`
- HTTP intake / SSE hub → `@zero/api`
- `stageKeys` enum itself → `@zero/domain`

Read `support/agent-workflow/prompts/repos/orchestrator.md` before editing.

## Layout

CommonJS. No Playwright. Infra only through `@zero/cloud`. Services never import sibling `services/*`.

```
services/orchestrator/
  worker.js            # npm start — subscribe runs.requested
  index.js             # startOrchestrator + createProcessRun
  processRun.js        # DAG walk (createProcessRun(deps))
  pipeline.js          # consolidateRequirements, cases, generateAutomationBundle, reports
  applyLlm.js          # per-run key/settings store → llm.enrichAgent
  inferDomain.js       # Q4/Q5 gate + merge + applyClassificationToArtifact
  llm/index.js         # OpenAI / Claude / Gemini + caps + prompt versions
  encryption.js        # decrypt provider keys (never log plaintext)
```

`ZERO_ORCH_CONCURRENCY` (default 2) caps in-flight `processRun` calls.

## DAG (`processRun.js`)

Honour `stageKeys` order. Do not skip or reorder:

`webAnalyzer? → ba → manualQa → automationQa → execution → a11y/perf/security? → manager → delivery`

- `webAnalyzer` is optional (stage present only when the run selected it). Orchestrator **enqueues** `kind: "webAnalyzer"` and waits; the executor runs `@zero/analyzer`.
- After crawl, `inferDomain.js` may call `applyLlm("domainInference", …)` then `applyClassificationToArtifact` so UI/BA read `webAnalysis.domainClassification` even when the LLM did not fire. Persist `webAnalysis.metadata.domainInference` whenever `baInsights.metadata.llm` exists (`used: false` still matters for the UI fallback banner).
- `execution` (and optional a11y/perf/security) are the same pattern: `enqueueExecution` → wait for `execution.completed`. Timeout lives in `@zero/domain/execution` `requestExecution`.
- `rerunFailedOnly` jumps to execution + manager + delivery.

BA/Manual/Automation/Manager always start from **templates** in `pipeline.js`. `applyLlm` is best-effort enrichment.

## Domain inference (`inferDomain.js`)

Gate (`shouldRunDomainInference`) fires when:

- `websiteTypeConfidence < 0.5`, or type looks GENERIC, or
- domain is confident but sub-domain is missing/`< 0.5` and `subDomainOptions` is non-empty

Skip when `ZERO_LLM=off`, no decrypted key, or cost/RPM cap. Rules still stand; `subDomain` may stay null.

`PROMPT_VERSIONS.domainInference` (`domainInference.v2`) asks for `domainLabel` + `subDomainLabel`. When `subDomainOptions` is set, the model must pick from that list or return null. Merge into inference fields; `applyClassificationToArtifact` is what downstream agents and the run view actually read. Do not invent a WEBSITE_TYPES key.

## LLM (`llm/index.js`)

| Env | Default | Role |
|-----|---------|------|
| `ZERO_LLM` | (on) | `off` forces templates |
| `ZERO_LLM_RPM` | 20 | per-process rate |
| `ZERO_LLM_MAX_USD_PER_RUN` | 0.5 | per-run spend cap |
| `ZERO_LLM_TIMEOUT_MS` | 8000 | provider HTTP timeout |
| `ZERO_LLM_ENV_KEYS` | unset | set `1` to allow env provider keys |

Providers: `openai`, `claude`, `gemini`. Preferred agent setting first, else `gemini → openai → claude`. Template JSON is the base; parse failures and 4xx fall back and record `metadata.llm.fallbackReason` plus `fallbackMessage` (redacted, ≤240 chars) — never throw the run. OpenAI `unknown_model` retries `OPENAI_MODEL_FALLBACKS` (`gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`).

Keys: never log. `redact` / `describeProviderError` for UI. `ownerEmailForRun` scopes settings/keys.

## Automation bundle

`pipeline.js` `generateAutomationBundle` chooses the emitter (`buildPlaywrightSpec` vs `buildPlaywrightSpecFromTestCases`) after locator merge (DB → memory → profile via `@zero/locators`). Do not emit spec strings here.

## Invariants

- Do not `require("playwright")` or launch a browser after S4.
- Do not persist `loginPassword` into artifacts or Postgres.
- Do not import `@aws-sdk` / `@google-cloud` — go through `@zero/cloud`.
- Idempotent writes on `(runId, stage)` as far as persist allows.

## How to change

1. Stage order → `@zero/domain` `stageKeys` first, then `processRun.js`.
2. Template text / case assembly → `pipeline.js`.
3. Provider HTTP / caps / prompt JSON → `llm/index.js` `PROMPT_VERSIONS`.
4. When inference fires or how it lands on `webAnalysis` → `inferDomain.js`.

```bash
npm test -- test/orchestrator.test.js test/orchestrator.http.test.js test/llm.test.js test/domain-inference.test.js test/domain-subdomain.test.js
```

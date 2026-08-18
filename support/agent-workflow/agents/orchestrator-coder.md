# Orchestrator coder (`/zero-orchestrator`)

Per-workspace coder for the **Orchestrator worker**. Use this persona for any change that lives inside `services/orchestrator/`. Cross-workspace routing is `repo-coder.md`; capability / packaging milestones follow `planner.md → implementer.md → verifier.md`.

## Identity

| | |
|--|--|
| **Workspace** | Orchestrator worker |
| **Folder** | `services/orchestrator/` |
| **npm package** | `@zero/orchestrator` |
| **Cursor skill** | `/zero-orchestrator` |
| **Prompt** | `support/agent-workflow/prompts/repos/orchestrator.md` |
| **Docs tab** | zero-docs → Tech → Orchestrator worker (`#tech-orchestrator`) |

## When to invoke

- User names the DAG, `processRun`, BA / Manual QA / Automation QA / Manager agents, or LLM wiring.
- Change stays inside `services/orchestrator/` and consumes `runs.requested`.
- Escalate if the ask needs Chromium (executor) or HTTP intake (API).

## You may change

- `services/orchestrator/**`. Add or edit a single stage / agent strategy file at a time.

## You must not

- `chromium.launch()` here — publish `execution.requested` and wait for `execution.completed`.
- Import a cloud SDK directly — go through `@zero/cloud`.
- Call model vendors directly — go through `@zero/orchestrator/llm`.
- Break the template fallback path; a missing / capped / failing LLM key must never surface as an error.

## Design pattern (honour)

- DAG walker — `processRun` walks `stageKeys` in order; one file per stage.
- Strategy per agent — BA / Manual / Automation / Manager are swappable strategy modules.
- LLM facade + template fallback — templates always run first, LLM enriches when a decrypted key exists.
- Idempotent writes keyed by (`runId`, `stage`) so retries re-run cleanly.

## Procedure

1. **DETECT** — read `AGENTS.md` and zero-docs → Tech → Orchestrator worker. Note current caps (`ZERO_ORCH_CONCURRENCY`, `ZERO_LLM_RPM`, `ZERO_LLM_MAX_USD_PER_RUN`).
2. **PLAN** — restate the change; identify the exact stage file and whether the LLM path or the template path changes.
3. **IMPLEMENT** — small, single-stage edit; add a strategy file if introducing a new agent; keep publishing to `execution.requested` for browser work.
4. **VERIFY** — `npm run orchestrator` standalone or `npm run start:all` for the full loop; `npm run workflow:verify` if a milestone is in flight.
5. **ADVANCE** — update `progress.json` and mirror in `support/zero-docs/src/data/migration.ts` when a milestone flips.

## References

- Prompt: `support/agent-workflow/prompts/repos/orchestrator.md`
- Router: `support/agent-workflow/agents/repo-coder.md`
- Docs: zero-docs → Tech → **Orchestrator worker** (`#tech-orchestrator`)

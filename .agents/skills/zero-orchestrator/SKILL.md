---
name: zero-orchestrator
description: >-
  Code the ZER0 DAG worker (services/orchestrator, processRun, BA/Manual/Automation/Manager).
  Use when the user asks to update the orchestrator, pipeline stages, agents, or @zero/orchestrator.
---

# @zero/orchestrator

1. Read `support/agent-workflow/prompts/repos/orchestrator.md`
2. Preserve `stageKeys` order
3. LLM via `@zero/orchestrator/llm` with template fallback
4. Do not launch Chromium after the execution stage is queued

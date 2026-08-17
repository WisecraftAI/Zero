---
name: zero-executor
description: >-
  Code ZER0 Playwright jobs (apps/executor). Use when
  the user asks to update execution, Chromium, screenshots, or @zero/executor.
---

# @zero/executor

1. Read `agent-workflow/prompts/repos/executor.md`
2. One browser context per job; close in `finally`
3. Upload artifacts via object store — no HTTP server
4. `EXECUTION_MODE=minimal` is not E2E proof

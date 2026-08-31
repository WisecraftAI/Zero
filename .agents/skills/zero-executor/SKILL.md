---
name: zero-executor
description: >-
  Code ZER0 Playwright jobs (services/executor). Use when
  the user asks to update execution, Chromium, screenshots, or @zero/executor.
---

# @zero/executor

0. Read `.cursor/skills/javascript/SKILL.md` and `.cursor/skills/playwright-best-practices/SKILL.md`.
1. Read `support/agent-workflow/prompts/repos/executor.md`
2. One browser context per job; close in `finally`
3. Upload artifacts via object store — no HTTP server
4. `EXECUTION_MODE=minimal` is not E2E proof

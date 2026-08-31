---
name: zero-api
description: >-
  Code ZER0 HTTP intake (services/api routes, auth, SSE, presign). Use when the
  user asks to update the API, Express routes, /api/runs, auth, SSE, or @zero/api.
---

# @zero/api

0. Read `.cursor/skills/javascript/SKILL.md` and `.cursor/skills/nodejs-backend-patterns/SKILL.md`.
1. Read `support/agent-workflow/prompts/repos/api.md`
2. Edit route/middleware/auth only — never launch Chromium
3. Infra only through `@zero/cloud`
4. Do not treat `X-User-Email` as identity

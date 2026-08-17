---
name: zero-api
description: >-
  Code ZER0 HTTP intake (apps/api routes, auth, SSE, presign). Use when the
  user asks to update the API, Express routes, /api/runs, auth, SSE, or @zero/api.
---

# @zero/api

1. Read `agent-workflow/prompts/repos/api.md`
2. Edit route/middleware/auth only — never launch Chromium
3. Infra only through `@zero/cloud`
4. Do not treat `X-User-Email` as identity

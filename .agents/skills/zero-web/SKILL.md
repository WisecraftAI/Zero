---
name: zero-web
description: >-
  Code the ZER0 React UI (web/). Use when the user
  asks to update the UI, client, views, New Run, dashboard, SSE, or @zero/web.
---

# @zero/web

1. Read `agent-workflow/prompts/repos/web.md`
2. Edit `web/src/**` only (rebuild with `npm run build`)
3. Presentation only — no Playwright, pg, or cloud SDKs
4. Prefer EventSource on `/api/runs/:id/stream`; do not add more polling

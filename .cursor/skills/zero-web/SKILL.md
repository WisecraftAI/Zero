---
name: zero-web
description: >-
  Code the ZER0 React UI (web/). Use when the user
  asks to update the UI, client, views, New Run, dashboard, SSE, or @zero/web.
---

# @zero/web

1. Read `support/agent-workflow/prompts/repos/web.md`
2. Edit `web/src/**` only (rebuild with `npm run build`)
3. Presentation only — no Playwright, pg, or cloud SDKs
4. EventSource on `/runs/:id/stream` via `web/src/data/useRunStream.js`; poll fallback only after two SSE failures

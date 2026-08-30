# URL analyzer — coding prompt

**Workspace:** URL analyzer  
**Folder:** `packages/analyzer/`  
**npm package:** `@zero/analyzer`  
**Cursor skill:** `/zero-analyzer`

## Purpose

Optional crawl that seeds BA whenever no TC file is uploaded. BA notes are a focus hint and never skip the crawl.

## Design patterns

- Strategy: light heuristics vs Playwright pro crawl
- Isolated Chromium from the executor farm (V3 may keep this in the orchestrator image until traffic proves a split)
- Crawl signals (`lib/crawl/signals.js`) — anti-bot / WAF / SPA-root detection

## You may change

- Crawl depth, BRD insight shape, suggested TCs
- Pro strategy (`lib/strategies/pro.js`) and signal heuristics

## You must not

- Run on every request (only when the pipeline selects `webAnalyzer`)
- Persist login passwords from the crawled site
- Import AWS/GCP SDKs
- Treat `websiteType` display labels as taxonomy keys (Q5)

## Honour

- Called from the orchestrator **webAnalyzer** stage (`processRun`), not from `/runs` request handlers
- Pro crawl uses Playwright — that is why analyzer is *not* in the API image after S4

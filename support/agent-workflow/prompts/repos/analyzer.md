# URL analyzer — coding prompt

**Workspace:** URL analyzer  
**Folder:** `packages/analyzer/`  
**npm package:** `@zero/analyzer`  
**Cursor skill:** `/zero-analyzer`

## Purpose

Optional crawl that seeds BA when notes are short and no TC file is uploaded.

## Design patterns

- Strategy: light heuristics vs Playwright pro crawl
- Isolated Chromium from the executor farm (V3 may keep this in the orchestrator image until traffic proves a split)

## You may change

- Crawl depth, BRD insight shape, suggested TCs

## You must not

- Run on every request (only when the pipeline selects `webAnalyzer`)
- Persist login passwords from the crawled site
- Import AWS/GCP SDKs

## Honour

- Called from the BA path, not from `/api/runs` request handlers directly
- Pro crawl uses Playwright — that is why analyzer is *not* in the API image after S4

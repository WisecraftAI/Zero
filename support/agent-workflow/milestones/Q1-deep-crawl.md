# Q1 — Deep crawl (multi-page site understanding)

Expand the Web Analyzer so a URL-only run understands more than the landing page: follow primary navigation, crawl a bounded set of internal pages, and emit a structured site map for downstream test generation.

## North star

**Any public URL in → structured crawl out → no user notes required.**

Rules + Playwright only. No LLM in this milestone.

## Depends on

M4 (execution farm), existing `@zero/analyzer` light/pro strategies, Web Analyzer job in `@zero/executor`.

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| Crawl engine | `packages/analyzer/` | `/zero-analyzer` |
| Job wiring | `services/executor/` | `/zero-executor` |
| Artifact shape | `packages/domain/` (if new fields) | `/zero-domain` |

## Scope

- Add `packages/analyzer/lib/crawl/multiPage.js` with `crawlLinkedPages(page, startUrl, options)`:
  - Cap: `maxPages` (default 8), `maxDepth` (default 2), same-origin only
  - Prefer nav/header links, then footer; skip logout, external, `#`, file downloads
  - Return `{ pages: [{ url, title, path }], errors: [] }`
- Wire into light and/or pro analyzer strategy so `webAnalysis` includes:
  - `crawledPages[]` — each page summary (url, title, element counts, forms seen)
  - `pagesCrawled` — number
  - Merge element inventory across pages (dedupe by key)
- Executor `webAnalyzer` job passes crawl options via env or run input (`ZERO_ANALYZER_MAX_PAGES`, optional UI later)
- `baInsights` includes `crawledPages` count and top nav labels for BA/Manual stages

## Acceptance

- [x] `packages/analyzer/lib/crawl/multiPage.js` exists and is exported
- [x] Pro or light strategy invokes multi-page crawl before type detection / flow detection
- [x] `webAnalysis` artifact includes `crawledPages` (array) and `pagesCrawled` (number ≥ 1 on multi-link sites)
- [x] `test/analyzer-multipage.test.js` passes (mock or fixture HTML; asserts ≥2 pages when nav present)
- [x] `npm run workflow:verify -- --milestone Q1` exits 0
- [x] No LLM calls added in this milestone

## Out of scope

- AI domain inference (Q4)
- Executing discovered flows (Q3)
- Auth-gated pages behind login
- Sitemap.xml crawler (optional follow-up)

## Verify

```bash
npm test -- test/analyzer-multipage.test.js
npm run workflow:verify -- --milestone Q1
```

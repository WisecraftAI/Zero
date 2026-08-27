---
name: zero-analyzer
description: >-
  Code ZER0 URL crawlers in packages/analyzer (@zero/analyzer): Playwright
  light/pro crawl, website-type and sub-domain classification, BRD insights,
  major functional cases, and discovered user flows. Use whenever the user
  asks to update Web Analyzer, crawl, multi-page crawl, settle overlays,
  WEBSITE_TYPES, sub-domain taxonomy, Q5 classification, BRD insights,
  majorFunctionalCases, urlAnalyzer, urlAnalyzerPro, or @zero/analyzer.
  Prefer this over executor or orchestrator skills when the change is crawl,
  classify, or case-shape — not Chromium launch or DAG wiring.
---

# @zero/analyzer

Optional Playwright crawl that seeds BA when the pipeline selects `webAnalyzer` (no TC file, short/empty notes). The package owns crawl, classification, BRD/case *shape*, and flow *detection*. It does not launch Chromium and does not persist login secrets.

## When this skill owns the task

Stay inside `packages/analyzer/` for crawl helpers, taxonomy, BRD/case generators, and BA insight formatting.

Escalate instead of stretching this package when the ask is:

- When the stage runs, or LLM domain inference after the crawl → `@zero/orchestrator` (`processRun.js`, `inferDomain.js`)
- Opening Chromium / `kind: "webAnalyzer"` job → `@zero/executor` (`jobs.js` `generateWebAnalysis`)
- Channel profiles / `stageKeys` → `@zero/domain`
- E-commerce selector library → `@zero/locators`

Read `support/agent-workflow/prompts/repos/analyzer.md` before editing. Q5 two-level taxonomy lives in `support/agent-workflow/milestones/Q5-domain-subdomain.md`.

## Layout

CommonJS. Runtime dependency is `@zero/locators` only. Playwright is a *peer used by the caller* — this package must not `require("playwright")`. Do not add `@zero/cloud`, `@zero/db`, Express, or vendor SDKs.

```
packages/analyzer/
  index.js                         # re-exports urlAnalyzerPro (default)
  urlAnalyzerPro.js                # Pro public API
  urlAnalyzer.js                   # light public API
  lib/classify/                    # WEBSITE_TYPES scoring + sub-domains
  lib/crawl/                       # elements, forms, multi-page, settle
  lib/flows/                       # detected user journeys (light + pro)
  lib/generate/                    # BRD, TCs, majorFunctionalCases
  lib/format/                      # BA insight objects (baPro / baLight)
  lib/strategies/                  # analyzeUrl / analyzeUrlPro
  lib/constants.js                 # WEBSITE_TYPES, ELEMENT_CATEGORIES
```

`index.js` defaults to Pro. Callers that want the light strategy must import `@zero/analyzer/urlAnalyzer`.

## Public API

| Export | Use |
|--------|-----|
| `@zero/analyzer` | Same as `urlAnalyzerPro` |
| `@zero/analyzer/urlAnalyzerPro` | Pro crawl + classify + format |
| `@zero/analyzer/urlAnalyzer` | Light crawl (smaller category set, legacy shape) |

### Pro (`urlAnalyzerPro.js`)

| Function | When |
|----------|------|
| `analyzeUrlPro(page, url, options)` | Executor `webAnalyzer` job. Expects an **already-open** Playwright `page`. Options: `maxPages`, `headless`. |
| `formatForBAAgent(analysisResult)` | BA insight object (`websiteType`, `subDomain`, flows, BRD, cases). |
| `detectWebsiteType(page, url)` / `matchHostnameToDomain(hostname)` | Domain enum from hostname patterns then page text. |
| `detectSubDomain` / `scoreSubDomains` | Sub-domain of the winning domain from crawl signals (nav, paths, forms, text). Pure `scoreSubDomains` is page-free. |
| `generateTestCases` / `generateBRD` | Pro reports from crawl JSON. |
| `getSubDomains` / `hasSubDomains` / `subDomainNames` / `resolveSubDomain` | Taxonomy helpers for the executor job and orchestrator gate. |
| `WEBSITE_TYPES` / `ELEMENT_CATEGORIES` / `SUB_DOMAINS` | Shared enums. |
| `ANALYZER_USER_AGENT` / `ANALYZER_BROWSER_CONTEXT` | Executor must apply these on the browser context (grocery SPAs treat Playwright's default UA as a bot). |

### Light (`urlAnalyzer.js`)

`analyzeUrl`, `formatObservationsForBA`, `generateBRD`, `generateTestCasesFromAnalysis`. Tests/legacy only — the executor `webAnalyzer` job always calls Pro.

## Classification (Q5)

"Sub-domain" is the taxonomy level (`ECOMMERCE` / grocery), **not** the DNS label in `shop.example.com`.

- Domain keys live in `lib/constants.js` `WEBSITE_TYPES` (ECOMMERCE, OTT_STREAMING, SAAS, BANKING_FINANCE, GENERIC, …).
- Sub-domains live in `lib/classify/domainTaxonomy.js` `SUB_DOMAINS` (additive map per domain). `GENERIC` may have none.
- `matchHostnameToDomain`: domain `urlPatterns` win first so a known brand stays on its parent type; sub-domain patterns then lift the parent (e.g. `zepto.com` → ECOMMERCE).
- `detectSubDomain` scores the winning domain's catalog over the **whole crawl** (nav labels, path segments, form purposes, body text), not landing-page text alone.
- Keep emitting today's `websiteType` / `websiteTypeConfidence`. The two-level answer on the run artifact is `webAnalysis.domainClassification` (executor + `applyClassificationToArtifact`), not a `classification` field.
- Hostname `saravana` / `supersaravana` is still hard-pinned to `RETAIL_STORE` at 0.95 in `detectWebsiteType`. Do not add more brand pins; fold them into `SUB_DOMAINS` urlPatterns instead (Q5).
- Thin crawl (empty shell): `buildClassificationFallbackFlows` may emit taxonomy `criticalFlows` so cases still exist.

## Crawl

- `lib/crawl/multiPage.js` `crawlLinkedPages` — same-origin BFS. Default cap 8 (`ZERO_ANALYZER_MAX_PAGES` or `options.maxPages`). Skip logout, `javascript:`, files, other origins. Registrable-domain matching treats `www` / `shop` as one site.
- `lib/crawl/settle.js` — SPA settle + dismiss cookie/location overlays. Grocery sites often paint an empty shell at `domcontentloaded`. `thinCrawl` on the result means "UI not readable; cases may come from the classified type."
- Do not persist crawled login passwords or typed secrets.

## Cases and flows

- `generateMajorFunctionalCases` — rule-based major cases (cap 20). Prefer sub-domain `testPriorities` / `criticalFlows`, fall back to the domain lists.
- Pro flows (`lib/flows/pro/`) detect journeys from the crawl; they are **detection**, not Playwright execution. Execution closures live in `@zero/builders`.

## Callers (read, do not rewrite from here)

- `@zero/executor` `jobs.js` `generateWebAnalysis` — launches Chromium, applies `ANALYZER_BROWSER_CONTEXT`, calls `analyzeUrlPro`, stores `webAnalysis`.
- `@zero/orchestrator` `processRun.js` — enqueues `kind: "webAnalyzer"`, then may LLM-refine domain/sub-domain via `inferDomain.js`.
- HTTP API must not depend on this package for crawl (`test/packaging.boundaries.test.js`). Health may *report* that the module exists.

## How to change

1. Taxonomy → `constants.js` + `domainTaxonomy.js`. Detection → `websiteType.js` / `subDomain.js` / `indicatorMatch.js`.
2. Overlay / SPA emptiness → `settle.js`. Link graph → `multiPage.js`.
3. BA payload shape → `format/baPro.js` (this is what the UI and BA actually read).
4. Keep `package.json` `exports` in sync. Tests import `lib/` for unit details; callers use package exports.

```bash
npm test -- test/analyzer.test.js test/analyzer-multipage.test.js test/domain-subdomain.test.js test/domain-test-generation.test.js test/proFlows.test.js
```

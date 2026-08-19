# Q5 — Domain + sub-domain classification (two-level site taxonomy)

The Web Analyzer resolves **two** levels from the target URL — a domain from the existing `WEBSITE_TYPES` enum and a sub-domain from a new `subTypes` map under it — and that pair is what decides which tests get written. Rules resolve what they can, the LLM refines only the unresolved half, and case generation reads the resolved result.

> "Sub-domain" is the taxonomy level (`ECOMMERCE / grocery`), **not** the DNS label in `shop.example.com`. Hostname labels are one detection signal among many; Q5 never routes or branches on them.

## North star

Two sites that share a domain but not a funnel stop receiving identical test plans. A grocery chain and a fashion label both classified `ECOMMERCE` get different major functional cases without a human picking a profile.

## Depends on

Q1 (rich crawl JSON — `crawledPages`, `navLabels`, form `purpose`), Q2 (`majorFunctionalCases` consumes priorities), Q4 (the LLM gate this widens). M6 (LLM wiring).

## Why now

Closed as of Q4, and each is a behaviour in the code today, not a wish:

- `WEBSITE_TYPES` is flat — 14 entries, each with one fixed `testPriorities` / `criticalFlows` array that `detectWebsiteType` attaches verbatim to every site it wins.
- `inferDomain.js` writes `inferredTestPriorities` and `inferredCriticalFlows` onto `baInsights`; **no module reads either field**. The inference call a run pays for cannot change one generated case.
- `generateMajorFunctionalCases` runs in the executor `webAnalyzer` job; inference runs afterwards in the orchestrator. Cases are final before the site is understood.
- On merge, `baInsights.websiteType` is replaced by the free-form `domainLabel`, so it stops being an enum key; `consolidateRequirements` then recovers a profile by substring matching that prose.
- `detectWebsiteType` reads only landing-page `innerText`, `title`, and meta description, ignoring the crawl signals Q1 already collects.
- A hostname containing `saravana` is pinned to `RETAIL_STORE` at 0.95 — a sub-domain rule in disguise.

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| Taxonomy + sub-domain detection | `packages/analyzer/lib/constants.js`, `lib/classify/` | `/zero-analyzer` |
| Case generation | `packages/analyzer/lib/generate/majorFunctionalCases.js` | `/zero-analyzer` |
| Artifact bridge | `services/executor/jobs.js` | `/zero-executor` |
| Gate + prompt + merge | `services/orchestrator/inferDomain.js`, `llm/index.js`, `pipeline.js` | `/zero-orchestrator` |
| Classification cache | `packages/db/lib/schema/tables.js` | `/zero-db` |
| Run view surface + override | `web/src/views/` | `/zero-web` |

## Scope

Six phases, ordered so 1–3 cannot change a run output and 5 is the first a user notices.

1. **Two-level taxonomy** — every `WEBSITE_TYPES` entry gains `subTypes`: key → `{ name, indicators[], urlPatterns[], pathPatterns[], testPriorities[], criticalFlows[] }`. `pathPatterns` is the new field; sub-domains separate on URL paths far more sharply than domains separate on hostnames. Existing fields untouched, nothing reads `subTypes` yet.
2. **Rule-based sub-domain detection** — new `lib/classify/subDomain.js` scores the winning domain's `subTypes` over the whole crawl corpus (nav labels, path segments, form purposes, element category counts), not just landing-page text. Emit `classification` beside today's `websiteType`. Retire the `saravana` branch into `RETAIL_STORE.subTypes['supermarket-chain'].urlPatterns`.
3. **Carry the contract** — map `classification` onto `webAnalysis.classification` and through to `run.input._webAnalysisInsights`. `websiteType` / `websiteTypeConfidence` keep today's values and meaning for every existing consumer.
4. **Constrained LLM gate** — `PROMPT_VERSIONS.domainSubdomain` (`domainSubdomain.v2`) carries `allowedDomains` / `allowedSubDomains` in the context so the model cannot invent a key. Widen the gate to also fire when the domain is confident but the sub-domain is not. Merge into `classification` only — the LLM may refine, never overwrite, the enum `domain`. Values outside the enum are dropped, not coerced; `subDomainLabel` is recorded for taxonomy review and never assigned to `subDomain`.
5. **Make it change the output** — `resolvePriorities()` prefers sub-domain lists and falls back to domain. Top up `majorFunctionalCases` in the orchestrator after the gate so inferred priorities reach `manualQa`. `consolidateRequirements` maps `classification.domain` to `profileKey` by enum lookup instead of substring matching.
6. **Cache and surface** — `site_classification` keyed on `host` (`domain`, `sub_domain`, confidences, `source`, `updated_at`) with TTL reuse so repeat runs skip inference. Run view shows `Domain → Sub-domain` with confidence and source, and allows an override before BA.

### Contract

```js
webAnalysis.classification = {
  domain:            'ECOMMERCE',            // always a WEBSITE_TYPES key
  domainName:        'E-commerce Platform',
  domainConfidence:  0.9,
  subDomain:         'grocery',              // key within subTypes, or null
  subDomainName:     'Online Grocery',
  subConfidence:     0.62,
  source:            'rules',                // rules | llm | hybrid | cache
  signals:           ['urlPattern:bigbasket', 'nav:Fruits & Vegetables', 'form:pincode'],
  runnerUp:          { domain: 'RETAIL_STORE', domainConfidence: 0.41 },
  testPriorities:    [...],                  // sub-domain first, domain as fallback
  criticalFlows:     [...],
}
```

`signals` exists so a wrong answer is debuggable from `run.json` alone. `runnerUp` is what a UI override offers first.

### Gate

| Rule outcome | Sub-domain outcome | Action |
|--------------|--------------------|--------|
| `domainConfidence >= 0.5` | `subConfidence >= 0.5` | No call. Rules win outright. |
| `domainConfidence >= 0.5` | `subConfidence < 0.5` or null | One call, sub-domain only, enum restricted to that domain's `subTypes`. Domain passed as fixed context, not as a question. |
| `domainConfidence < 0.5`, or `GENERIC` | unknown | One call for the pair. The Q4 gate, widened to return two fields. |
| any | cache hit within TTL | No call. Reuse and stamp `source: 'cache'`. |
| any | `ZERO_LLM=off`, no key, or cap hit | No call. Rules stand, `subDomain` may stay null, run completes as today. |

## Acceptance

- [ ] Every `WEBSITE_TYPES` entry defines `subTypes`; `GENERIC` may define none
- [ ] `detectWebsiteType` returns `classification` with `domain`, `subDomain`, and separate confidences
- [ ] Sub-domain scoring reads `crawledPages` nav labels, paths, and form purposes — proven by a fixture with a misleading landing page
- [ ] `websiteType` / `websiteTypeConfidence` keep their present values and are never overwritten by the LLM
- [ ] `PROMPT_VERSIONS.domainSubdomain` exists and the prompt carries the allowed enum lists
- [ ] The gate fires on unresolved sub-domain, not only on low domain confidence or `GENERIC`
- [ ] `majorFunctionalCases` prefers sub-domain priorities; a grocery fixture yields different cases than a fashion fixture
- [ ] Without a provider key the pipeline completes on rules alone, `subDomain` null, no error
- [ ] A second run against the same host reuses the cached classification and makes no LLM call
- [ ] `test/domain-subdomain.test.js` passes with a mock LLM provider
- [ ] `npm run workflow:verify -- --milestone Q5` exits 0

## Out of scope

- DNS subdomain routing or per-hostname run splitting
- Per-page classification — one answer per run, per host
- Vision / screenshot models for classification
- Replacing rule-based detection when both confidences clear 0.5
- Local models (Ollama)
- A user-editable taxonomy in the UI; the enum ships in code

## Risks

- Sub-type indicator lists are hand-written, so a thin one silently scores zero. Phase 2 needs a fixture **per sub-domain**, not per domain.
- Topping up cases in the orchestrator puts case generation in two places. Extract the generator to a shared call rather than copying it.
- A cached wrong answer is worse than a fresh wrong one. TTL plus the visible override in phase 6 is the mitigation, not an extra.

## Verify

```bash
npm test -- test/domain-subdomain.test.js
npm run workflow:verify -- --milestone Q5
```

Plan and rationale are also published in the docs site: **Next Milestone** tab (`support/zero-docs/src/pages/NextMilestone.tsx`, `http://localhost:5174/#next-milestone`).

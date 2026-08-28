# Q5 — Trustworthy site understanding and test-plan quality

Q5 is a **recovery milestone**. The first implementation added a large sub-domain
catalog and several happy-path tests, but it did not prove that a URL-only run
produces a correct, stable classification or a materially better test plan.

The replacement Q5 closes only when output quality is measured end to end.

> “Sub-domain” is a business taxonomy level (`ECOMMERCE / GROCERY`), not the DNS
> label in `shop.example.com`.

## Outcome

Given only a public URL, ZER0 emits one canonical, evidence-backed domain /
sub-domain decision and uses it to generate a relevant test plan. When evidence
is weak, ZER0 abstains or uses one constrained LLM call; it never converts
free-form prose into a taxonomy key.

## Baseline: what the first attempt left behind

- `domainTaxonomy.js` and `WEBSITE_TYPES` are separate authorities with different
  shapes and naming conventions.
- `inferDomain.js` can still replace `websiteType` with a free-form display
  label, so downstream code cannot rely on an enum key.
- `domainClassification`, `baInsights`, `metadata`, and `siteOverview` can carry
  different answers for the same run.
- Case generation consumes sub-domain lists, but there is no benchmark proving
  that the top cases are more relevant or that irrelevant cases disappear.
- `workflow:verify` checks source strings and file existence. It can report a
  result without exercising the classifier, gate, or pipeline.
- The current test file proves isolated happy paths; it does not establish
  accuracy, abstention behaviour, compatibility, or a full run artifact.

These are characterization facts, not permission for a broad rewrite.

## Depends on

Q1 rich crawl JSON, Q2 major case generation, Q3 discovered-flow execution,
Q4 conditional LLM inference, and M6 provider wiring.

## Scope boundary

Q5 supports six priority domains first:

`ECOMMERCE`, `OTT_STREAMING`, `BANKING_FINANCE`, `HEALTHCARE_PHARMA`,
`TRAVEL_BOOKING`, and `SAAS`.

Other existing domain keys remain valid and fall back to domain-level cases.
Expanding every domain and sub-domain is follow-up data work, not a condition
for shipping the quality contract.

## Canonical contract

```js
webAnalysis.classification = {
  domain: 'ECOMMERCE',                 // WEBSITE_TYPES key
  domainName: 'E-commerce Platform',   // display only
  domainConfidence: 0.91,
  subDomain: 'GROCERY',                // key within domain, or null
  subDomainName: 'Grocery and Daily Essentials',
  subDomainConfidence: 0.78,
  source: 'rules',                     // rules | llm | hybrid
  evidence: [
    { kind: 'nav', value: 'Fruits & Vegetables', weight: 0.18 },
    { kind: 'path', value: '/fresh', weight: 0.12 },
  ],
  runnerUp: { subDomain: 'D2C_BRAND', confidence: 0.31 },
}
```

Rules:

1. `domain` and `subDomain` are canonical keys or `null`; labels never occupy key
   fields.
2. `classification` is the source of truth. Legacy fields are read-only aliases
   derived from it until Q5 closes.
3. Confidence is calibrated against fixtures. Weak evidence produces `null`;
   hostname matching alone cannot produce high confidence.
4. The LLM receives allowed keys and may fill only unresolved fields. Invalid
   values are discarded.
5. Test priorities are resolved from the canonical pair once, after inference,
   then consumed by Manual QA and execution.

## Deliverables

### D1 — Characterize and benchmark

- Add captured crawl fixtures with expected classifications; tests use no live
  network.
- Cover at least two sub-domains in each priority domain plus four ambiguous /
  generic fixtures.
- Record the first implementation’s accuracy and case relevance before changing
  scoring.

**Exit:** a failing benchmark explains the current quality gap.

### D2 — One taxonomy and one contract

- Move domain and sub-domain definitions behind one analyzer API.
- Normalize keys, labels, confidences, source, evidence, and runner-up.
- Keep current `websiteType` fields as compatibility aliases; no consumer may
  mutate them independently.

**Exit:** schema and compatibility tests prove one resolved answer per artifact.

### D3 — Calibrated rules and constrained inference

- Reorder the analyzer path to crawl first, classify the canonical pair from the
  complete corpus second, and generate cases only after that decision.
- Score the complete crawl corpus: titles, nav labels, paths, form purposes, and
  element categories.
- Tune thresholds against the fixture benchmark, including abstention.
- Call the LLM only for unresolved fields and constrain replies to allowed keys.

**Exit:** benchmark thresholds pass with and without a provider key.

### D4 — Relevant cases, generated once

- Resolve priorities after classification is final.
- Generate major functional cases in one place; do not “top up” a second copy in
  the orchestrator.
- Remove clearly irrelevant domain fallback cases when a confident sub-domain
  exists.

**Exit:** paired fixtures in the same domain produce measurably different top
cases while preserving shared essentials.

### D5 — End-to-end proof and operability

- Add a pipeline test from captured crawl data to `run.json`, Manual QA input,
  and execution input.
- Stamp classification source, evidence, prompt version, and fallback reason in
  the artifact without secrets.
- Make `workflow:verify -- --milestone Q5` execute the targeted tests; static
  probes remain diagnostics only.

**Exit:** an implementer can reproduce a wrong decision from one artifact and
the release gate exercises behaviour.

## Success measures

- Domain top-1 accuracy is at least **90%** on the Q5 fixture set.
- Supported sub-domain precision is at least **85%** with at least **75%**
  coverage; uncertain fixtures abstain instead of guessing.
- Repeated classification of the same fixture is deterministic.
- Grocery versus fashion and insurance versus lending differ in at least three
  of their top five test modules.
- No generated top-five case contradicts the fixture’s expected capabilities.
- A rules-only run completes when no provider key exists.
- Invalid LLM keys never enter `classification`.

## Acceptance

- [ ] A versioned, offline fixture manifest records expected domain, sub-domain,
      capabilities, and forbidden case areas.
- [ ] All key fields are enum-validated; display labels are never used as keys.
- [ ] `classification` is the only mutable answer carried across analyzer,
      executor, and orchestrator boundaries.
- [ ] Legacy fields remain compatible and are derived from `classification`.
- [ ] Low-confidence results abstain or invoke one constrained inference call.
- [ ] Domain and sub-domain classification run after the bounded crawl and use
      its structural signals.
- [ ] Rules-only and mocked-LLM benchmark suites meet the success measures.
- [ ] Case generation runs once after final classification.
- [ ] Same-domain fixture pairs produce distinct, relevant top-five modules.
- [ ] One integration test proves classification reaches Manual QA and execution.
- [ ] Q1–Q4 regression tests pass.
- [ ] `npm run workflow:verify -- --milestone Q5` runs behavioural tests and
      exits 0.

## Rollout and rollback

1. Land fixtures and characterization tests without changing output.
2. Land the canonical contract with compatibility aliases.
3. Switch analyzer and inference writers to the contract.
4. Switch case generation only after benchmark thresholds pass.
5. If quality regresses, fall back to existing domain-level priorities; do not
   serve partially normalized classification data.

## Observability

Every run artifact must answer: what was chosen, how confident it was, which
signals won, whether the LLM ran, why it ran, and which taxonomy entry supplied
the generated priorities. Keys and prompt payloads are never logged.

## Out of scope

- Classification caching or a new **classification** table
- Host-scoped `agent_memory` already ships (BA summaries, extra cases, locator hints, execution failures). That is **not** classification caching — do not write taxonomy keys into it.
- A user override or pipeline pause/resume UI
- A user-editable taxonomy
- DNS subdomain routing or per-page classification
- Vision models, local models, or unbounded crawling
- Exhaustive taxonomy expansion outside the six priority domains

Caching and override are intentionally deferred: persisting or exposing an
unproven answer makes a bad classifier harder to correct.

## Definition of done

Q5 is done only when all acceptance checks pass, the behavioural verification
command is green, the benchmark report is committed, `progress.json` is changed
to `done`, and the Architecture / Next Milestone docs show the same status.
File-existence probes alone cannot close Q5.

## Verify

```bash
npm test -- test/domain-subdomain.test.js
npm test -- test/domain-classification-benchmark.test.js
npm test -- test/domain-classification-pipeline.test.js
npm run workflow:verify -- --milestone Q5
```

The execution view is published in the zero-docs **Next Milestone** tab at
`http://localhost:5174/#next-milestone`.

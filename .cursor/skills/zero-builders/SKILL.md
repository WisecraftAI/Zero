---
name: zero-builders
description: >-
  Code ZER0 script emitters in packages/builders (@zero/builders): Playwright
  specs, Java/Selenium classes, e-commerce templates, and discovered-flow
  executors. Use whenever the user asks to update generated Playwright or
  Java/Selenium output, scriptBuilder, javaSeleniumBuilder, channel-flow specs,
  CSV/manual-case-to-spec mapping, e-commerce test templates, discovered_flows /
  url_analysis_auto helpers, locator interpolation in generated scripts, or
  @zero/builders. Prefer this over executor or orchestrator skills when the
  change is emitted text or flow-step helpers, not Chromium launch or DAG wiring.
---

# @zero/builders

Emit portable Playwright + Java/Selenium scaffolding from merged locators and test cases. Output is text (or flow `execute` closures). Same input must always yield the same output. The package does not claim green E2E.

## When this skill owns the task

Stay inside `packages/builders/` for emitter text, locator interpolation, file headers, and discovered-flow step helpers.

Escalate instead of stretching this package when the ask is:

- How Automation QA *chooses* an emitter → `@zero/orchestrator` (`pipeline.js` `generateAutomationBundle`)
- How Chromium *runs* generated or discovered tests → `@zero/executor` (`jobs.js`)
- Selector merge / element keys → `@zero/locators`
- Channel profiles → `@zero/domain` `appProfiles`

Read `support/agent-workflow/prompts/repos/builders.md` before editing.

## Layout

CommonJS. Only runtime dependency is `@zero/locators` (e-commerce domain selectors). Do not add `@zero/cloud`, `@zero/db`, Express, Playwright, or vendor SDKs.

```
packages/builders/
  index.js                         # spreads playwright + selenium public API
  scriptBuilder.js                 # thin re-export of lib/playwright (legacy path)
  javaSeleniumBuilder.js           # thin re-export of lib/selenium (legacy path)
  lib/playwright/                  # spec strings + discovered-flow executors
  lib/selenium/                    # Java class / method strings
  lib/shared/                      # selectors, text escaping, ecommerce config
```

Keep logic in `lib/`. `scriptBuilder.js` and `javaSeleniumBuilder.js` stay one-line re-exports so existing `require("@zero/builders/scriptBuilder")` paths keep working. New public functions go on `lib/playwright/index.js` or `lib/selenium/index.js`, then add a matching `exports` entry in `package.json`.

## Public API

Callers should use package exports, not deep `lib/` paths (tests may import `lib/` for unit details).

| Export | Use |
|--------|-----|
| `@zero/builders` | Combined Playwright + Selenium functions |
| `@zero/builders/scriptBuilder` | Playwright emitters (legacy) |
| `@zero/builders/javaSeleniumBuilder` | Selenium emitters (legacy) |
| `@zero/builders/playwright` | Playwright emitters |
| `@zero/builders/playwright/discoveredFlows` | Runtime flow tests for the executor |
| `@zero/builders/selenium` | Java/Selenium emitters |
| `@zero/builders/shared/selectors` | `resolveOttSelectors`, `flattenLocatorValues` |
| `@zero/builders/shared/text` | `escapeJava`, `sanitizeTestTitle`, Java identifiers |

### Playwright (`lib/playwright`)

| Function | Returns | When |
|----------|---------|------|
| `buildPlaywrightSpec(ottUrl, selectorCandidates, options)` | spec string | Default Automation QA path: one `"channel flow regression"` test (goto → continue/login → content card → play → pause). Options: `testName`, `extraSteps` (raw Playwright lines). |
| `buildPlaywrightSpecFromTestCases(ottUrl, testCases, selectorCandidates)` | spec string | `executionMode === "uploaded_tc_only"` with CSV/manual cases. One `test()` per case; still runs the same channel-flow body after a unique goto. Accepts `{ testCases }` or a bare array. |
| `buildEcommerceSpec(url, testCases, options)` | spec string | Domain-aware shop flow. Empty cases → generic search → product → cart. Cases map `action` keywords (`search`/`enter`, `click_product`/`select`, `add`+`cart`, `open_cart`/`view_cart`, `verify`) onto helper calls. Selectors come from `@zero/locators/ecommerceSelectors`, not OTT merge. |
| `buildExecutionSteps(selectorCandidates, ottUrl, baseTests)` | `baseTests` | Identity stub. Do not grow side effects here without updating `test/builders.test.js`. |
| `buildDiscoveredFlowTests({ ottUrl, userFlows, manualTestCases, hasLoginSecrets })` | `{ id, title, flowName, execute }[]` | **Not a spec string.** Executor calls this in `discovered_flows` mode. Caps at 5 flows (`MAX_FLOWS`), critical/P0 first, then fills from manual cases. `runDiscoveredFlows` is an alias. |

Channel specs interpolate `resolveOttSelectors(candidates)` into `clickFirstAvailable` / `expectFirstAvailable`. Empty candidate arrays fall back to `DEFAULT_OTT_SELECTORS`. `seekBar` aliases `pauseCta`.

Helper strings live in `lib/playwright/helpers.js` (`buildPlaywrightHeader`) so every OTT spec shares the same import, URL constant, and first-match click/expect helpers. Keep skeleton and steps separate.

### Java / Selenium (`lib/selenium`)

| Function | Returns | When |
|----------|---------|------|
| `buildSeleniumJavaClass(projectName, testCases, locatorsByKey, baseUrl)` | Java class string | Automation QA bundle (`generatedSeleniumJava`): ChromeDriver shell, body wait, `toJavaClassName(projectName) + "Test"`. |
| `buildSeleniumJavaTest(testCase, locatorsByKey, baseUrl)` | Java class string | Per-TC persist in `processRun` (up to 50). Tries first 3 `playCta` locators, then first `contentCard`. `flattenLocatorValues` accepts strings or `{ selectorValue }`. |
| `buildEcommerceSelenium(url, testCases, options)` | Java class string | Domain-aware shop class with `SEARCH_INPUT` / `PRODUCT_CARD` / `ADD_TO_CART` constants (first 5 selectors each) and a `main` that runs search → product → cart. |
| `escapeJava` | string | Shared escaping for generated Java literals. |

`toSeleniumBy` emits `By.xpath` when the selector starts with `//`, otherwise `By.cssSelector`. Always `escapeJava` interpolated strings.

## Discovered flows (the non-text path)

`lib/playwright/discoveredFlows.js` builds **closures** the executor runs against an already-open Playwright `page`. It does not launch Chromium. That is why this package still must not `require("playwright")`.

Step actions: `navigate`, `click`, `input`, `verify` (default). Skip `requiresAuth` steps when `hasLoginSecrets` is false. Skip `input` on sensitive text (`password`, `payment`, `card`, `cvv`, `checkout`, `billing`, `ssn`, `otp`, `secret`) so generated runs never type secrets. First flow loads `ottUrl`; later flows reuse the page. Fail the flow on the first thrown step; skipped steps are not failures.

## Invariants

These exist so generated artifacts stay snapshot-testable and portable:

- **Deterministic.** No clocks, randomness, or I/O inside emitters. `Date` belongs to the caller (`generatedAt` in the orchestrator), not here.
- **No browser to “verify” output.** Spec quality is string equality in `test/builders.test.js`. Flow helpers use a mock `page` in `test/flow-execution.test.js`.
- **No file writes.** Callers persist (`generatedPlaywrightScript`, `generatedSeleniumJava`, `insertStoredScript`).
- **No globals at import.** Pure functions; ecommerce config is loaded per call via locators.
- **Scaffolding, not a green-run claim.** `clickFirstAvailable` returning false, Selenium `catch (Exception e) {}`, and discovered-flow skips are intentional softness so export still produces a script on unknown DOM.

## Callers (read, do not rewrite from here)

- `@zero/orchestrator` `pipeline.js` `generateAutomationBundle` — merged locators (DB → memory → profile) into `buildPlaywrightSpec` or `buildPlaywrightSpecFromTestCases`, plus `buildSeleniumJavaClass`.
- `@zero/orchestrator` `processRun.js` — `buildSeleniumJavaTest` per stored script.
- `@zero/executor` `jobs.js` — `buildDiscoveredFlowTests` when `executionMode` is `discovered_flows`.
- HTTP API must not depend on this package (`test/packaging.boundaries.test.js`).

## How to change an emitter

1. Identify the function in the table above. Prefer extending the existing skeleton (header + steps) over a new file.
2. Interpolate locators through `resolveOttSelectors` / `flattenLocatorValues` / `loadEcommerceConfig`. Do not hard-code site selectors in Playwright/Selenium files when shared helpers already own them.
3. Sanitize user-facing strings: `sanitizeTestTitle` (quotes → `'`, length cap) for test names; `escapeJava` for Java literals; `toJavaClassName` / `toJavaMethodName` for identifiers.
4. Keep `package.json` `exports` and `index.js` in sync. `test/builders.test.js` asserts `scriptBuilder.buildPlaywrightSpec === packageEntry.buildPlaywrightSpec`.
5. Snapshot the new text in `test/builders.test.js`. For discovered-flow behavior, extend `test/flow-execution.test.js` with a mock `page`.

```bash
npm test -- test/builders.test.js test/flow-execution.test.js test/packaging.boundaries.test.js
```

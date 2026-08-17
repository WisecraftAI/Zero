---
name: build-check
description: "Run a production-grade verification pass for lint, type-check, build, and tests — then fix regressions and report a clear outcome. Use when the user asks to build, verify, run lint, fix errors, check types, confirm release readiness, or diagnose CI failures. Also triggers on 'is it shippable?', 'why is CI red?', 'pre-merge check', or 'sanity check the build'."
version: 4.0.0
---

# Build Check

Production verification workflow. Treat every run as a release gate — if this passes, the code ships.

## Scope

- Lint, type-check, build, and test validation in that order
- Fix issues introduced by current changes — not historical debt
- Environment and dependency validation before running gates
- Regression detection against the current branch baseline

## Workflow

### Phase 1 — Environment Snapshot

Capture state before touching anything. This is your rollback reference.

```bash
git status --short
git rev-parse --abbrev-ref HEAD
git log --oneline -3
node -v && npm -v
```

If `node_modules/` is stale or missing, run `npm ci` (not `npm install` — CI-safe, lockfile-exact).

### Phase 2 — Lint

```bash
npx eslint src/ pages/ --format stylish 2>&1
```

**Triage priority:**

1. `error` — must fix before proceeding
2. `warning` on changed files — fix if safe
3. `warning` on untouched files — ignore (not your regression)

**Decision tree for lint failures:**

- Import not found → check if file was renamed/moved in this branch
- Unused variable → remove if introduced in this branch; leave if pre-existing
- Hook dependency warning → follow the established pattern in this repo, not the generic rule
- Type mismatch → fix the type, not the lint rule

### Phase 3 — Type Check (if TypeScript)

```bash
npx tsc --noEmit 2>&1
```

Type errors block the build and are often invisible until this step. Fix before attempting build.

### Phase 4 — Production Build

```bash
npx next build 2>&1
```

**Common Next.js build failures and fixes:**
| Error Pattern | Likely Cause | Fix |
|---------------|-------------|-----|
| `Module not found` | Bad import path or missing dep | Check casing, check `package.json` |
| `Image Optimization` | Missing `next/image` config | Add domain to `next.config.mjs` |
| `getStaticProps` error | Data fetch failure at build time | Check API availability or add fallback |
| `window is not defined` | Server-side code using browser API | Wrap in `typeof window !== 'undefined'` or use `dynamic()` with `ssr: false` |
| SCSS compile error | Missing variable or broken `@use` | Trace import chain from `globals.scss` |

### Phase 5 — Tests (if present)

```bash
npm test -- --runInBand --bail 2>&1
```

Only run if test infrastructure exists and tests are relevant to changed files. Skip if no test runner is configured — don't add one during a build check.

### Phase 6 — Fix-and-Verify Loop

Fix in strict priority order: types → imports → lint errors → build failures → test failures. After each fix:

1. Re-run only the failing command
2. If green, proceed to next failure class
3. If still red after 2 attempts on the same error, document as blocker

Never batch fixes across categories — one category at a time prevents cascading confusion.

## Guardrails

- **No `eslint-disable` without justification.** If a disable is truly needed, add inline comment explaining why.
- **No `@ts-ignore` or `@ts-expect-error` as fixes.** These hide problems. Fix the actual type.
- **Minimal blast radius.** Touch only files with errors. No drive-by refactors.
- **Preserve public API surface.** If a fix requires changing exported types, props, or function signatures, flag it explicitly.
- **Respect project conventions.** If the repo uses barrel exports, path aliases, or specific hook patterns, follow them — don't impose a different style.
- **Don't install new dependencies** to fix a build error unless the dependency was clearly intended and missing from `package.json`.

## Completion Criteria

| Gate        | Requirement                                           |
| ----------- | ----------------------------------------------------- |
| Lint        | Exit code 0, no new warnings on changed files         |
| Types       | `tsc --noEmit` exits clean (if TypeScript project)    |
| Build       | `next build` exits code 0                             |
| Tests       | Pass or not applicable                                |
| Diff review | Every changed file has an intentional, explained edit |

## Output Format

```
## Build Check Report

**Branch:** feature/xyz
**Commit:** abc1234

### Results
| Gate       | Status | Notes |
|------------|--------|-------|
| Lint       | ✅/❌  |       |
| TypeCheck  | ✅/❌  |       |
| Build      | ✅/❌  |       |
| Tests      | ✅/⏭️  |       |

### Fixes Applied
- `src/foo.tsx` — fixed missing import for `Bar` component
- `pages/api/chat.ts` — added null check on request body

### Remaining Blockers
- None / [describe blocker + recommended next action]
```

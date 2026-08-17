---
name: simplify
description: "Perform senior-level code cleanup and refactoring on changed files while preserving behavior. Use for simplify, refactor, cleanup, code-quality, maintainability, dead code removal, type hardening, and complexity reduction requests. Also triggers on 'clean this up', 'reduce complexity', 'make this readable', 'tighten types', or 'remove unused code'."
version: 4.0.0
---

# Simplify

Improve maintainability and readability without introducing regressions. Every change must make the code easier for the next developer to understand — not just different.

## Scope

- Changed files first, then files they directly depend on
- Remove dead code, duplication, and unnecessary complexity
- Strengthen typing and API contracts
- Improve React component patterns and rendering efficiency
- Enhance accessibility for interactive elements
- Keep public behavior 100% stable unless explicitly changing it

## Workflow

### Phase 1 — Identify Changed Files

```bash
# Working tree + staged changes
git diff --name-only HEAD
git diff --cached --name-only
```

Focus on these files. Don't audit the entire repo during a simplify pass.

### Phase 2 — Complexity Scan

For each changed file, look for these high-value improvement signals:

**Code Smells (fix immediately):**

| Smell                  | Signal                                         | Action                                |
| ---------------------- | ---------------------------------------------- | ------------------------------------- |
| Dead code              | Unreachable branches, unused functions/imports | Remove                                |
| Copy-paste duplication | 3+ lines repeated with minor variation         | Extract shared helper                 |
| God function           | Function > 40 lines with multiple concerns     | Split by responsibility               |
| Unclear naming         | `data`, `temp`, `result`, `handleClick2`       | Rename to reveal intent               |
| Boolean blindness      | `doThing(true, false, true)`                   | Use options object or named constants |
| Primitive obsession    | Raw strings/numbers where a type or enum fits  | Introduce type alias or const map     |

**Type Weaknesses (fix when safe):**

| Weakness                  | Signal                                      | Action                                        |
| ------------------------- | ------------------------------------------- | --------------------------------------------- |
| `any` type                | Explicit `any` or implicit from untyped lib | Narrow to actual type                         |
| Broad assertions          | `as unknown as X`                           | Fix the source type instead                   |
| Missing return types      | Exported functions without explicit return  | Add return type annotation                    |
| Loose props               | `props: any` or `props: object`             | Define prop interface                         |
| Optional chaining overuse | `a?.b?.c?.d` (> 3 levels)                   | Check if data shape guarantees earlier access |

**React-Specific (fix when clear improvement):**

| Pattern                          | Problem                                          | Better Pattern                                         |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Inline object/array in JSX props | Creates new reference every render               | `useMemo` or extract to module-level const             |
| Effect with missing cleanup      | Subscriptions/timers without cleanup             | Add return function to `useEffect`                     |
| State for derived values         | `useState` + `useEffect` to compute derived data | `useMemo` or compute inline                            |
| Prop drilling > 2 levels         | Props passed through intermediate components     | Context or composition                                 |
| Conditional hook call            | Hooks inside `if`/loop                           | Restructure component or use early return before hooks |

### Phase 3 — Apply Focused Refactors

Apply changes in order of risk (lowest first):

1. **Remove dead code** — zero behavior change, maximum clarity gain
2. **Rename for clarity** — low risk, high readability impact
3. **Extract duplicated logic** — medium risk, reduces future maintenance
4. **Strengthen types** — medium risk, catches future bugs
5. **Simplify control flow** — higher risk, verify with build/test

For each refactor:

- Change one thing at a time
- Verify the build still passes after each change
- If a refactor touches an export, check all importers

### Phase 4 — Accessibility Quick Wins

Only for interactive elements in changed files:

| Element               | Check                         | Fix                                                              |
| --------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `<div onClick>`       | Not keyboard accessible       | Use `<button>` or add `role="button"` + `tabIndex` + `onKeyDown` |
| `<img>` without `alt` | Screen reader invisible       | Add descriptive `alt` or `alt=""` for decorative                 |
| Custom dropdown       | Not ARIA-labeled              | Add `aria-label`, `aria-expanded`, `role="listbox"`              |
| Icon-only button      | No accessible name            | Add `aria-label` or hidden text                                  |
| Color-only indicator  | Invisible to colorblind users | Add text or icon alongside color                                 |

### Phase 5 — Verification

```bash
npx eslint src/ pages/ --format stylish 2>&1
npx tsc --noEmit 2>&1
npx next build 2>&1
```

All three must pass. If tests exist and cover changed code, run them:

```bash
npm test -- --bail 2>&1
```

## Guardrails

- **No speculative refactors.** Every change must address a concrete code smell or measurable improvement. "It might be useful someday" is not a reason.
- **No architecture moves.** Don't reorganize folders, split modules, or change state management patterns unless explicitly asked.
- **Small, safe edits over sweeping rewrites.** A sequence of 5 small changes is safer than 1 big one.
- **Don't change behavior.** If a function returns `null` for edge case X, it should still return `null` after your refactor — even if that behavior seems wrong. Note it, don't fix it, unless asked.
- **Don't add error handling that doesn't exist.** If the code doesn't handle a case, it's because the case doesn't happen in practice. Don't add try/catch speculatively.
- **Don't touch test files** during a simplify pass unless the refactor broke them.

## Output Format

```
## Simplify Report

### Changes Applied
| File | Change | Category | Impact |
|------|--------|----------|--------|
| ChatInput.tsx | Removed unused `tempData` state | Dead code | -12 lines |
| chatService.ts | Typed `response` from `any` to `ChatResponse` | Type safety | Catches misuse at compile time |
| MessageBubble.tsx | Extracted `formatTimestamp()` helper | Duplication | Used in 3 components |
| Header.tsx | `<div onClick>` → `<button>` for theme toggle | A11y | Keyboard accessible |

### Validation
- [x] ESLint clean
- [x] TypeScript clean
- [x] Build passes
- [x] No behavior changes

### Observations (not acted on)
- `ChatView.tsx` has a 60-line render function that could benefit from component extraction — recommend as separate task
- `LibraryContext.tsx` uses `any` for filter state — typing would help but affects multiple consumers
```

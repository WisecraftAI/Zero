---
name: react-pro
description: >-
  Senior React craft from 0.14 through 19: mental models, composition, hooks
  discipline, concurrent rendering, state ownership, error boundaries, forms,
  refs, testing, and a11y. Use whenever writing, reviewing, refactoring, or
  debugging React components, hooks, context, effects, re-renders, keys, forms,
  Suspense, transitions, error boundaries, custom hooks, compound components,
  or SPA architecture. Also trigger on useEffect, useMemo, useCallback, Context,
  prop drilling, stale closure, hydration, React 18, Vite React, or "how would a
  senior React engineer do this." Prefer this over generic React advice. For
  Next.js waterfalls and RSC, also read vercel-react-best-practices.
---

# React Pro

Write React the way a 20-year practitioner does: **UI is a pure projection of
state**, side effects synchronize with the world, and composition beats
inheritance, mixins, and “smart containers.”

This repo’s UI is **React 18.2 + Vite + JSX** in `web/` (`@zero/web`). Do not
import Next.js, React Server Components, or React 19-only APIs into `web/`
unless the user is explicitly upgrading. Language quality lives in **javascript**;
repo UI scope lives in **zero-web**; Next/RSC performance lives in
**vercel-react-best-practices**.

## When invoked

This skill is the default for **all** React in this repo. Do not skip it.

1. Match the **actual React version** in the nearest `package.json` (`web/` is 18.2).
2. Prefer existing file layout: views, components, sibling `.scss`, `web/src/styles/`.
3. Apply the decision tables below. Read a reference file only when that domain is in play.
4. Do not add `useMemo`/`useCallback`/`React.memo` by habit. Measure or have a
   referential-stability reason (memoized child, effect dep).
5. If a proposed change violates the anti-patterns table, rewrite it before shipping.

| Need | Read |
|------|------|
| Effects, stale closures, data fetching, refs | `references/hooks-and-effects.md` |
| Composition, state ownership, context, forms, compound components | `references/composition-and-state.md` |
| Class → hooks, Fiber, concurrent, Strict Mode, error boundaries | `references/legacy-and-concurrent.md` |
| RTL, a11y, keys, lists | `references/testing-and-a11y.md` |

## Non-negotiable mental models

**Render is a calculation.** The function body must be safe to run extra times
(Strict Mode in 18 does). No subscriptions, no DOM writes, no `Math.random()`
for identity, no mutating props or state.

**Commit is when the world changes.** Effects, layout effects, and DOM refs
belong after paint (or layout), not in the render path.

**Identity is the contract.** `key` tells React which state belongs to which
instance. Changing `key` remounts and resets state — that is a feature, not a bug.

**State is a snapshot.** Closures capture the render that created them. Event
handlers should read the latest snapshot they need (functional `setState`,
refs for transient values, or `useEffectEvent` when the runtime has it).

**Effects synchronize.** If you can compute it from props/state during render,
do not store it in an effect. If a user clicked something, put the work in the
handler.

**Colocate, then lift.** Keep state in the lowest component that uses it. Lift
only when siblings must share. Do not start with Context.

## Core standards (this stack)

- Function components only for new code. Convert classes only when touching them.
- Hooks at the top level, same order every render. No hooks in conditions or loops.
- Props and state treated as immutable. Spread/copy; never mutate.
- Stable list keys from domain IDs. Never array index if the list can reorder,
  filter, or insert.
- One component per file; file name matches the export. Co-locate `.scss`.
- Early return for loading/empty **after** hooks, never before.
- Semantic HTML first; ARIA only to fill gaps.
- Client data that is shared: SWR or an existing fetch helper — not N copies of
  `useEffect` + `fetch`.

## Choose the right tool

| Problem | Use | Do not use |
|---------|-----|------------|
| Value shown in UI | `useState` / `useReducer` | `useRef` |
| Timer id, previous value, imperative handle | `useRef` | `useState` (causes renders) |
| Derived list/filter/full name | Compute in render | `useEffect` → `setX` |
| Theme, auth, locale (rare writes) | Context split by concern | One giant store Context |
| High-frequency values (pointer, clock) | Store / `useSyncExternalStore` | Context |
| Server/cache data | SWR / query lib | Mount `useEffect` fetch without abort/cache |
| Filters in a shareable view | URL search params | Hidden React state |
| Complex transitions (player, wizard) | `useReducer` or state machine | Boolean soup |
| User clicked / submitted | Event handler | `submitted` flag + effect |
| External store (Redux, history) | `useSyncExternalStore` | `useEffect` + `setState` subscription |
| CSS show/hide of expensive UI | Keep mounted or `Activity` (19+) | Unmount if local state must survive |
| Urgent vs deferred UI | `startTransition` / `useDeferredValue` | Blocking `setState` for huge lists |

## Hooks: default posture

```jsx
// Derived — render
const visible = items.filter((item) => item.active)

// Depends on previous state — functional update
setCount((n) => n + 1)

// Sync with a socket / listener — effect + cleanup
useEffect(() => {
  const ws = new WebSocket(url)
  ws.onmessage = (event) => setPayload(JSON.parse(event.data))
  return () => ws.close()
}, [url])

// DOM node or non-visual mutable box
const inputRef = useRef(null)
```

**`useMemo` / `useCallback`:** only for expensive work or stable identity passed
into `memo` children or other hook deps. Primitive cheap expressions stay inline.

**`useReducer`:** 3+ fields that change together, or transitions you want to unit-test
without rendering.

## Composition (always)

- `children` and slots over inheritance and mixins.
- Custom hooks for reusable *behavior*; components for reusable *UI*.
- HOCs only for identical wrappers you cannot express as a hook (legacy).
- Compound components when several parts share implicit state (tabs, menu).
- Controlled component: parent owns value. Uncontrolled: DOM/ref owns it until submit.
  Pick one owner. Mixing both without `key` resets causes “can’t type” bugs.

## Concurrent React 18 (this app)

- Rendering may start, throw away, and retry. Keep render pure.
- Updates in timeouts, promises, and native events batch automatically.
- `startTransition` for non-urgent state (tab switch that filters a big tree).
- `Suspense` fallbacks for lazy routes/modals, not for hiding layout chrome.
- Strict Mode double-mounts effects in development — cleanup must be correct
  or you will leak sockets and see duplicate fetches.

Do not add `use()` / Actions / `ref` as a prop unless React 19 is in
`package.json`.

## Performance (SPA)

1. Skip work: colocate state so a typing input does not re-render the dashboard.
2. Virtualize long lists (100+).
3. `React.lazy` for heavy panels not needed on first paint.
4. Then memoize — see **vercel-react-best-practices** for the full checklist.
5. Never memoize as a substitute for fixing state that lives too high.

## Errors and boundaries

- Error boundaries catch render errors in the tree below them, not in event
  handlers, effects, or async code. Pair with try/catch in handlers.
- Put a boundary around a pane (run detail, catalog), not the whole app shell,
  so one crash does not blank the product.
- Log in `componentDidCatch` / a small class boundary; function components
  still need a class or `react-error-boundary` for this.

## Anti-patterns (refuse these in new code)

| Smell | What to do instead |
|-------|-------------------|
| `useEffect` that only `setState`s from props | Derive in render; or `key` to reset |
| Copying props into state “so we can edit them” | Local draft state started from props; reset with `key={id}` |
| `eslint-disable react-hooks/exhaustive-deps` | Fix deps, split effects, or use an event/ref |
| Index keys on dynamic lists | Domain id |
| Fetch in effect without ignoring stale responses | AbortController, request id, or SWR |
| Context for every piece of app state | Lift, compose, or an external store |
| `defaultValue` + `value` on the same input | Controlled *or* uncontrolled |
| `findDOMNode`, string refs, mixins | `useRef`, hooks |
| Defining components inside components | Hoist and pass props (remounts otherwise) |
| `&&` with a count that can be `0` | Ternary / explicit `> 0` |

## This repo (`web/`)

- Edit `web/src/**`, then `npm run build` so `dist/web/` updates.
- Styles: sibling SCSS; tokens in `web/src/styles/`. Themes are CSS variables +
  `data-theme`, not Sass color variables that compile away.
- After logo/theme source changes, `npm run brand:generate`.
- Views own routes/screens; keep presentational pieces small and reusable.
- SSE/run streaming: follow existing `useRunStream` / EventSource patterns —
  do not add polling.

## Review checklist

- [ ] Render is pure; effects have cleanup; deps are honest
- [ ] State is colocated; nothing derived is stored
- [ ] Keys are stable; forms have a single source of truth
- [ ] No accidental waterfalls of client fetches
- [ ] Keyboard and labels work without a mouse
- [ ] Loading/empty/error are explicit, not a blank screen

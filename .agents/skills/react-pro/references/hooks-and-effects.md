# Hooks and effects

Read this when the task involves `useEffect`, fetching, subscriptions, stale
closures, refs, or custom hooks.

## Rules of Hooks

Call hooks only from React function components or custom hooks, at the top
level, every render, same order. Extract a custom hook instead of putting a
hook behind `if`. Early-return **after** all hooks.

## `useEffect` is synchronization

Ask: “What external system must match this state?” If the answer is “nothing
outside React,” you do not need an effect.

| External system | Typical effect |
|-----------------|----------------|
| WebSocket, EventSource, DOM listener | Subscribe + unsubscribe in cleanup |
| `document.title`, non-React widget | Write after commit; restore on cleanup |
| `setInterval` / `setTimeout` | Store id in a ref; clear on cleanup |
| ResizeObserver / IntersectionObserver | Observe node; disconnect on cleanup |

Not effects: filtering, concatenating names, toggling a boolean after click,
resetting state when a prop changes (use `key` on the child), fetching because
the user submitted a form (handler).

## Stale closures

The function from render N closes over props/state from render N.

```jsx
// Wrong: interval sees count = 0 forever
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000)
  return () => clearInterval(id)
}, [])

// Right: functional update
useEffect(() => {
  const id = setInterval(() => setCount((n) => n + 1), 1000)
  return () => clearInterval(id)
}, [])
```

For event handlers that must see latest props without re-subscribing, keep the
handler in a ref updated during render, or `useEffectEvent` on React 19+.

## Fetching

Mount-fetch is the most common source of races:

```jsx
useEffect(() => {
  const ac = new AbortController()
  let cancelled = false

  fetch(url, { signal: ac.signal })
    .then((r) => r.json())
    .then((data) => {
      if (!cancelled) setData(data)
    })
    .catch((err) => {
      if (err.name !== 'AbortError' && !cancelled) setError(err)
    })

  return () => {
    cancelled = true
    ac.abort()
  }
}, [url])
```

Prefer SWR / React Query when the same URL is used in several components.
Do not disable exhaustive-deps to “fetch once”; empty deps with used values
inside is a bug.

## `useLayoutEffect`

Use only when you must measure or mutate the DOM **before** the browser paints
(avoid flicker: tooltip position, scroll restoration). It blocks paint. Default
to `useEffect`.

In SSR/Vite SSR, `useLayoutEffect` warns; gate with `typeof window` or keep
measurement in `useEffect` if flicker is acceptable.

## Refs

- DOM: `useRef(null)` + `ref={nodeRef}`.
- Transient: mouse coords, latest callback, “is mounted” flag for async.
- Do not use a ref as a secret second state tree that the UI must reflect —
  then it should be `useState`.
- `useImperativeHandle` only for parent calling child methods (`focus()`,
  `scrollIntoView()`), never as an API for data flow.

## Custom hooks

Name with `use`. Return a tuple or a named object, not a grab-bag of 12
unrelated values. One hook = one capability (`useRunStream`, `useDebouncedValue`).

Pass primitives into hooks when possible so callers do not recreate options
objects every render (or hoist a module-level default options constant).

## `useSyncExternalStore`

Subscribe to anything React does not own (browser history, a module store,
`matchMedia`). This is the correct concurrent-safe replacement for
`useEffect` + `setState` on an external store.

## React 19 notes (do not use in this repo until upgraded)

- `use()` for promises/context in render
- `useEffectEvent` for non-reactive event logic inside effects
- `ref` as a prop (no `forwardRef` needed)
- `useActionState` / form Actions

This app is React 18.2: `forwardRef` still applies if a child must expose a DOM node.

# History, Fiber, concurrent, errors

Read this when converting class code, explaining “why React does this,” or
adding error boundaries / Suspense.

## Why the old APIs died

| Era | Pattern | Why it lost |
|-----|---------|-------------|
| 0.12–0.14 | `React.createClass` + mixins | Name clashes, implicit coupling, hard to type |
| 0.14–15 | `React.Component` + lifecycles | Easy to duplicate logic; `willReceiveProps` loops |
| 15 | HOCs | Wrapper hell, `static` hoist, ref forwarding |
| 16 | Render props | Verbose nesting; still better than mixins |
| 16.8+ | Hooks | Share behavior without changing the tree |
| 16 | Fiber rewrite | Old stack reconciler could not pause work |

Do not add mixins, `createClass`, or `findDOMNode`. Do not use
`UNSAFE_componentWillMount` / `WillReceiveProps` / `WillUpdate`.

`getDerivedStateFromProps` is almost always a mistake (derived state). Prefer
fully controlled props or `key` remount.

## Fiber in one paragraph

React walks a fiber tree (units of work), can pause, reuse, or throw away an
in-progress render, then commits mutations in one phase. That is why render
must be pure and why “I logged twice in Strict Mode” is expected in 18.

## React 16–18 features to actually use

- **Fragments** `<>` — no extra DOM node.
- **Portals** — modals, toasts, into `document.body` while keeping React
  event/context parent. Manage focus trap yourself.
- **Error boundaries** — class with `getDerivedStateFromError` +
  `componentDidCatch`, or `react-error-boundary`.
- **Automatic batching (18)** — including inside promises. Do not add fake
  `unstable_batchedUpdates` in new code.
- **Transitions** — mark updates that can be interrupted.

## Strict Mode (development)

React 18 remounts the tree and re-runs effects to surface missing cleanup.
If a websocket effect has no cleanup, you get two connections. Fix cleanup;
do not disable Strict Mode.

## Error boundaries

Catch:

- Errors thrown during render of descendants
- Errors in constructors and lifecycle of class descendants

Do not catch:

- Event handlers (use try/catch)
- `setTimeout` / promises (handle in the async path, then `setError`)
- The boundary’s own render
- Server errors unless you throw during render on the client with that data

Show a retry that remounts children via `key` or internal reset state.

## Suspense

In this SPA, use `React.lazy(() => import(...))` + `<Suspense fallback={...}>`
for heavy views (PDF-ish panels, editors). Do not wrap the entire chrome.

Data Suspense (`use` + promises) is a React 19 / RSC story — not this Vite
client unless you introduce a compatible library.

## Concurrent pitfalls

- Side effects in render (including `Date.now()` for keys) produce torn UI.
- Storing results of “maybe this render will commit” in module scope leaks
  across users in SSR; this SPA is client-only but still avoid module
  mutable request state.
- `flushSync` is an escape hatch for measuring DOM after a forced commit.
  Do not sprinkle it to “fix” batching.

## Class → function conversion

Map:

| Class | Function |
|-------|----------|
| `this.state` / `setState` | `useState` / `useReducer` |
| `componentDidMount` + `WillUnmount` | one `useEffect` with cleanup |
| `componentDidUpdate` | `useEffect` with deps, or derive during render |
| `this.props` in async | abort / cancelled flag / functional updates |
| `this.el = React.createRef()` | `useRef` |
| `static contextType` | `useContext` |
| `componentDidCatch` | keep a small class boundary |

Convert when you touch the file; do not rewrite the whole app “for purity.”

# Composition and state ownership

Read this when designing component APIs, Context, forms, or “where should this
state live?”

## Data flow

Props down, events up. The parent that owns the state is the one that can
change it. Children receive values and callbacks, not setters from three
levels up unless you are already lifting.

```
useState (local)
  → lift to parent (siblings share)
    → Context (distant, rare writes)
      → external store (high frequency or many independent subscribers)
```

Prop drilling through 2 levels is clarity. Drilling through components that
never use the prop is a composition smell: pass `children` so the parent
renders the leaf directly.

## Presentational vs container

The 2015 split (Redux containers vs dumb views) is mostly obsolete. Extract
**hooks** for data/behavior and keep the view thin. Do not create
`FooContainer.jsx` + `Foo.jsx` pairs by default.

## Compound components

Use when the parent must coordinate several children without the caller wiring
every prop:

```jsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">{children}</Tabs.Panel>
</Tabs>
```

Share state via context scoped to that primitive, not app-wide Context.
Do not use this for a one-off card with two props.

## Headless hooks vs styled components

If the same behavior needs different markup (list vs table, mouse vs TV
focus), put behavior in `useX` and let each surface render its own DOM.

## Context without the footgun

- Split **value** and **dispatch** (or static config vs changing data) so
  consumers that only call `dispatch` do not re-render on every tick.
- Memoize the Provider `value` object or it is a new reference every render.
- Never put mouse position, scroll offset, or per-keystroke form fields in
  app Context.

## Forms

| Style | When |
|-------|------|
| Controlled inputs | Validation as you type, dependent fields, disable submit from values |
| Uncontrolled + FormData | Simple submit, native constraint validation, fewer renders |
| Library (RHF) | Large forms, field arrays, perf |

Never both `value` and `defaultValue` on the same field. To reset a form when
the record id changes: `<Editor key={recordId} />`.

## State that looks local but is not

- Selected tab, pagination, search query: if the URL should round-trip, put
  it in the URL.
- “Draft vs saved”: keep draft local; write on explicit save.
- Modal open: local unless two distant buttons must open the same modal.

## `key` as a reset

```jsx
<RunDetail key={runId} runId={runId} />
```

This remounts and drops stale closures, stale effects, and leftover local
state. Prefer this over `useEffect(() => { setState(initial) }, [runId])`.

## Children vs render props vs cloned elements

- `children`: default.
- Render prop / function-as-child: child needs data the wrapper loads.
- `cloneElement`: last resort; it couples to child element type and breaks
  if the child is a fragment or memo wrapper.

## Provider hell

If the tree is 8 providers deep, compose a `AppProviders` that nests them in
one place. Do not invent a global service locator. Order matters (router
outside data that needs location).

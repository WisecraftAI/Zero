# Testing and accessibility

Read this when writing tests, fixing list rendering, or keyboard/screen-reader
behavior.

## Testing Library posture

Test what the operator sees and does, not fiber internals.

```jsx
render(<NewRunView />)
await user.click(screen.getByRole('button', { name: /start run/i }))
expect(await screen.findByText(/queued/i)).toBeInTheDocument()
```

- Query by **role + name**, then label text, then placeholder. `getByTestId`
  is last.
- `userEvent` over `fireEvent` (real tab order, pointer events).
- Avoid asserting on CSS class names or Redux store shape.
- Wrap async assertions in `findBy*` / `waitFor`. Do not add extra `act()`
  unless the test warns.
- Mock network at the fetch/SWR boundary, not `useState` inside the component.

Do not snapshot huge trees; they rot. Snapshot small, stable markup if at all.

This repo’s Jest suite is mostly Node (API/orchestrator). New UI tests should
follow the above if you add RTL; Playwright e2e covers operator flows.

## Lists and keys

```jsx
{runs.map((run) => (
  <RunRow key={run.id} run={run} />
))}
```

Index keys are acceptable only for **static** lists that never reorder
(icon row of three constants). Filtered/sorted/inserted rows need ids.

Reusing a component type with a new `key` resets that instance (form,
player, wizard). Use it on purpose.

## Accessibility baseline

- Buttons are `<button type="button">` (or `submit` in forms), not `<div
  onClick>`.
- Inputs have a visible `<label>` or `aria-label` when the label is visual-only.
- Focus order matches visual order. Modals trap focus and restore it on close.
- Do not remove outlines without a `:focus-visible` replacement.
- Images that convey meaning have `alt`; decorative images `alt=""`.
- Live status (run progress): `aria-live="polite"` on the status region, not
  on every log line.
- Color is not the only status signal (pass/fail needs text or icon + text).
- `prefers-reduced-motion`: do not ship essential information only in
  animation.

ARIA:

- Prefer native elements over `role`.
- `aria-expanded`, `aria-controls` on disclosure/tabs.
- Do not duplicate names (`aria-label` that repeats visible text).

## Hydration / first paint (SPA)

Vite SPA has no RSC hydration mismatch, but `localStorage` in render still
disagrees with SSR if you ever SSR. Read storage in an effect or a blocking
inline script for theme (see **dark-mode** / **vercel-react-best-practices**
§ hydration) so the first paint does not flash.

`suppressHydrationWarning` is only for known text mismatches (timestamps),
not a blanket ignore.

## Empty, loading, error

Every async surface has three explicit states. Do not leave a blank panel.
Skeletons should reserve height to avoid layout shift.

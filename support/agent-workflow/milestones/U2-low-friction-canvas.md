# U2 — Ultra-low-friction canvas

U2 is a **presentation milestone**. The operator’s primary job is: paste a URL, start a
run, watch output. Chrome (nav, theme, advanced options) is a contextual frame, not a
dashboard. Inspired by Linear / Vercel / Apple density — not by chatbot or marketing
layouts.

> Presentation only. U2 does not change pipeline behaviour, APIs, classification, or
> form field names / handlers / submit payloads.

## Outcome

A QA operator reaches “run started” from New Run in **one primary action** (URL +
Enter / Run). Advanced options stay in the same viewport behind progressive disclosure.
About **85%** of the viewport is the content canvas (`main#main-content`), not chrome.

## Depends on

U1 (tokens, landmarks, theme). Parallel to Q5. Do not block on Q5.

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| SPA | `web/` | `/zero-web` |

## Canonical contract

1. **Canvas first.** `--sidebar-w` stays a slim rail; labels appear on hover /
   `:focus-within` / explicit expand. `main` owns the remaining width.
2. **No wizard for the primary path.** New Run is one scrolling canvas (`nrv--canvas`).
   Step chrome may remain in the DOM for compatibility but is not the default path.
3. **Progressive disclosure.** Credentials, channel override, optional agents, recording,
   and similar secondary fields live in `.nrv-disclose` (`<details>`) — same inputs,
   same `name=` attributes.
4. **Fewer confirms.** Run is always a visible `<button type="submit">` (native Enter
   in the URL field submits). Do not add a second confirmation modal.
5. **Invisible AI.** No chatbot column, no centered marketing prompt, no gradient hero
   copy. Domain hint stays a quiet inline line.

## Deliverables

### D1 — Single-canvas New Run

- Root view class `nrv--canvas`.
- Launch / Run submit is always in the footer (not only on the last wizard step).
- Wizard step tabs and Next/Back are visually secondary (CSS-hidden in the canvas
  treatment).

**Exit:** URL + Run is possible without clicking through five steps.

### D2 — Hover rail and quiet chrome

- Sidebar expands on `:hover` / `:focus-within` as well as `.sidebar--expanded`.
- Decorative topbar search / bell / help do not compete with the canvas (hidden until
  the topbar is hovered, or visually muted).
- At `≤768px` the rail overlays instead of permanently eating the canvas.

**Exit:** New Run remains usable at ~375px width.

### D3 — Disclosure, not modals

- Secondary New Run fields use `.nrv-disclose` / `<details>`.
- No new modal overlay for configuration.

**Exit:** source contains `nrv-disclose` and no new config-modal component.

### D4 — Proof

- `test/ui-ux-friction.test.js` (source-level: canvas class, disclose, hover rail,
  always-on submit).
- `npm run workflow:verify -- --milestone U2` exits 0.

## Success measures

- Primary content is `main#main-content`; sidebar default width is the token rail.
- New Run submit button exists independently of `step === last`.
- No new pipeline routes or `stageKeys` changes.

## Acceptance

- [ ] `nrv--canvas` on New Run root.
- [ ] `.nrv-disclose` wraps secondary fields; input `name`s unchanged.
- [ ] Sidebar CSS expands on `:hover` or `:focus-within`.
- [ ] `type="submit"` Run control is not gated to the last wizard step only.
- [ ] `test/ui-ux-friction.test.js` exists and passes.
- [ ] `npm run workflow:verify -- --milestone U2` exits 0.
- [ ] UI edits stay in `web/src/**` (rebuild with `npm run build`).

## Out of scope

- Auto-POST on debounce (would change submit timing / logic)
- Q5 classification UI
- Chatbot / Copilot pane
- New APIs

## Definition of done

U2 is done when acceptance is green, verify U2 exits 0, and `progress.json` `ux.U2`
is `done`. Flattening CSS without an always-on submit does not close U2.

## Verify

```bash
npm test -- test/ui-ux-friction.test.js
npm run workflow:verify -- --milestone U2
```

Implement via `/zero-web`. North star: `prompts/ui-ux.md`.

## Follow-ons after close (not a new milestone)

- Run Detail `FlowDiagram` (`web/src/components/FlowDiagram.jsx`) for discovered journeys
- Keep New Run as a single canvas; do not add a wizard to “explain” the diagram


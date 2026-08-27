# U1 — Professional operator UI/UX

U1 is a **quality milestone for the SPA**. Tokens, a light/dark theme, and a FOWT-safe
boot script already exist. The console still does not meet an operator-grade bar:
keyboard users cannot skip chrome, type is not a scale, nav state is not exposed to
assistive tech, and there is no behavioural proof that shell + core flows stay usable.

> Presentation only. U1 does not change pipeline behaviour, APIs, or classification.

## Outcome

A QA operator can complete New Run → live Run Detail → Dashboard on a laptop or
narrow viewport, in light or dark theme, with keyboard and reduced motion, without
fighting the chrome. Visual language is one token system, not per-view hex.

## Baseline: what already shipped

- Semantic tokens and a `[data-theme="light"]` override live in `web/src/index.css`.
- Theme is resolved in `web/index.html` before paint and toggled from the sidebar.
- `:focus-visible` and `prefers-reduced-motion` exist globally.
- Several views have ad-hoc `@media` breakpoints; the shell (sidebar/topbar) does not.

These are characterization facts, not permission for a visual rewrite of every screen.

## Depends on

S7 (SPA in `web/` / `zero-web`).

## Parallel to Q5

Q1–Q5 product behaviour is unchanged. Do not block on Q5 closing — UI work may land in
parallel on `web/src/**` only.

## Workspaces

| Area | Folder | Skill |
|------|--------|-------|
| SPA | `web/` | `/zero-web` |
| Docs score | `support/zero-docs/` | `/zero-architecture` (status only) |

## Scope boundary

U1 covers the operator shell and the four daily surfaces:

`Dashboard`, `Runs` / `New Run`, `Run Detail`, `Integrations` (plus Locators / API Keys /
Agents as same-system restyles, not new IA).

Placeholder “Soon” items (Pipelines, Reports, Team, Settings) stay disabled. Fake
profile copy may be neutralized; do not invent account management.

## Canonical contract

1. **Tokens first.** Color, type, space, radius, and focus come from `web/src/index.css`.
   View CSS may compose tokens; it may not introduce a second palette.
2. **Landmarks.** Skip link → `#main-content`. One `<main>` labelled for the current view.
   Sidebar is `<nav>` with `aria-current="page"` on the active item.
3. **Theme.** `data-theme` is `light` | `dark`. Both meet WCAG 2.2 AA for body text
   (4.5:1) and UI contrast (3:1). Toggle has an accessible name that states the *next*
   mode.
4. **Density.** A documented type scale (`--fs-*`) and spacing scale (`--space-*`)
   replace one-off `13px` / magic padding in new or touched rules.
5. **States.** Each of the four daily surfaces has an empty, loading, and error
   treatment that tells the operator what to do next.
6. **Narrow viewports.** At `≤768px` the sidebar does not permanently steal the canvas;
   primary actions (New Run, back to runs) remain reachable.

## Deliverables

### D1 — Design-system contract

- Document the token set (color, type `--fs-*`, space `--space-*`, radius, motion).
- Strip newly introduced hardcoded theme colors from files this milestone touches.

**Exit:** a reviewer can restyle the console by editing `:root` / `[data-theme]` only.

### D2 — Shell, IA, and keyboard

- Skip link, `main#main-content`, `aria-current`, theme toggle name, collapse control
  name.
- Focus order: skip → New Run → nav → main. No focus trap in the collapsed rail.

**Exit:** keyboard-only pass of shell + New Run without a pointer.

### D3 — Daily operator flows

- Align Dashboard, Runs, New Run, and Run Detail empty/loading/error copy and spacing
  with the token scale.
- Keep SSE live status readable in both themes (no low-contrast “Live” chips).

**Exit:** the four flows look like one product, not four templates.

### D4 — Responsive chrome

- Sidebar becomes overlay or collapsible drawer at `≤768px`; content is not trapped at
  `48px` offset without a way to recover canvas.

**Exit:** New Run is usable at a 375px-wide viewport.

### D5 — Proof

- Add `test/ui-ux-shell.test.js` (source-level: skip link, landmarks, tokens, theme
  boot). Static `workflow:verify` probes stay diagnostics; the test file is required.
- Browser-check the four flows in light and dark after `npm run client` (or built SPA).

**Exit:** `npm run workflow:verify -- --milestone U1` exits 0 only when D1–D4 probes
and the test file exist.

## Success measures

- Body text vs `--bg` / `--surface` meets **4.5:1** in both themes for primary copy.
- Interactive controls have a visible `:focus-visible` ring using `--accent`.
- Type scale has at least four `--fs-*` steps used by the shell or daily views.
- No new view-level hex for themeable surfaces in files this milestone edits.
- Skip link is the first focusable node in the shell.

## Acceptance

- [ ] Skip link targets `#main-content`; `<main id="main-content">` exists in AppShell.
- [ ] Active sidebar item sets `aria-current="page"`.
- [ ] `--fs-*` and `--space-*` scales exist in `web/src/index.css`.
- [ ] Light and dark tokens remain the only theme palettes.
- [ ] Narrow viewport does not permanently obscure primary content behind the rail.
- [ ] Empty / loading / error exist on Dashboard, Runs, New Run, and Run Detail.
- [ ] `test/ui-ux-shell.test.js` exists and passes.
- [ ] `npm run workflow:verify -- --milestone U1` exits 0.
- [ ] UI edits stay in `web/src/**` (rebuild with `npm run build`).

## Rollout and rollback

1. Land shell landmarks + tokens without restyling every view.
2. Restyle daily flows against the scale.
3. Add the responsive drawer last.
4. If contrast regresses, revert view CSS; keep the token file as source of truth.

## Out of scope

- OIDC / login screen (closes M5 → full done; separate)
- Q5 classification override or taxonomy editor
- New pipeline stages, API routes, or Playwright behaviour
- Rewriting zero-docs / architecture HTML as the product UI
- Illustration-heavy marketing chrome

## Definition of done

U1 is done only when acceptance is green, `workflow:verify -- --milestone U1` exits 0,
`progress.json` `ux.U1` is `done`, and Architecture shows the same status. Theme tokens
alone cannot close U1.

## Verify

```bash
npm test -- test/ui-ux-shell.test.js
npm run workflow:verify -- --milestone U1
```

Implement via `/zero-web`. North star: `prompts/ui-ux.md`.

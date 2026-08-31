# Operator UI/UX — north star (U1–U3)

ZER0’s SPA is an **operator console**, not a marketing site. The audience is a QA
lead who starts runs, watches a pipeline, and reads artifacts. Every visual choice
must make that job faster. From **U3**, the data layer is RTK Query — not ad-hoc
`fetch` in `App.jsx`.

## Product voice

- Names match what the operator controls: New Run, Runs, Live — not “submit orchestration job”.
- Empty and error states say what to do next.
- Density over decoration. One accent, quiet chrome, tabular numbers for metrics.

## Tracks

| Id | Intent | Spec |
|----|--------|------|
| **U1** | Accessible, token-driven shell (landmarks, type/space, theme, narrow viewport) | `milestones/U1-professional-ui-ux.md` |
| **U2** | Ultra-low-friction canvas (one-screen New Run, hover rail, disclose advanced) | `milestones/U2-low-friction-canvas.md` |
| **U3** | Redux Toolkit store — RTK Query for runs/settings/ops; SSE cache patches; App only routes | `milestones/U3-redux-store.md` |

U1–U3 are **done**. The shipped U3 contract remains mirrored in
`support/zero-docs/src/data/uxStoreMilestone.ts`.

## Hard rules

- Edit `web/src/**` only (plus root `eslint.config.js` for U3 Phase 0); rebuild with `npm run build`.
- No Playwright, `pg`, or `@zero/cloud` in the client.
- Do not persist login passwords in `localStorage` or logs.
- Do not change `/runs` contracts or pipeline `stageKeys` to “make the UI nicer”.
- Prefer tokens in `web/src/styles/` over per-view hex.
- **U2:** do not change form field `name`s, handlers, or submit payloads. Layout, CSS,
  and disclosure markup only.
- **U3:** RTK Query owns server state. Do **not** put route / theme / wizard drafts /
  elapsed ticks into Redux. Do **not** reimplement Query with `runsSlice` + thunks.
  `POST /runs` stays **FormData**. SSE updates go through `updateQueryData`, not
  React `useState` in `App`.

## Forbidden layouts (U2)

- Chatbot bubbles / ChatGPT clones
- Centered SaaS hero + gradient prompt
- Multi-step wizards as the only path to Run
- Extra confirm modals when native submit / Enter is enough

## U3 agent cut

1. Phase 0 — React hooks ESLint + error boundary + `<RunElapsed />`
2. Store + `runsApi` + `Provider` + `RunStreamBridge` — drain `App` of runs/SSE/poll/stop/rerun
3. `settingsApi` + `opsApi`
4. Lazy views + split `RunDetailView` + stable keys + `memo`

Full contract: `milestones/U3-redux-store.md`.

## U3 session isolation

Treat each item in the agent cut as a separate PR and a fresh context window.
Keep this file and `milestones/U3-redux-store.md` pinned as read-only reference
files. The PR plan is the source of truth for the source-file allowlist.

Do not read the whole codebase, past agent transcripts, completed PR files, or
unrelated store directories. Read only the allowlisted slice and, when blocked
by an import or interface, request the smallest additional file and explain why.
In particular:

- PR 2 is scoped to the `App.jsx` / `useRunStream` run-state seam, its named run
  consumers, and the run-store modules being introduced.
- PR 4 is scoped to lazy route composition and `RunDetailView` extraction; treat
  existing store hooks and selectors as fixed public interfaces.

Repository-wide lint/build/test commands are allowed for verification, but their
output only permits investigation of failures caused by the current PR.

## Skills

| Ask | Skill |
|-----|--------|
| Implement U1 / U2 / U3 | `/zero-web` + this prompt + matching `milestones/U{N}-*.md` |
| Design critique / a11y / tokens | `design-foundations` |
| Theme contrast / FOWT | `dark-mode` |
| React / RTK craft | `react-pro` · `javascript` |

## Loop

Same as `WORKFLOW.md`: DETECT still prints **Q5 first** while product probes fail.
When the user asks for UI/UX or SPA store work, implement the earliest unfinished
**U*** anyway (parallel track). Verify with:

```bash
npm run workflow:verify -- --milestone U3
```

Do not mark `progress.json` `ux.U3` done until that command exits 0.

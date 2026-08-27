# Operator UI/UX — north star (U1–U2)

ZER0’s SPA is an **operator console**, not a marketing site. The audience is a QA
lead who starts runs, watches a pipeline, and reads artifacts. Every visual choice
must make that job faster.

## Product voice

- Names match what the operator controls: New Run, Runs, Live — not “submit orchestration job”.
- Empty and error states say what to do next.
- Density over decoration. One accent, quiet chrome, tabular numbers for metrics.

## Tracks

| Id | Intent | Spec |
|----|--------|------|
| **U1** | Accessible, token-driven shell (landmarks, type/space, theme, narrow viewport) | `milestones/U1-professional-ui-ux.md` |
| **U2** | Ultra-low-friction canvas (one-screen New Run, hover rail, disclose advanced) | `milestones/U2-low-friction-canvas.md` |

## Hard rules

- Edit `web/src/**` only; rebuild with `npm run build`.
- No Playwright, `pg`, or `@zero/cloud` in the client.
- Do not persist login passwords in `localStorage` or logs.
- Do not change `/runs` contracts or pipeline `stageKeys` to “make the UI nicer”.
- Prefer tokens in `web/src/index.css` over per-view hex.
- **U2:** do not change form field `name`s, handlers, or submit payloads. Layout, CSS,
  and disclosure markup only.

## Forbidden layouts (U2)

- Chatbot bubbles / ChatGPT clones
- Centered SaaS hero + gradient prompt
- Multi-step wizards as the only path to Run
- Extra confirm modals when native submit / Enter is enough

## Skills

| Ask | Skill |
|-----|--------|
| Implement U1 / U2 | `/zero-web` + this prompt + matching `milestones/U{N}-*.md` |
| Design critique / a11y / tokens | `design-foundations` |
| Theme contrast / FOWT | `dark-mode` |

## Loop

Same as `WORKFLOW.md`: DETECT still prints **Q5 first** while product probes fail.
When the user asks for UI/UX work, implement the earliest unfinished **U*** anyway
(parallel track). Verify with `npm run workflow:verify -- --milestone U1` (or `U2`).
Do not mark `progress.json` done until that command exits 0.

```bash
npm run workflow:verify -- --milestone U2
```

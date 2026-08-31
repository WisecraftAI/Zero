# Implementer agent

You implement exactly the milestone in the planner’s sketch. Follow `WORKFLOW.md`. For S3–S6 follow `prompts/packaging.md`; for M1–M7 follow `prompts/target-arch.md`; for Q1–Q5 follow `prompts/autonomous-qa.md`; for U1–U3 follow `prompts/ui-ux.md` and `/zero-web`.

## Rules

1. Read the milestone spec acceptance list before editing.
2. Talk to infrastructure only through `@zero/cloud`.
3. Preserve pipeline `stageKeys` order and locator merge semantics.
4. Never log or persist login passwords.
5. Ask before destructive migrations or breaking public API contracts.
6. Keep changes reviewable — one milestone, one concern.
7. After code changes, run `npm run workflow:verify -- --milestone {id}` and fix until green (or document blockers).
8. Update `support/agent-workflow/progress.json` only after verify passes.
9. Treat the planner's session allowlist as closed. Do not read or edit past PR
   files, unrelated store directories, agent transcripts, or repository-wide
   source unless the user explicitly expands the scope.
10. When a required import or interface is outside the allowlist, stop and
    request that single file with a concrete reason.

## U3 context contract

Keep `support/agent-workflow/milestones/U3-redux-store.md` and
`support/agent-workflow/prompts/ui-ux.md` pinned as read-only references in every
U3 PR session. They anchor behavior but do not authorize reading other files.
PR 2 receives only the `App.jsx` / `useRunStream` run-state seam, named run
consumers, and required run-store modules. PR 4 receives only route-loading
composition plus `RunDetailView` and its extracted modules; existing store APIs
are fixed interfaces unless a failure proves otherwise.

## Local-first

Default new wiring to `ZERO_CLOUD=local` so `npm start` works without cloud credentials.
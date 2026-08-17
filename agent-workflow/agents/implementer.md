# Implementer agent

You implement exactly the milestone in the planner’s sketch. Follow `WORKFLOW.md` and `prompts/target-arch.md`.

## Rules

1. Read the milestone spec acceptance list before editing.
2. Talk to infrastructure only through `lib/cloud/*`.
3. Preserve pipeline `stageKeys` order and locator merge semantics.
4. Never log or persist login passwords.
5. Ask before destructive migrations or breaking public API contracts.
6. Keep changes reviewable — one milestone, one concern.
7. After code changes, run `npm run workflow:verify -- --milestone M{N}` and fix until green (or document blockers).
8. Update `agent-workflow/progress.json` only after verify passes.

## Local-first

Default new wiring to `ZERO_CLOUD=local` so `npm start` works without cloud credentials. Cloud providers land in M7 (or thin stubs earlier if needed).

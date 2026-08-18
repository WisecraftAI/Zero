# Locators coder (`/zero-locators`)

Per-workspace coder for the **Locator registry**. Use this persona for any change that lives inside `packages/locators/`. Cross-workspace routing is `repo-coder.md`; capability / packaging milestones follow `planner.md → implementer.md → verifier.md`.

## Identity

| | |
|--|--|
| **Workspace** | Locator registry |
| **Folder** | `packages/locators/` |
| **npm package** | `@zero/locators` |
| **Cursor skill** | `/zero-locators` |
| **Prompt** | `support/agent-workflow/prompts/repos/locators.md` |
| **Docs tab** | zero-docs → Tech → Locator registry (`#tech-locators`) |

## When to invoke

- User names locator merge, `element_locators`, element-key normalization, or profile → memory → DB order.
- Change stays inside `packages/locators/`.
- Escalate if the ask requires the executor or orchestrator to change how they resolve selectors.

## You may change

- `packages/locators/**`. Adjust the merge chain, add a source, extend the normalizer.

## You must not

- Break the merge order profile → memory → DB.
- Perform I/O directly here — persistence happens through `@zero/db` at the edges.
- Fragment element keys — always normalize so learning accumulates across runs.

## Design pattern (honour)

- Chain of responsibility — profile, then memory, then DB; first confident match wins.
- Pure merge — resolution has no side effects.
- Normalized keys — one canonical element key per host + intent.

## Procedure

1. **DETECT** — read `AGENTS.md` and zero-docs → Tech → Locator registry. Note current merge behaviour.
2. **PLAN** — restate the change; specify which link in the chain is affected and any new normalization rules.
3. **IMPLEMENT** — pure resolution; persistence only through `@zero/db`.
4. **VERIFY** — run integration tests where the executor upserts locators; `npm test` from repo root.
5. **ADVANCE** — update `progress.json` and mirror in `support/zero-docs/src/data/migration.ts` when a milestone flips.

## References

- Prompt: `support/agent-workflow/prompts/repos/locators.md`
- Router: `support/agent-workflow/agents/repo-coder.md`
- Docs: zero-docs → Tech → **Locator registry** (`#tech-locators`)

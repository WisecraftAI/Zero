# Cloud coder (`/zero-cloud`)

Per-workspace coder for the **Cloud adapters**. Use this persona for any change that lives inside `packages/cloud/`. Cross-workspace routing is `repo-coder.md`; capability / packaging milestones follow `planner.md → implementer.md → verifier.md`.

## Identity

| | |
|--|--|
| **Workspace** | Cloud adapters |
| **Folder** | `packages/cloud/` |
| **npm package** | `@zero/cloud` |
| **Cursor skill** | `/zero-cloud` |
| **Prompt** | `support/agent-workflow/prompts/repos/cloud.md` |
| **Docs tab** | zero-docs → Tech → Cloud adapters (`#tech-cloud`) |

## When to invoke

- User names `ZERO_CLOUD`, S3, SQS, GCS, Pub/Sub, Azure Blob, Vercel Blob, adapters, or the GATE-9 conformance suite.
- Change stays inside `packages/cloud/` and touches only the four contracts (ObjectStore · Queue · Secrets · Cache).
- Escalate if the ask requires callers to change (that is the API / orchestrator / executor persona).

## You may change

- `packages/cloud/**`. Add a provider folder; extend the abstract factory in `packages/cloud/index.js`.

## You must not

- Leak a vendor type or SDK import outside `@zero/cloud` — this is the only place vendor SDKs live.
- Add a cloud SDK to runtime `dependencies` — SDKs are lazy-required on demand.
- Break existing providers — the GATE-9 conformance suite must pass for `local | aws | gcp | azure | vercel`.

## Design pattern (honour)

- Adapter — one adapter per capability per provider.
- Abstract factory — `ZERO_CLOUD` selects the implementation at boot.
- Conformance suite — the same contract tests run against every provider.
- Lazy-required SDKs — never top-level `require`.

## Procedure

1. **DETECT** — read `AGENTS.md`, `packages/cloud/index.d.ts`, and zero-docs → Tech → Cloud adapters. Note the current provider list.
2. **PLAN** — restate the change; specify which of ObjectStore / Queue / Secrets / Cache is affected and which provider(s).
3. **IMPLEMENT** — add a provider folder + adapter files; wire the factory; keep SDK imports lazy.
4. **VERIFY** — GATE-9 conformance suite must pass for every provider; `npm test` runs the shared contract tests.
5. **ADVANCE** — update `progress.json` and mirror in `support/zero-docs/src/data/migration.ts` when a milestone flips.

## References

- Prompt: `support/agent-workflow/prompts/repos/cloud.md`
- Router: `support/agent-workflow/agents/repo-coder.md`
- Docs: zero-docs → Tech → **Cloud adapters** (`#tech-cloud`)

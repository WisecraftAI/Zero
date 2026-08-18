# API coder (`/zero-api`)

Per-workspace coder for the **HTTP API**. Use this persona for any change that lives inside `services/api/`. Cross-workspace routing is `repo-coder.md`; capability / packaging milestones follow `planner.md → implementer.md → verifier.md`.

## Identity

| | |
|--|--|
| **Workspace** | HTTP API |
| **Folder** | `services/api/` |
| **npm package** | `@zero/api` |
| **Cursor skill** | `/zero-api` |
| **Prompt** | `support/agent-workflow/prompts/repos/api.md` |
| **Docs tab** | zero-docs → Tech → HTTP API (`#tech-api`) |

## When to invoke

- User names routes, Express, auth, SSE, presigned uploads, `/runs` (S7 dropped `/api` prefix), or provider-keys / agent-settings.
- Change stays inside `services/api/` and does not add pipeline logic.
- Escalate if the ask requires the DAG walk (that is the orchestrator) or Chromium (that is the executor).

## You may change

- `services/api/**`. Add routes under `services/api/src/routes/`; keep `server.js` a thin composition root.

## You must not

- `require('playwright')` or boot a worker in this image — Playwright is not resolvable here.
- Define `processRun` or walk `stageKeys` — that belongs to `@zero/orchestrator`.
- Statically serve `/artifacts` — always use signed URLs from `@zero/cloud`.
- Log or persist login passwords; secrets are runtime-only via `runSecrets`.

## Design pattern (honour)

- Ports & adapters — routes are thin; real work sits behind `@zero/*` packages.
- Middleware pipeline — helmet, cors, compression, morgan, rate-limit, auth, validate.
- Transactional outbox — persist the run row and publish `runs.requested` together, return 202.
- Config-once — env is read and validated at boot.

## Procedure

1. **DETECT** — read `AGENTS.md` and zero-docs → Tech → HTTP API. Confirm the change is HTTP-only.
2. **PLAN** — restate the change; list route files to touch and the request/response contract.
3. **IMPLEMENT** — add a route module under `services/api/src/routes/`; keep handlers small; validate with `express-validator`.
4. **VERIFY** — `npm start` runs API-only; `npm run start:all` for local end-to-end. Run `npm test` and `npm run workflow:verify` if a milestone is in flight.
5. **ADVANCE** — update `progress.json` and mirror in `support/zero-docs/src/data/migration.ts` when a milestone flips.

## References

- Prompt: `support/agent-workflow/prompts/repos/api.md`
- Router: `support/agent-workflow/agents/repo-coder.md`
- Docs: zero-docs → Tech → **HTTP API** (`#tech-api`)

# S2 — Turn on workspaces

Root becomes workspaces-only. Shared code lives in `packages/*`, deployables in `services/*`, UI in `web/`. Imports use npm package names (`@zero/api`). Still one Node process.

## Status

**Done.** Root `package.json` declares `"workspaces": ["services/*", "packages/*", "web"]`.

## Depends on

S1.

## Acceptance

- [x] Root workspaces include `services/*`, `packages/*`, `web`
- [x] `services/api/package.json`, `packages/cloud/package.json`, `web/package.json` exist
- [x] `npm run workflow:verify -- --milestone S2` exits 0

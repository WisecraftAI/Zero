# S6 — Cloud adapters · remaining providers

`@zero/cloud` already has `local` + `aws` + `gcp`. Finish the adapter set: Azure, Vercel-hybrid, and GATE-9 conformance tests that run against every provider.

## Depends on

S2 (can proceed in parallel with S4/S5 **after** S3 if needed; default order is after S5).

## Workspace

| | |
|--|--|
| **Workspace** | Cloud adapters |
| **Folder** | `packages/cloud/` |
| **npm package** | `@zero/cloud` |
| **Cursor skill** | `/zero-cloud` |

## Scope

- Add `packages/cloud/azure/index.js` exporting ObjectStore · Queue · Secrets · Cache.
- Add `packages/cloud/vercel/index.js` (R2 / QStash / env secrets / Upstash-shaped cache).
- Add `packages/cloud/conformance/` with the same suite imported by each provider (GATE-9).
- Domain code still must not import vendor SDKs.

## Acceptance

- [ ] Azure adapter entrypoint exists
- [ ] Vercel adapter entrypoint exists
- [ ] Conformance suite directory has at least one spec file
- [ ] `ZERO_CLOUD=local` still boots without vendor SDKs
- [ ] `npm run workflow:verify -- --milestone S6` exits 0

## Out of scope

- Rewriting aws/gcp adapters that already pass M7 probes
- Changing HTTP API routes

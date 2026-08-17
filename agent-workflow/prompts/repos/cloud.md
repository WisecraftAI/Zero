# Cloud adapters — coding prompt

**Workspace:** Cloud adapters  
**Folder:** `packages/cloud/`  
**npm package:** `@zero/cloud`  
**Cursor skill:** `/zero-cloud`

## Purpose

The only place that imports vendor SDKs. `ObjectStore` · `Queue` · `Secrets` · `Cache`, switched by `ZERO_CLOUD`.

## Design patterns

- Adapter — each provider exports the same surface as `index.d.ts`
- Abstract factory — `index.js` switches on `ZERO_CLOUD`
- Conformance suite — same tests, every provider (GATE-9; not landed yet)

## You may change

- `packages/cloud/local|aws|gcp/**` and `index.js` / `index.d.ts`
- `infra/aws`, `infra/gcp` when the adapter needs a resource

## You must not

- Change domain/agent code to import `@aws-sdk` or `@google-cloud` directly
- Break `presignPut` / `publish` / `subscribe` signatures
- Default production to a missing provider

## Honour

- `ZERO_CLOUD=local|aws|gcp` (azure/vercel are not implemented — say so, do not fake them)
- Local queue is in-process; do not claim it works across containers
- Lazy-require vendor SDKs so `npm start` works without them installed

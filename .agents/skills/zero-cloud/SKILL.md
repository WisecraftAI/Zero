---
name: zero-cloud
description: >-
  Code ZER0 cloud adapters in packages/cloud (@zero/cloud): ObjectStore,
  Queue, Secrets, Cache switched by ZERO_CLOUD (local, aws, gcp, azure,
  vercel). Use whenever the user asks to update ZERO_CLOUD, S3, SQS, GCS,
  Pub/Sub, signed /cloud/local URLs, Redis queue, or @zero/cloud. Prefer
  this over API/orchestrator skills when the change is an adapter — vendor
  SDKs belong only in this package.
---

# @zero/cloud

The only place that imports vendor SDKs. Four primitives — `objectStore`, `queue`, `secrets`, `cache` — switched by `ZERO_CLOUD`. Keep `index.d.ts` contracts stable.

## When this skill owns the task

Stay inside `packages/cloud/` (and `infra/aws` / `infra/gcp` when an adapter needs a resource).

Escalate instead of stretching this package when the ask is:

- Mounting `/cloud` in Express → `@zero/api` (it uses `@zero/cloud/http`)
- What to put on `runs.requested` → `@zero/orchestrator` / `@zero/domain`

Read `support/agent-workflow/prompts/repos/cloud.md` before editing.

## Layout

```
packages/cloud/
  index.js / index.d.ts     # createCloudBindings(process.env)
  lib/provider.js           # SUPPORTED_PROVIDERS + lazy loadProvider
  http.js                   # GET|PUT /cloud/local router
  local/                    # disk store + in-process queue
  aws/  gcp/  azure/ vercel/
  redisQueue.js / redisCache.js
  conformance/gate9.js
```

`index.js` is `createCloudBindings(process.env)`. Bindings expose `{ provider, objectStore, queue, secrets, cache, storage }` (`storage` is a deprecated alias of `objectStore`).

## Providers

`SUPPORTED_PROVIDERS`: `local` | `aws` | `gcp` | `azure` | `vercel`.

Unknown `ZERO_CLOUD` throws. Default is `local`.

| Provider | Object store | Queue | Secrets | Cache |
|----------|--------------|-------|---------|-------|
| `local` | `dist/artifacts/cloud-store` HMAC-signed `/cloud/local` | Redis LIST/pubsub if `REDIS_URL` is set; else **in-process** (does not cross containers) | env/memory | Redis if `REDIS_URL`, else memory |
| `aws` | S3 | SQS | Secrets Manager | Redis |
| `gcp` | GCS | Pub/Sub | Secret Manager | Redis |
| `azure` / `vercel` | Adapter surfaces exist (S6 / GATE-9). Lazy-require SDKs. Do not default production here without a product ask. |

`npm run start:all` and `Dockerfile.demo` share one process, so the in-process queue is enough. Compose splits API / orchestrator / executor — they need `REDIS_URL` even when `ZERO_CLOUD=local`, or `execution.requested` never leaves the publisher.

Lazy-require vendor SDKs so `npm start` works without them installed. Do not add `@aws-sdk` / `@google-cloud` as runtime deps of api/orchestrator/executor.

## Contracts (`index.d.ts`)

Do not break signatures:

- `ObjectStore`: `presignPut` / `presignGet` / `put` / `get` / `remove`
- `Queue`: `publish(topic, msg, { dedupId })` / `subscribe` → unsubscribe
- `Secrets`: `get` / `put`
- `Cache`: `get` / `set` / `publish` / `subscribe`

Topics used by the product: `runs.requested`, `execution.requested`, `execution.completed`, plus `state.${runId}` on cache for SSE hints.

## Invariants

- Domain/agent code must not import vendor SDKs directly (`test/packaging.boundaries.test.js`).
- Do not claim the local in-process queue works across Compose services.
- `ZERO_CLOUD=local` stores blobs under the artifacts tree; `/artifacts` is not statically served.

## How to change

1. Shared switch → `lib/provider.js` + `lib/index.js`.
2. One cloud → `packages/cloud/<provider>/`.
3. Signed local HTTP → `http.js` (API mounts it at `/cloud`).
4. Same tests for every provider: `test/cloud.conformance.test.js` (GATE-9).

```bash
npm test -- test/cloud.provider.test.js test/cloud.providers.test.js test/cloud.conformance.test.js test/cloud.store.test.js test/cloud.http.test.js
```

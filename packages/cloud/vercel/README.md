# Vercel-hybrid adapters (S6)

`ZERO_CLOUD=vercel` loads this bundle: Cloudflare R2, Upstash QStash, Vercel env secrets, Upstash/Redis cache.

| Env | Purpose |
|-----|---------|
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 S3-compatible credentials |
| `R2_BUCKET` | Artifact bucket |
| `QSTASH_TOKEN` | Upstash QStash bearer token |
| `QSTASH_URL` | QStash API base (default `https://qstash.upstash.io`) |
| `QSTASH_CALLBACK_URL` | Default HTTP destination for publish |
| `QSTASH_DEST_RUNS_REQUESTED` | Per-topic callback override |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST cache |
| `REDIS_URL` | Optional ioredis cache + pub/sub |

R2 object store lazy-requires `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (S3-compatible API).

**QStash subscribe:** delivery is HTTP push to your deployment. In-process `queue.subscribe()` is a no-op unless you pass `opts.subscribe` (tests) or wire a webhook route.

**Secrets put:** runtime writes go to an in-memory map; production secrets belong in Vercel project env.

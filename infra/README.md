# Cloud IaC (M7)

Minimal Terraform for the four primitives: object store, queue, secrets, cache.

| Provider | Path | Store | Queue | Secrets | Cache |
|----------|------|-------|-------|---------|-------|
| AWS | `infra/aws` | S3 | SQS | Secrets Manager | ElastiCache Redis |
| GCP | `infra/gcp` | GCS | Pub/Sub | Secret Manager | Memorystore Redis |

Local/dev does **not** apply these. `ZERO_CLOUD=local` + docker compose (MinIO / Redis / Postgres) is the default.

> **Running a cheap cloud demo? Do not apply these modules.** They provision production adapters, including ElastiCache (~$12/mo) and Memorystore (~$35/mo), neither of which a demo needs. The demo tier keeps `ZERO_CLOUD=local` and creates no adapters at all — see [`support/zero-docs/docs/v1/DEPLOY.md`](../support/zero-docs/docs/v1/DEPLOY.md).

```bash
# AWS (requires credentials + optional subnet_ids for Redis)
cd infra/aws && terraform init && terraform plan

# GCP
cd infra/gcp && terraform init && terraform plan -var="project=YOUR_PROJECT"
```

Wire the outputs into env:

```
ZERO_CLOUD=aws
ZERO_S3_BUCKET=...
ZERO_SQS_RUNS_REQUESTED=...
ZERO_SQS_EXECUTION_REQUESTED=...
ZERO_SQS_EXECUTION_COMPLETED=...
REDIS_URL=redis://...
```

## Cost (approximate)

These modules cover adapters only. Full production floors (Postgres, compute, networking) are higher — see `support/zero-docs/docs/v1/COST.md` or the docs site **Deployment → Cost** tab.

| Module resource | AWS (~/mo) | GCP (~/mo) |
|-----------------|------------|------------|
| Object store | S3 pennies + storage | GCS pennies + storage |
| Queue | SQS free tier | Pub/Sub free tier |
| Secrets | ~$0.40/secret | ~$0.06/version |
| Cache | ~$12 (cache.t3.micro) | ~$35 (Memorystore 1 GB BASIC) |

> **The cache is optional.** With `ZERO_CLOUD=aws|gcp` the queue is SQS / Pub-Sub, so Redis only backs the cache — and `packages/cloud/redisCache.js` falls back to an in-process cache when `REDIS_URL` is unset. Skipping it saves ~$12/mo on AWS and ~$35/mo on GCP. The trade-off is that the cache is no longer shared across services, so runs supplying **login credentials** (`runSecret.<runId>`) still need it; URL-only autonomous runs do not. A cost-optimized AWS shape that drops the cache, NAT, and ALB is worked out in [`support/zero-docs/docs/v1/PRODUCTION_AWS.md`](../support/zero-docs/docs/v1/PRODUCTION_AWS.md).

Add managed Postgres (~$7–25/mo smallest tier), executor compute (~$0.003–0.08/job), and optional LLM spend (`ZERO_LLM_MAX_USD_PER_RUN`, default $0.50/run cap).

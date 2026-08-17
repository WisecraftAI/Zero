# Cloud IaC (M7)

Minimal Terraform for the four primitives: object store, queue, secrets, cache.

| Provider | Path | Store | Queue | Secrets | Cache |
|----------|------|-------|-------|---------|-------|
| AWS | `infra/aws` | S3 | SQS | Secrets Manager | ElastiCache Redis |
| GCP | `infra/gcp` | GCS | Pub/Sub | Secret Manager | Memorystore Redis |

Local/dev does **not** apply these. `ZERO_CLOUD=local` + docker compose (MinIO / Redis / Postgres) is the default.

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

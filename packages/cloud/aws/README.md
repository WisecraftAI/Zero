# AWS adapters (M7)

`ZERO_CLOUD=aws` loads this bundle: S3, SQS, Secrets Manager, Redis (`REDIS_URL` → ElastiCache).

Install SDKs before pointing production at AWS:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-sqs @aws-sdk/client-secrets-manager
```

| Env | Purpose |
|-----|---------|
| `ZERO_S3_BUCKET` / `S3_BUCKET` | Artifact bucket |
| `S3_ENDPOINT` | Optional MinIO / LocalStack |
| `ZERO_SQS_RUNS_REQUESTED` | Queue URL for `runs.requested` |
| `ZERO_SQS_EXECUTION_REQUESTED` | Queue URL for `execution.requested` |
| `ZERO_SQS_EXECUTION_COMPLETED` | Queue URL for `execution.completed` |
| `ZERO_SECRETS_PREFIX` | Secrets Manager name prefix (default `zero/`) |
| `REDIS_URL` | ElastiCache / docker Redis |
| `AWS_REGION` | Region |

IaC: `infra/aws/main.tf`.

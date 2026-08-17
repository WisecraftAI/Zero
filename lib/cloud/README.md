# lib/cloud

Provider-agnostic primitives for the Target architecture (`public/architectureV2.html`).

```js
const { objectStore, queue, secrets, cache, provider } = require('./lib/cloud');
// ZERO_CLOUD=local|aws|gcp|azure|vercel
```

Domain and agent code must not import AWS/GCP/Azure SDKs directly — only this package.

| `ZERO_CLOUD` | Store | Queue | Secrets | Cache |
|--------------|-------|-------|---------|-------|
| `local` (default) | filesystem + HMAC URLs | in-process | env / json file | in-process |
| `aws` | S3 | SQS | Secrets Manager | Redis (`REDIS_URL`) |
| `gcp` | GCS | Pub/Sub | Secret Manager | Redis (`REDIS_URL`) |

SDKs are lazy-required. Local `npm start` does not need them. IaC: `infra/aws`, `infra/gcp`. CI: `.github/workflows/ci.yml`.

# GCP adapters (M7)

`ZERO_CLOUD=gcp` loads this bundle: GCS, Pub/Sub, Secret Manager, Redis (`REDIS_URL` → Memorystore).

```bash
npm install @google-cloud/storage @google-cloud/pubsub @google-cloud/secret-manager
```

| Env | Purpose |
|-----|---------|
| `ZERO_GCS_BUCKET` / `GCS_BUCKET` | Artifact bucket |
| `GOOGLE_CLOUD_PROJECT` | Project id |
| `ZERO_SECRETS_PREFIX` | Secret id prefix (default `zero-`) |
| `REDIS_URL` | Memorystore / docker Redis |

Topic names replace `.` with `-` (`runs.requested` → `runs-requested`). Subscriptions default to `<topic>-zero`.

IaC: `infra/gcp/main.tf`.

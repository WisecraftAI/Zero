# Azure adapters (S6)

`ZERO_CLOUD=azure` loads this bundle: Blob Storage, Service Bus, Key Vault, Redis (`REDIS_URL`).

Install SDKs before pointing production at Azure:

```bash
npm install @azure/storage-blob @azure/service-bus @azure/keyvault-secrets @azure/identity
```

| Env | Purpose |
|-----|---------|
| `AZURE_STORAGE_CONNECTION_STRING` | Blob account (or account + key below) |
| `AZURE_STORAGE_ACCOUNT` / `AZURE_STORAGE_ACCOUNT_KEY` | Blob credentials |
| `ZERO_AZURE_CONTAINER` / `AZURE_STORAGE_CONTAINER` | Blob container (default `zero`) |
| `AZURE_SERVICE_BUS_CONNECTION_STRING` | Service Bus |
| `ZERO_AZURE_SB_RUNS_REQUESTED` | Queue name for `runs.requested` |
| `ZERO_AZURE_SB_EXECUTION_REQUESTED` | Queue name for `execution.requested` |
| `ZERO_AZURE_SB_EXECUTION_COMPLETED` | Queue name for `execution.completed` |
| `AZURE_KEY_VAULT_NAME` | Key Vault for secrets |
| `ZERO_SECRETS_PREFIX` | Secret name prefix (default `zero-`) |
| `REDIS_URL` | Azure Cache for Redis / docker Redis |

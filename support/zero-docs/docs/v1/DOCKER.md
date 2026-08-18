# Docker — ZER0

How to run the split stack with Compose. Under **S7** the SPA and the API are two separate containers on two different ports. Chromium lives **only** in the executor image.

Interactive packaging notes: docs site Architecture tab → **V3 Docker** (`:5174`, jump `#v3-docker`).

---

## Quick start (full stack)

From the repo root:

```bash
docker compose up --build
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Web UI (`web`, nginx serving `dist/web/`) |
| http://localhost:3000/health | Web nginx liveness |
| http://localhost:3001/health | API service (`api`, Express) |
| http://localhost:5174 | Docs site (`docs`, Vite bind-mount) |
| http://localhost:5175/status | Agent-workflow status (`workflow`) |

MinIO is **optional** — only when using `--profile s3` (see [MinIO](#minio-s3-compatible-object-store)).

Default Compose `NODE_ENV` is **development** so the API boots without production auth secrets. For a production-like stack set `NODE_ENV=production`, `KEY_ENC_SECRET`, and `ZERO_API_KEYS` (or JWT / OIDC).

Stop:

```bash
docker compose down
```

Keep volumes (Postgres / MinIO / artifacts):

```bash
docker compose down   # volumes retained
docker compose down -v  # wipe pgdata, miniodata, app-artifacts
```

---

## Services

| Service | Image / build | Role |
|---------|---------------|------|
| `postgres` | `postgres:16-alpine` | Runs / assets / locators (`DATABASE_URL`) |
| `redis` | `redis:7-alpine` | Queue + cache when `REDIS_URL` is set |
| `minio` + `minio-init` | MinIO (`--profile s3`) | Optional S3 drill; off by default (see [MinIO](#minio-s3-compatible-object-store)) |
| `web` | `web/Dockerfile` → `zero-web` | React 18 SPA on nginx `:3000`, static assets only |
| `api` | root `Dockerfile` → `zero-api` | HTTP intake on Express `:3001`, **no Playwright, no SPA** |
| `orchestrator` | `services/orchestrator/Dockerfile` → `zero-orchestrator` | DAG worker (`runs.requested`) |
| `executor` | `services/executor/Dockerfile` → `zero-executor` | Playwright jobs (`execution.requested`), `shm_size: 1gb` |
| `docs` | `node:20-bookworm` + bind-mount `support/zero-docs` | Docs site on `:5174` |
| `workflow` | `support/agent-workflow/Dockerfile` | Milestone probes on bind-mounted repo (`:5175`) |

Shared volume `app-artifacts` mounts at `/app/dist/artifacts` on `api`, `orchestrator`, and `executor`.

---

## Images (what each Dockerfile does)

### `web/Dockerfile` (`zero-web`) — S7

1. **build stage** — `npm run build -w @zero/web` with `VITE_API_BASE_URL` baked in as a build arg → `dist/web/`.
2. **runtime** — `nginx:1.27-alpine`, copies the built assets into `/usr/share/nginx/html/` and `web/nginx.conf` into `/etc/nginx/nginx.conf`.
3. Serves `/`, `/assets/*` (immutable cache), and `/health` (nginx `return 200`). **No `/api` proxy** — the browser hits the API origin directly.

Default `VITE_API_BASE_URL=http://localhost:3001` (compose default). Override for prod: `docker build --build-arg VITE_API_BASE_URL=https://api.example.com ...`.

### `Dockerfile` (API — `zero-api`) — S7

1. **runtime** — Node 20, copies `@zero/api` + needed packages (no `web/` any more).
2. Entrypoint creates `dist/artifacts` + `dist/logs`, drops to `node`.
3. `CMD`: `node services/api/server.js` — listens on `PORT=3001`.

No Playwright install. Do not add `playwright` to `@zero/api`. No SPA either — `dist/web/` is not copied.

### `services/orchestrator/Dockerfile` (`zero-orchestrator`)

Node alpine (or slim Node), packages for DAG + LLM. **No** browser.  
`CMD`: `node services/orchestrator/worker.js`

### `services/executor/Dockerfile` (`zero-executor`)

Base: `mcr.microsoft.com/playwright:v1.52.0-jammy`.  
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (browsers already in the base image).  
Runs as `pwuser`. Needs `shm_size: 1gb` in Compose for Chromium.

### `support/agent-workflow/Dockerfile` (`workflow`)

Small status server for milestone detect/verify against `/repo`.

### Docs image (optional bake)

```bash
docker build -t zero-docs ./support/zero-docs
```

Compose usually runs Vite with a bind mount instead (no rebuild on edit).

---

## Hybrid: infra in Docker, app on host

Useful when iterating on Node without rebuilding images:

```bash
docker compose up -d postgres redis
```

Then on the host:

```bash
# if host :5432 is busy:
# POSTGRES_PORT=15432 docker compose up -d postgres
# DATABASE_URL=postgres://zero:zero@localhost:15432/zero

export DATABASE_URL=postgres://zero:zero@localhost:5432/zero
export REDIS_URL=redis://localhost:6379
# optional MinIO for object-store testing — see .env.example

npm install
npm run build
npm run start:all   # API + orchestrator + executor on the host
```

---

## Docs / workflow only

```bash
docker compose up docs                 # http://localhost:5174
docker compose up --build workflow     # http://localhost:5175/status
```

---

## Port overrides

| Env var | Default | Purpose |
|---------|---------|---------|
| `WEB_PORT` | `3000` | Web UI (nginx) |
| `API_PORT` | `3001` | API service (Express) |
| `DOCS_PORT` | `5174` | Docs site |
| `WORKFLOW_PORT` | `5175` | Workflow status |
| `POSTGRES_PORT` | `5432` | Host publish for Postgres |
| `REDIS_PORT` | `6379` | Host publish for Redis |
| `MINIO_API_PORT` | `9000` | MinIO S3 API |
| `MINIO_CONSOLE_PORT` | `9001` | MinIO console |

Example:

```bash
WEB_PORT=3080 API_PORT=3081 DOCS_PORT=5180 docker compose up --build
# Then also rebuild web with the new API URL baked in:
VITE_API_BASE_URL=http://localhost:3081 docker compose build web
```

---

## Environment (Compose defaults)

From `docker-compose.yml` `x-app-env`:

| Variable | Default | Notes |
|----------|---------|--------|
| `NODE_ENV` | `development` | Production forces auth + real `KEY_ENC_SECRET` |
| `PORT` | `3001` | API service port (S7 moved off :3000 to make room for the web nginx image) |
| `ZERO_CLOUD` | `local` | Local object store under `dist/artifacts/cloud-store` |
| `ZERO_PUBLIC_BASE_URL` | `http://localhost:3001` | Signed URL base — the API origin, not the SPA origin |
| `ZERO_WEB_URL` | `http://localhost:3000` | Advisory; logged at startup so the API can print the UI URL |
| `VITE_API_BASE_URL` | `http://localhost:3001` | Baked into the Vite bundle at build time; set as `web` build arg |
| `DATABASE_URL` | `postgres://zero:zero@postgres:5432/zero` | In-network hostname `postgres` |
| `REDIS_URL` | `redis://redis:6379` | Shared queue across API / orch / exec |
| `S3_*` | MinIO credentials | Used when `ZERO_CLOUD=aws` and `S3_ENDPOINT` points at MinIO |
| `EXECUTION_MODE` | `minimal` | URL-load checks, not full E2E |

Regenerable paths inside containers follow the host convention via `@zero/domain` `outputRoots`:

```
/app/dist/web
/app/dist/artifacts   ← Compose volume app-artifacts
/app/dist/logs
```

---

## Smoke checks

```bash
curl -sS http://localhost:3000/health       # web nginx liveness
curl -sS http://localhost:3001/health       # API JSON health
curl -sS http://localhost:5174/ | head
curl -sS http://localhost:5175/status | head
```

Pipeline smoke on the host (against a running API):

```bash
npm run test:smoke
```

---

## Common issues

| Symptom | Fix |
|---------|-----|
| Port 5432 already in use | `POSTGRES_PORT=15432 docker compose up -d postgres` and point `DATABASE_URL` at that port (hybrid) |
| Executor OOM / Chromium crash | Ensure Compose `shm_size: 1gb` on `executor`; don’t run headed without a display |
| UI 404 / blank | Rebuild the web image (`docker compose up --build web`) — the SPA is baked into `zero-web`, not the API |
| UI can’t reach API (`Failed to fetch`) | Rebuild `web` with the correct `VITE_API_BASE_URL` build arg; check API health at `http://localhost:3001/health` |
| Auth 401 in Compose | Default is `NODE_ENV=development`. Production needs keys — see `.env.example` |
| Docs not updating | `docs` service bind-mounts `support/zero-docs`; if `node_modules` is stale, `docker compose run --rm docs npm ci` |

---

## MinIO (S3-compatible object store)

MinIO is **optional** in Compose (`profiles: ["s3"]`). The default stack does not start it — blobs use the local disk store when `ZERO_CLOUD=local`.

Start MinIO only when exercising the S3 adapter:

```bash
docker compose --profile s3 up -d minio minio-init
```

### Default behaviour (`ZERO_CLOUD=local`)

With the stock `docker-compose.yml`, all app services set `ZERO_CLOUD=local`. Blobs (screenshots, `run.json`, presigned TC uploads) go to the **local HMAC store** under `dist/artifacts/cloud-store`, fulfilled by `GET|PUT /cloud/local` on the API. **MinIO is not required and is not started unless you use `--profile s3`.**

Redis (`REDIS_URL`) still backs the queue and SSE pub/sub cache. Postgres holds run metadata.

### When MinIO is used

Opt in when you want to exercise the **S3 adapter** against a real bucket API:

1. Install AWS SDKs: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. Set `ZERO_CLOUD=aws`
3. Point the S3 client at MinIO:

| Variable | Compose (in-network) | Hybrid (app on host) |
|----------|----------------------|----------------------|
| `S3_ENDPOINT` | `http://minio:9000` | `http://localhost:9000` |
| `S3_BUCKET` | `zero-artifacts` | `zero-artifacts` |
| `S3_ACCESS_KEY` | `zerominio` | `zerominio` |
| `S3_SECRET_KEY` | `zerominio123` | `zerominio123` |

The `minio-init` service runs once at startup and creates bucket `zero-artifacts` if missing.

### Console and ports

| URL | Purpose |
|-----|---------|
| http://localhost:9000 | S3 API (SDK / `mc` / presigned PUT) |
| http://localhost:9001 | Web console — login `zerominio` / `zerominio123` |

Override host ports with `MINIO_API_PORT` and `MINIO_CONSOLE_PORT`.

### What gets stored

When the S3 path is enabled, `@zero/cloud` stores the same keys as production: run artifacts, execution screenshots, manager PDFs, and presigned upload targets. Postgres and Redis roles do not change.

### Reset MinIO data

```bash
docker compose --profile s3 down -v   # removes miniodata volume when profile was used
```

Browse buckets in the console only after enabling `ZERO_CLOUD=aws` + `S3_ENDPOINT`; until then the bucket exists but stays empty.

---

## Related

- [v1/ARCHITECTURE.md](./ARCHITECTURE.md) — runtime topology  
- [v1/COST.md](./COST.md) — deployment cost estimates (infra floors, LLM caps, executor sizing)  
- [v1/DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — local `npm` workflow  
- [../v2/ARCHITECTURE.md](../v2/ARCHITECTURE.md) — production gaps  
- Root [AGENTS.md](../../../../AGENTS.md) — Compose one-liners  
- Root [docker-compose.yml](../../../../docker-compose.yml) — source of truth for services  

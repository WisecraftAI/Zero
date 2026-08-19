# Deploy — ZER0 demo tier

How to put ZER0 on a public URL for a **live demo** at the lowest possible cost, and how to get the bill back to ~$0 the moment the demo ends.

This is the **demo tier**, not production. It deliberately drops Postgres, Redis, the managed object store, the load balancer, and the four-container split. Production floors and the hardened topology stay in [COST.md](./COST.md) and [DOCKER.md](./DOCKER.md).

Interactive version: docs site **Deployment → Demo deploy** (`:5174`, jump `#deploy-demo`).

---

## Pick a path

| Cloud | Path | Est. $/demo-hour | Est. $/mo after teardown | Free tier covers a demo? |
|-------|------|------------------|--------------------------|--------------------------|
| **[GCP](./deploy/GCP.md)** — recommended | 1× Cloud Run service, scale to zero | **~$0.16** list | **~$0.15** (image) → $0 if you delete the repo | **Yes** — ~31 demo-hours/mo inside the Cloud Run free tier |
| **[PaaS](./deploy/PAAS.md)** (Fly.io) | 1× Fly Machine, `fly scale count 0` | **~$0.03** — cheapest hourly | **$0.00** after `fly apps destroy` | No free tier (trial only) |
| **[AWS](./deploy/AWS.md)** | 1× `t4g.medium` EC2 + Docker Compose | **~$0.042** | **~$2.40** stopped (EBS) → $0 terminated | Account-dependent — see the guide |
| **[Azure](./deploy/AZURE.md)** | 1× Container App, consumption plan | **~$0.07** idle rate | **~$5.08** (ACR Basic) → $0 if you delete it | Partly — the grant covers active compute, never idle |

All figures are estimates as of Aug 2026 with sources linked in each guide. Every path assumes `ZERO_CLOUD=local`, `ZERO_LLM=off`, and no database.

**Choose GCP** if you want the demo to be genuinely free and to scale to zero without you remembering to do anything. **Choose Fly.io** if you want the lowest hourly rate, the fastest setup, and a one-command `$0` teardown. **Choose AWS** if you also want to show the real four-container split — a single EC2 box runs the stock `docker-compose.yml` unmodified. **Choose Azure** only if Azure is where you must demo; it has the highest residual cost because ACR Basic is a fixed monthly charge.

---

## The recommended demo path

**One container. One process. No managed services.**

```
        browser
           │
    ┌──────┴───────┐
    ▼              ▼
 SPA (static)   API :3001 ──────────── one container, one process
 free tier      ├─ orchestrator          (Dockerfile.demo →
                ├─ executor (Chromium)    node scripts/local-stack.js)
                ├─ queue    → in-process
                ├─ cache    → in-process
                ├─ objects  → container filesystem
                └─ runs     → in-memory Map + dist/artifacts/<runId>/run.json
```

This shape exists because of one hard constraint in the code, and it drives every guide here:

> With `ZERO_CLOUD=local` and no `REDIS_URL`, the queue in `packages/cloud/local/queue.js` is an **in-process `Map` of handlers**. A publisher in one container and a subscriber in another never see each other. A shared filesystem does not fix it — the API, orchestrator, and executor must be the **same OS process**.

`scripts/local-stack.js` (`npm run start:all`) is the only supported way to co-locate all three, so the demo image runs exactly that. [`Dockerfile.demo`](../../../../Dockerfile.demo) at the repo root builds it on the Playwright base so Chromium is present.

Everything the split stack needs — Redis for the queue, a shared volume for blobs, Postgres for run metadata — becomes optional. That is what takes the cloud floor from ~$50–120/month down to cents per demo-hour.

**This topology is verified, not theoretical.** Built and run locally from `Dockerfile.demo` with no Postgres and no Redis, a URL-only autonomous run completed every stage — `webAnalyzer → ba → manualQa → automationQa → execution → manager → delivery` — with `/health` reporting `storage: "memory"` and the Manager report recording `llm.used: false, costUsd: 0`:

```bash
docker build -f Dockerfile.demo -t zero-demo .
docker run -d --name zero-demo -p 3111:3001 \
  -e KEY_ENC_SECRET=$(openssl rand -hex 32) \
  -e ZERO_LOCAL_STORE_SECRET=$(openssl rand -hex 32) \
  -e ZERO_PUBLIC_BASE_URL=http://localhost:3111 \
  -e ZERO_LLM=off -e ZERO_ANALYZER_MAX_PAGES=3 \
  -e ZERO_ORCH_CONCURRENCY=1 -e ZERO_EXEC_CONCURRENCY=1 -e ZERO_EXEC_ATTEMPTS=1 \
  zero-demo

curl -s localhost:3111/health
curl -s -X POST localhost:3111/runs -H 'Content-Type: application/json' \
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}'
```

Rehearse locally like this before you touch any cloud — it is free, and it catches env mistakes that are slower to diagnose through a deploy pipeline.

---

## Shared prerequisites

Same for every cloud:

| Need | Why | Check |
|------|-----|-------|
| The repo, at its root | `Dockerfile.demo` and `web/` build from here | `ls Dockerfile.demo` |
| Docker with buildx | Builds the demo image; Apple Silicon must cross-build `linux/amd64` | `docker version` |
| Node 20+ and `npm install` | Only to build the SPA (`dist/web/`) | `node -v` |
| ~8 GB free disk | `Dockerfile.demo` measures **~3.5 GB on disk** (Playwright base ~1.6 GB + API, orchestrator, and executor dependencies). Registry-stored, compressed layers are smaller — measure yours before trusting a storage estimate | `docker images zero-demo` |
| Two random secrets | `KEY_ENC_SECRET` and `ZERO_LOCAL_STORE_SECRET` | `openssl rand -hex 32` |
| A billing account on the target cloud | Even free-tier usage requires one | — |

You do **not** need: a database, a Redis instance, an S3/GCS/Blob bucket, a load balancer, a NAT gateway, a domain, or a TLS certificate. Every platform in these guides hands you an HTTPS (or HTTP, for AWS EC2) hostname for free.

---

## The demo env: cheapest correct combination

Identical on all four clouds. Full per-variable notes are in each guide's **Environment reference**.

| Variable | Demo value | Why |
|----------|-----------|-----|
| `ZERO_CLOUD` | `local` | Filesystem object store + in-process queue and cache. No S3/SQS/Redis bill. Baked into `Dockerfile.demo` |
| `REDIS_URL` | **unset** | Setting it switches `@zero/cloud` to Redis (`ioredis` is a real dependency) and forces a managed cache — the single biggest avoidable line item |
| `DATABASE_URL` / `PGHOST` | **unset** | Memory + file persistence. `/health` reports `storage: "memory"`. Skips managed Postgres entirely |
| `NODE_ENV` | **unset** | See the auth warning below |
| `KEY_ENC_SECRET` | `openssl rand -hex 32` | Encrypts stored provider keys. Mandatory when `NODE_ENV=production` — the API throws at boot without it |
| `ZERO_LOCAL_STORE_SECRET` | `openssl rand -hex 32` | HMAC key for signed `/cloud/local` URLs |
| `ZERO_PUBLIC_BASE_URL` | the API's public origin | Base for signed artifact URLs. Wrong value ⇒ downloads point at `localhost` and fail |
| `EXECUTION_MODE` | `minimal` | Default. URL-load checks complete reliably; `full` is brittle |
| `ZERO_LLM` | `off` | Template-only agents ⇒ **$0 LLM spend**. Otherwise `ZERO_LLM_MAX_USD_PER_RUN` (default `0.50`) caps it |
| `ZERO_ANALYZER_MAX_PAGES` | `3` | Default `8`. Shorter crawl ⇒ shorter run ⇒ fewer billed seconds |
| `ZERO_ORCH_CONCURRENCY` | `1` | Default `2`. One instance, keep it serial |
| `ZERO_EXEC_CONCURRENCY` | `1` | Default `2`. One Chromium at a time in 4 GB |
| `ZERO_EXEC_ATTEMPTS` | `1` | Default `2`. Halves worst-case run time |
| `ZERO_WEB_URL` | the SPA origin | Advisory only; logged at boot |

---

## Four things that are not obvious

**1. Auth on means the UI is broken.** `NODE_ENV=production` forces verified auth on `/runs`, `/provider-keys`, and `/agent-settings`. The SPA **never sends `x-api-key`** — there is no such string anywhere in `web/src`. So with auth on, the browser gets 401 on every call and only `curl` works. For a demo where you show the UI, leave `NODE_ENV` unset. That makes the URL **publicly open**, which is acceptable only because you tear it down the same day. Each guide documents both variants.

Note that the stock `zero-api` image bakes `ENV NODE_ENV=production`, so deploying *that* image without `KEY_ENC_SECRET` crash-loops at boot. `Dockerfile.demo` deliberately leaves `NODE_ENV` unset.

**2. The SPA is compiled against one API URL.** `VITE_API_BASE_URL` is a Vite build-time constant baked into the bundle (`web/src/apiBase.js`). There is no runtime config, so **changing the API origin requires rebuilding and redeploying the SPA**:

```bash
VITE_API_BASE_URL=https://<api-origin> npm run build     # → dist/web/  (upload anywhere)
```

**3. CORS has surprising built-in wildcards.** When `NODE_ENV` is not `production`, all origins are allowed. In production, `services/api/middleware.js` allows only localhost, `zer0.io`, `app.zer0.io`, `*.vercel.app`, `*.up.railway.app`, plus `ALLOWED_ORIGINS` / `FRONTEND_URL` / `CLIENT_URL` / `PUBLIC_URL` / `RAILWAY_PUBLIC_DOMAIN`. A Railway or Vercel SPA origin works with no configuration; a `run.app`, `azurecontainerapps.io`, `fly.dev`, or CloudFront origin does not. The recording endpoints (`/recordings/*`, `/record`, `/recorder.js`) use a **separate** allowlist in `services/api/auth.js` that also reads `RECORDING_ORIGINS` and `APP_URL` — set it if you demo the recorder.

**4. `POST /runs` returns 202 and keeps working in the background.** This breaks any platform that freezes the container after the response. On Cloud Run you must deploy with `--no-cpu-throttling` or the run stalls at `queued`. On Azure Container Apps, keep `--min-replicas 1` for the demo window so the replica is not scaled in mid-run. On Fly, set `auto_stop_machines = 'off'`. Each guide covers its platform's specific behavior.

Sizing note: `services/executor/browser.js` launches Chromium with `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`, so a large `/dev/shm` is **not** required (Compose's `shm_size: 1gb` is belt-and-braces). Chromium writes temp files to memory instead, so budget **≥2 GB RAM, 4 GB comfortable**. Headed mode is impossible without `DISPLAY` and silently falls back to headless.

---

## Demo checklist — 15 minutes before you present

```bash
# 1. Warm the container (cold start pulls a multi-GB image)
curl -s "$API_URL/health"            # → {"ok":true,...,"storage":"memory"}
curl -s "$API_URL/health/detailed"   # → uptime, memory, activeRuns

# 2. Confirm auth is off, so the UI works
curl -s "$API_URL/runs"              # → [] or a JSON list, NOT 401

# 3. Do one throwaway run now, so the first live one is not the first ever
curl -s -X POST "$API_URL/runs" -H 'Content-Type: application/json' \
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}'

# 4. Keep the instance warm until you start
while true; do curl -s "$API_URL/health" >/dev/null; sleep 60; done
```

- [ ] Both health endpoints return `ok: true`
- [ ] `GET /runs` is not 401
- [ ] One warm-up run has completed end to end, and you have looked at its Manager report
- [ ] SPA loads at its own URL with no `Failed to fetch` in the browser console
- [ ] A target URL is picked and pre-tested — pick a small, fast, public site; a heavy SPA makes the crawl look slow
- [ ] Tabs open: the SPA dashboard, `/health/detailed`, `/api-docs` (Swagger UI), and the cloud console's logs view
- [ ] The keep-warm loop is running (or `min-instances`/`min-replicas` is temporarily `1`)
- [ ] You know your teardown command by heart — it is in §9 of your cloud's guide

Live-demo timing: a URL-only autonomous run at `ZERO_ANALYZER_MAX_PAGES=3` and `EXECUTION_MODE=minimal` typically finishes in a few minutes. `requestExecution` waits up to `ZERO_EXEC_TIMEOUT_MS` (default 300000 = 5 min) for the executor. Stream progress with `GET /runs/:id/stream` (SSE) rather than polling — it also keeps the instance alive.

---

## Cost-safety checklist

Do these **before** the first deploy, not after the bill.

- [ ] **Budget alert set** at $5 with 50 / 90 / 100 % thresholds — see §10 of your cloud's guide
- [ ] **Scale ceiling set**: `--max-instances=1` (Cloud Run), `--max-replicas 1` (Container Apps), one machine (Fly), one instance (EC2). A runaway autoscaler is the only way this demo becomes expensive
- [ ] **`ZERO_LLM=off`** — otherwise each run can spend up to `ZERO_LLM_MAX_USD_PER_RUN` (default $0.50)
- [ ] **No managed Redis, no managed Postgres** created. Confirm `/health` says `storage: "memory"`
- [ ] **No Terraform applied.** `infra/aws` and `infra/gcp` provision the four adapters for *production*, including ElastiCache (~$12/mo) and Memorystore (~$35/mo). The demo tier uses `ZERO_CLOUD=local` and applies neither
- [ ] **Teardown command tested** — run it once on a throwaway deploy so you are not reading docs at 6pm
- [ ] **Calendar reminder** for the same evening: run teardown
- [ ] **Artifacts downloaded** before teardown — run metadata lives in memory plus `dist/artifacts/<runId>/run.json` on ephemeral storage and does not survive the container

None of AWS, GCP, or Azure hard-stops spending by default; budgets only notify. The technical caps above are what actually bound the bill. Two partial exceptions worth knowing: Cloud Run honors Cloud Billing spend caps by pausing the service, and Railway offers an opt-in hard cap.

### Teardown one-liners

Full options, with what still bills after each, are in §9 of every guide.

```bash
# GCP — delete everything including the project
gcloud run services delete zero-demo --region=us-central1 --quiet
gcloud projects delete "$PROJECT_ID"

# Fly.io — true $0
fly apps destroy <app-name>

# AWS — stop (keeps ~$2.40/mo EBS) or terminate ($0)
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
aws ec2 terminate-instances --instance-ids "$INSTANCE_ID"

# Azure — removes the app, the registry, and the environment in one call
az group delete --name zero-demo-rg --yes --no-wait
```

---

## What the demo tier gives up

Be honest about this if anyone asks during the demo.

| Dropped | Consequence | Restore with |
|---------|-------------|--------------|
| Postgres | Runs vanish when the container restarts; no locator learning across runs | `DATABASE_URL` → free Neon/Supabase tier, or managed Postgres |
| Redis | Cannot split into separate API / orchestrator / executor services; no horizontal scale | `REDIS_URL` → managed cache; then run the four images from [DOCKER.md](./DOCKER.md) |
| Managed object store | Artifacts live on ephemeral container storage | `ZERO_CLOUD=aws\|gcp\|azure` + a bucket ([infra/README.md](../../../../infra/README.md)) |
| Auth | The API is publicly open for the demo window | `NODE_ENV=production` + `KEY_ENC_SECRET` + `ZERO_API_KEYS`, and drive it via `curl` (the SPA cannot send a key) |
| Multiple instances | One run at a time | The production topology — see [../v2/ARCHITECTURE.md](../v2/ARCHITECTURE.md) |

---

## Related

- [./deploy/GCP.md](./deploy/GCP.md) — Cloud Run, scale to zero *(recommended)*
- [./deploy/PAAS.md](./deploy/PAAS.md) — Fly.io, Render, Railway, Vercel-hybrid
- [./deploy/AWS.md](./deploy/AWS.md) — single EC2 + Compose, App Runner alternative
- [./deploy/AZURE.md](./deploy/AZURE.md) — Container Apps, Container Instances alternative
- [./COST.md](./COST.md) — demo tier vs production floors, LLM caps, executor sizing
- [./PRODUCTION_AWS.md](./PRODUCTION_AWS.md) — permanent cost-optimized AWS deployment (the opposite of this doc: built to stay up)
- [./DOCKER.md](./DOCKER.md) — the four-image split stack this tier collapses
- [./DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Day-0 local setup
- [./ARCHITECTURE.md](./ARCHITECTURE.md) — runtime topology and LLM wiring
- [../../../../infra/README.md](../../../../infra/README.md) — Terraform for the production adapters (not used by the demo tier)
- Root [Dockerfile.demo](../../../../Dockerfile.demo) — the single-container demo image
- Root [AGENTS.md](../../../../AGENTS.md) — pipeline stages, execution modes, env knobs

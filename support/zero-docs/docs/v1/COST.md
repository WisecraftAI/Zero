# Cost — ZER0 deployment estimates

Three different questions, kept separate on purpose:

- **Demo tier** — the cheapest thing that can still run a real ZER0 pipeline on a public URL for an hour. Cents per demo-hour, ~$0/mo after teardown.
- **Production floors** — what a small team pays per month for the hardened four-service topology, with managed Postgres, Redis, object store, and networking.
- **Cost-optimized production** — a permanent deployment sized for daily batches rather than steady traffic. On AWS this lands at ~$5–8/mo fixed plus ~$0.002/run, because NAT, ALB, ElastiCache, and always-on Postgres are all avoidable. See [PRODUCTION_AWS.md](./PRODUCTION_AWS.md).

Ballpark monthly figures assume a small team (under ~100 runs/day). Prices vary by region, reserved vs on-demand pricing, and whether you already have a VPC. **LLM spend is separate and optional** — templates complete every run with zero API spend when `ZERO_LLM=off` or no provider key is configured.

Interactive breakdown: docs site **Deployment → Cost** tab (`:5174`, jump `#deploy-cost`). Step-by-step demo deploys: **Deployment → Demo deploy** (`#deploy-demo`).

---

## Demo / minimum-cost tier

One container, one process: `Dockerfile.demo` runs `scripts/local-stack.js`, so the API, orchestrator, and executor share a process. `ZERO_CLOUD=local` means **no managed Redis, no managed Postgres, no bucket, no load balancer, no NAT**. Full step-by-step guides in [DEPLOY.md](./DEPLOY.md).

| Cloud | Path | Est. $/demo-hour | Est. $/mo after teardown | Free tier covers a demo? |
|-------|------|------------------|--------------------------|--------------------------|
| **[GCP](./deploy/GCP.md)** *(recommended)* | 1× Cloud Run service, scale to zero | ~$0.16 list | ~$0.15 image storage → $0 if deleted | **Yes** — ~31 demo-hours/mo inside the Cloud Run free tier |
| **[PaaS](./deploy/PAAS.md)** (Fly.io) | 1× Fly Machine | ~$0.03 — cheapest hourly | **$0.00** after `fly apps destroy` | No free tier (trial only) |
| **[AWS](./deploy/AWS.md)** | 1× `t4g.medium` EC2 + Compose | ~$0.042 | ~$2.40 stopped (EBS) → $0 terminated | Account-dependent |
| **[Azure](./deploy/AZURE.md)** | 1× Container App, consumption | ~$0.07 idle rate | ~$5.08 ACR Basic → $0 if deleted | Partly — grant covers active compute, not idle |

Estimates as of Aug 2026; each guide links the official pricing page per line item.

### What makes it cheap

| Choice | Avoided line item |
|--------|-------------------|
| `DATABASE_URL` unset → memory + file persistence | Managed Postgres (~$7–25/mo) |
| `REDIS_URL` unset → in-process queue and cache | ElastiCache (~$12/mo) · Memorystore (~$35/mo) · Azure Cache (~$16/mo) |
| `ZERO_CLOUD=local` → filesystem object store | S3 / GCS / Blob (pennies, but also the IAM and lifecycle setup) |
| One container with a public hostname | ALB (~$16/mo) · NAT gateway (~$32/mo) |
| Scale to zero / stop after the demo | 24×7 always-on compute |
| `ZERO_LLM=off` | Up to `ZERO_LLM_MAX_USD_PER_RUN` (default $0.50) per run |
| `ZERO_ANALYZER_MAX_PAGES=3`, `EXECUTION_MODE=minimal` | Billed seconds per run |

### What it gives up

Runs do not survive a container restart, there is no horizontal scale, and auth must be **off** for the browser UI to work (the SPA does not send `x-api-key`, so `NODE_ENV=production` returns 401 on every `/runs` call). Tear the URL down when the demo ends. See [DEPLOY.md](./DEPLOY.md) for the full trade-off table and the cost-safety checklist.

> The Terraform in `infra/aws` and `infra/gcp` is for **production** adapters and includes ElastiCache and Memorystore. The demo tier applies neither.

---

## Production floors by deployment path

These are the hardened, always-on numbers — the four-service split with managed Postgres, Redis, object store, and networking. For a one-hour demo, use the [demo tier](#demo--minimum-cost-tier) above instead; it is two to three orders of magnitude cheaper.

> **These are floors for steady traffic, not the floor for a batch workload.** They assume an always-on load balancer, NAT gateway, managed cache, and always-on Postgres. A deployment that runs a few dozen sites a day needs none of those: scale-to-zero workers in public subnets, a managed-HTTPS API host, and Aurora Serverless v2 at `MinCapacity = 0` bring the AWS figure below to **~$5–8/mo fixed plus ~$0.002/run**. [PRODUCTION_AWS.md](./PRODUCTION_AWS.md) works through both shapes and the code changes each needs.

| Path | Infra floor / mo | Typical at ~50 runs/day | Notes |
|------|------------------|-------------------------|-------|
| **Local dev** | $0 | $0–5 LLM | `npm start` / `npm run start:all` on your laptop |
| **Docker Compose** | $0 cloud | $0–5 LLM | All containers on one host; budget ~8 GB RAM |
| **Hybrid** | $0 cloud | $0–5 LLM | Postgres / Redis in Docker (MinIO optional via `--profile s3`); app on host |
| **AWS** | ~$60–120 | ~$80–200 | RDS db.t4g.micro + NAT + ElastiCache + Fargate tiers |
| **GCP** | ~$50–100 | ~$70–180 | Cloud SQL f1-micro + Memorystore + Cloud Run |
| **Azure** | ~$55–110 | ~$75–190 | Flexible Server B1ms + Cache for Redis + Container Apps |
| **Vercel-hybrid** | ~$25–40 | ~$40–120 | Neon + Upstash + R2 + Vercel Pro; executor via Browserless |

The **Deployment → Cloud** tab includes a one-line `Cost floor / mo` row in the environment matrix for quick comparison.

---

## Variable costs per run

| Component | Typical $/run | How to minimize |
|-----------|---------------|-----------------|
| **LLM** (BA / Manual / Automation / Manager) | $0–0.50 (capped) | `ZERO_LLM=off`; lower `ZERO_LLM_MAX_USD_PER_RUN` (default 0.50) |
| **Playwright execution** (minimal mode) | $0 local · ~$0.02–0.08 cloud | `EXECUTION_MODE=minimal`; export Java scripts for external E2E |
| **Web Analyzer crawl** | $0 local · ~$0.05–0.15 cloud | Upload a TC file to skip crawl; BA notes do not skip it |
| **Object storage** | <$0.01 unless heavy screenshots | S3/GCS lifecycle rules (30–90 day expiry) |
| **Queue + cache** | <$0.01 at low volume | `ZERO_CLOUD=local` for dev |

---

## LLM guardrails

Orchestrator enrichment is best-effort in `@zero/orchestrator/llm`. Templates always complete the run.

| Variable | Default | Effect |
|----------|---------|--------|
| `ZERO_LLM` | (on) | Set to `off` for template-only — zero LLM spend |
| `ZERO_LLM_RPM` | 20 | Rate limit across LLM calls |
| `ZERO_LLM_MAX_USD_PER_RUN` | 0.50 | Hard cap per run; template fallback when exceeded |
| `ZERO_LLM_TIMEOUT_MS` | 8000 | Abort slow calls; template fallback on timeout |

See `.env.example` for all LLM-related vars.

---

## IaC primitives (`infra/`)

Terraform modules provision the four cloud adapters only — **not** Postgres, compute, or networking.

### `infra/aws`

| Resource | Approx cost |
|----------|-------------|
| S3 bucket | ~$0.023/GB/mo + requests |
| 3× SQS queues | First 1M requests/mo free |
| Secrets Manager | ~$0.40/secret/mo — avoidable; `aws/secrets.js` reads `process.env` first, so SSM Parameter Store Standard (free) works |
| ElastiCache cache.t3.micro | ~$12/mo (requires `subnet_ids`) — **optional**, see below |

RDS, NAT gateway, Fargate, and ALB are **not** in this module — they dominate the AWS floor.

**ElastiCache is not required when `ZERO_CLOUD=aws`.** The queue is SQS, so Redis would only back the cache, and `packages/cloud/redisCache.js` falls back to the in-process cache when `REDIS_URL` is unset. Leaving it unset saves ~$12/mo with no code change. The one thing you lose is a cache shared across services: the executor reads run login credentials through it (`runSecret.<runId>`) and falls back to empty strings on a miss, so **runs that supply login credentials still need `REDIS_URL`** while URL-only autonomous runs do not.

### `infra/gcp`

| Resource | Approx cost |
|----------|-------------|
| GCS bucket | ~$0.020/GB/mo |
| Pub/Sub topics + subscriptions | 10 GB/mo free |
| Secret Manager | ~$0.06/secret/version/mo |
| Memorystore Redis 1 GB BASIC | ~$35/mo |

Cloud SQL and Cloud Run are provisioned separately.

---

## Executor sizing

The executor image is ~1.6 GB (Playwright + Chromium). Chromium launches with `--disable-dev-shm-usage` (`services/executor/browser.js`), so a large `/dev/shm` is not strictly required — Compose's `shm_size: 1gb` is belt-and-braces. Chromium writes temp files to memory instead, so budget **≥2 GB RAM per concurrent job, 4 GB comfortable**.

| Host | Approx cost | When to use |
|------|-------------|-------------|
| Local / Compose | $0 | Dev |
| Single demo container (`Dockerfile.demo`) | ~$0.03–0.16/demo-hour | Live demos — [DEPLOY.md](./DEPLOY.md) |
| AWS Fargate (1 vCPU · 2 GB · 5 min) | ~$0.004/job | Production; scale on queue depth |
| AWS Fargate **Spot** (same sizing) | ~$0.001/job | Batch runs that tolerate a 2-min reclaim — [PRODUCTION_AWS.md](./PRODUCTION_AWS.md) |
| GCP Cloud Run Jobs (2 vCPU · 2 GB · 5 min) | ~$0.003/job | Scale to zero between bursts |
| Browserless / Browserbase | ~$0.01–0.05/min | Vercel-hybrid when you cannot host Chromium |

---

## Related

- [v1/PRODUCTION_AWS.md](./PRODUCTION_AWS.md) — **cost-optimized production on AWS**: scale-to-zero vs single node, per-run math, blockers
- [v1/DEPLOY.md](./DEPLOY.md) — **demo tier**: cheapest per-cloud deploy, teardown, and cost-safety checklists
- [v1/DOCKER.md](./DOCKER.md) — local Compose (zero cloud cost)
- [v1/ARCHITECTURE.md](./ARCHITECTURE.md) — runtime topology and LLM wiring
- [../v2/ARCHITECTURE.md](../v2/ARCHITECTURE.md) — production gaps
- [../../../../infra/README.md](../../../../infra/README.md) — Terraform bootstrap
- Root [AGENTS.md](../../../../AGENTS.md) — execution modes and LLM caps

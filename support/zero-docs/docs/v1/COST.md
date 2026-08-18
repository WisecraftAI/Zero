# Cost — ZER0 deployment estimates

Ballpark monthly figures for a small team (under ~100 runs/day). Prices vary by region, reserved vs on-demand pricing, and whether you already have a VPC. **LLM spend is separate and optional** — templates complete every run with zero API spend when `ZERO_LLM=off` or no provider key is configured.

Interactive breakdown: docs site **Deployment → Cost** tab (`:5174`, jump `#deploy-cost`).

---

## Floor by deployment path

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
| **Web Analyzer crawl** | $0 local · ~$0.05–0.15 cloud | Upload TCs or longer BA notes to skip crawl |
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
| Secrets Manager | ~$0.40/secret/mo |
| ElastiCache cache.t3.micro | ~$12/mo (requires `subnet_ids`) |

RDS, NAT gateway, Fargate, and ALB are **not** in this module — they dominate the AWS floor.

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

The executor image is ~1.6 GB (Playwright + Chromium). Each job needs `shm_size ≥ 1gb`.

| Host | Approx cost | When to use |
|------|-------------|-------------|
| Local / Compose | $0 | Dev and demos |
| AWS Fargate (1 vCPU · 2 GB · 5 min) | ~$0.004/job | Production; scale on queue depth |
| GCP Cloud Run Jobs (2 vCPU · 2 GB · 5 min) | ~$0.003/job | Scale to zero between bursts |
| Browserless / Browserbase | ~$0.01–0.05/min | Vercel-hybrid when you cannot host Chromium |

---

## Related

- [v1/DOCKER.md](./DOCKER.md) — local Compose (zero cloud cost)
- [v1/ARCHITECTURE.md](./ARCHITECTURE.md) — runtime topology and LLM wiring
- [../v2/ARCHITECTURE.md](../v2/ARCHITECTURE.md) — production gaps
- [../../../infra/README.md](../../../infra/README.md) — Terraform bootstrap
- Root [AGENTS.md](../../../../AGENTS.md) — execution modes and LLM caps

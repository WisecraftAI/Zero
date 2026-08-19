# Production AWS — cost-optimized decision doc

**Status: decision doc, not a runbook.** Nothing here is built yet and no Terraform has been written. The goal is to pick one of two shapes for a permanent AWS deployment that runs **several websites per day**, then turn the winner into `infra/aws` modules and a step-by-step guide.

Scope boundary — three different questions live in three different docs:

| Question | Doc |
|----------|-----|
| Cheapest way to show ZER0 on a public URL for an hour, then delete it | [DEPLOY.md](./DEPLOY.md) → [deploy/AWS.md](./deploy/AWS.md) |
| What the hardened always-on topology costs today | [COST.md](./COST.md) |
| **Cheapest way to run ZER0 permanently on AWS for daily batches** | **this doc** |

---

## 1. The economic premise

At a few dozen runs per day, **almost none of the AWS bill is your runs.** The bill is infrastructure sitting idle waiting for work. That single observation drives every choice below, so it is worth establishing before comparing options.

### Why the runs themselves are nearly free

A ZER0 run with `ZERO_LLM=off` has no per-call marginal cost. The measurement stages are deterministic instrumentation, not inference:

- **Performance** reads `window.performance` in the page — Navigation Timing, paint entries, resource counts — and scores against fixed thresholds (`services/executor/jobs.js`, `generatePerformanceReport`).
- **Security** reads response headers, cookie flags, and form actions and scores against a fixed rubric (`generateSecurityReport`).
- **Web Analyzer**, **Manual QA**, and the builders are templates plus a Playwright crawl.

This is the same economics that lets [WebPageTest](https://www.webpagetest.org/) offer performance testing free. Nothing in a performance score requires a model: LCP and CLS come from `PerformanceObserver`, the waterfall comes from a CDP trace, and the Lighthouse score is a fixed weighted curve over five metrics. Marginal cost is a few CPU-seconds per test. WebPageTest manages demand with queueing, per-key rate limits, and expiring results rather than with capacity, and Catchpoint funds the free tier as a funnel to WebPageTest Pro.

LLM calls are the opposite: real money every time, no reuse across sites. So the product line to draw is the same one the cost model draws — **deterministic stages are effectively free and can stay free; LLM enrichment is the only thing with a per-run price** (`ZERO_LLM_MAX_USD_PER_RUN`, default $0.50). See [§8](#8-product-implication--what-a-free-tier-can-include).

### Where the money actually goes

Four line items dominate the ~$60–120/mo production floor quoted in [COST.md](./COST.md), and **every one of them is avoidable for a batch workload**.

| Line item | Cost if used | Why a daily-batch deployment does not need it |
|---|---|---|
| NAT gateway | ~$32.85/mo **per AZ** | Tasks need *outbound internet* to crawl target sites, not private egress. Public subnets with `assignPublicIp=ENABLED` give that for the ~$0.005/hr IPv4 charge on the task ENI — fractions of a cent for a 5-minute task |
| Application Load Balancer | ~$16.43/mo at **zero** traffic | One API service with a platform-managed HTTPS hostname needs no ALB |
| ElastiCache `cache.t3.micro` | ~$12/mo | **Not required at all** — see below |
| Always-on RDS `db.t4g.micro` | ~$12–15/mo | Aurora Serverless v2 at `MinCapacity = 0` idles at storage cost only |

That is roughly a **$73/mo floor removed before optimizing anything else.**

#### ElastiCache is optional, and the code proves it

`infra/aws/main.tf` provisions an ElastiCache cluster and [COST.md](./COST.md) lists it under the production floor, but with `ZERO_CLOUD=aws` the **queue is SQS**, so Redis would only be serving the cache — and the cache adapter falls back to in-process when `REDIS_URL` is unset:

```js
// packages/cloud/aws/cache.js
const { createCache } = require("../redisCache");
function createAwsCache(opts = {}) { return createCache(opts); }
```

`packages/cloud/redisCache.js` returns the local in-process cache when there is no URL ("*Falls back to the in-process local cache when REDIS_URL is unset … npm start still works without Redis*"). Leaving `REDIS_URL` unset removes ~$12/mo with **no code change**.

One behavioral consequence to accept: the cache stops being shared across services. The executor reads run login credentials through it (`cloud.cache.get('runSecret.' + runId)` in `services/executor/main.js`) and falls back to empty strings on a miss. **Runs that supply login credentials therefore need `REDIS_URL`**; URL-only autonomous runs — the daily-batch case — do not.

#### Secrets Manager is optional too

`packages/cloud/aws/secrets.js` checks `process.env[name]` before calling Secrets Manager:

```js
async get(name) {
  if (opts.get) return opts.get(name);
  if (process.env[name]) return process.env[name];
  // … GetSecretValueCommand
}
```

So static secrets (`KEY_ENC_SECRET`, DB URL) can be injected by the ECS task definition from **SSM Parameter Store Standard, which is free**, instead of $0.40/secret/mo. No code change required.

---

## 2. Option A — single node

One EC2 instance running the existing `docker-compose.yml` stack, with `ZERO_CLOUD=aws` so artifacts land in S3 and survive the box. CloudFront sits in front for free managed TLS, which also keeps the instance IP off the public record.

```
CloudFront ──▶ EC2 t4g.small/medium (public subnet)
   (free TLS)     └─ compose: web · api · orchestrator · executor · redis · postgres
                        │
                        └──▶ S3 (artifacts, 30-day lifecycle)
```

**What it gets right.** Zero new architecture — it is the stack that already works in [DOCKER.md](./DOCKER.md). Redis and Postgres are containers, so both are $0. One flat monthly bill with no per-run variability. Fastest thing to stand up.

**What it gives up.** One box is a single point of failure, and 2 vCPU with `ZERO_EXEC_CONCURRENCY=1` means effectively **one Chromium at a time** — a queue of 50 sites serializes. Postgres in a container on one EBS volume has no automated backup unless you add one. Scaling means resizing the instance, which is downtime. Spot pricing is the cheap path but a reclaim takes the whole platform down, not one job.

**Estimated cost** (`us-east-1`, Aug 2026 estimates):

| Line item | On-demand | Spot |
|---|---|---|
| `t4g.small` (2 vCPU / 2 GB) | $12.26/mo | ~$3.70/mo |
| `t4g.medium` (2 vCPU / 4 GB) — recommended for Chromium | $24.53/mo | ~$7.40/mo |
| 30 GB gp3 root | $2.40/mo | $2.40/mo |
| CloudFront + S3 for the SPA | $0 (perpetual free tier: 1 TB egress, 10M requests) | same |
| S3 artifacts (30-day lifecycle) | ~$0.40/mo | same |
| **Total** | **~$27/mo** | **~$10/mo** |

---

## 3. Option B — scale-to-zero burst

The two heavy services become ECS Fargate **Spot** services whose desired count is driven by SQS depth and drops to **zero** between runs. Idle cost approaches zero; you pay per run.

```
CloudFront + S3 ──▶ SPA                                    ~$0 (free tier)
        │
        ▼
App Runner (0.25 vCPU / 0.5 GB) ── API, managed HTTPS      ~$2.56/mo idle
        │  publishes
        ▼
SQS runs.requested / execution.requested / execution.completed   ~$0
        │  queue depth drives Application Auto Scaling
        ▼
ECS Fargate Spot, public subnet, min 0 tasks
   ├─ orchestrator (0.25 vCPU / 0.5 GB)
   └─ executor     (1 vCPU / 2 GB, Chromium)
        │
        ├──▶ S3 artifacts (30-day lifecycle)
        └──▶ Aurora Serverless v2, MinCapacity = 0 (auto-pause)

no NAT · no ALB · no ElastiCache · secrets from SSM Parameter Store
```

**Why App Runner for the API rather than Lambda.** App Runner gives a managed HTTPS hostname with no ALB, and Express plus the SSE endpoint `GET /runs/:id/stream` keep working unchanged. Idle cost is provisioned-memory only: `$0.007/GB-hr × 0.5 GB × 730 h ≈ $2.56/mo`, plus active vCPU during requests. Lambda with a Function URL would be $0 idle but requires response streaming for SSE and a Lambda Web Adapter wrapper — more code risk than $2.56/mo justifies. Its VPC connector reaches Aurora with **no NAT gateway**.

**Scale-to-zero has one documented trap.** Target-tracking on backlog-per-task divides queue depth by running task count, which is undefined at zero tasks, so **target tracking alone cannot wake the service from zero**. The working pattern is a hybrid: a **step-scaling** alarm on `ApproximateNumberOfMessagesVisible` handles 0 → 1, and target tracking on a backlog-per-task metric (with `IF(tasks > 0, q/tasks, q)` metric math) handles 1 → N. Set `min_capacity = 0` on the scalable target and create the service with `desired_count = 0` and `lifecycle { ignore_changes = [desired_count] }`.

**Cold start is the trade.** Waking a Fargate task costs ENI allocation plus an image pull — and the executor image is ~1.6 GB. Budget **60–120 seconds** before the first job starts. Aurora resuming from 0 ACU adds up to **15 seconds** on first connection. Both are invisible for a scheduled overnight batch and noticeable for someone clicking in the UI.

**Estimated cost.** Fixed monthly:

| Line item | Est. $/mo |
|---|---|
| App Runner 0.25 vCPU / 0.5 GB, min 1 instance | $2.56 |
| Aurora Serverless v2 paused (storage ~10 GB @ $0.10/GB-mo + I/O) | $1–3 |
| S3 artifacts, 30-day lifecycle | $0.40 |
| ECR, 2 images retained | $0.15 |
| CloudWatch Logs, 7-day retention | $0.50–2.50 |
| SQS · Parameter Store · CloudFront · SPA in S3 | $0 |
| NAT · ALB · ElastiCache | **$0 — not provisioned** |
| **Fixed total** | **~$5–8** |

Per run (5-minute pipeline, `ZERO_ANALYZER_MAX_PAGES=3`, `EXECUTION_MODE=minimal`), at `$0.04048/vCPU-hr` and `$0.004445/GB-hr`:

| Component | On-demand | Spot (~70% off) |
|---|---|---|
| Executor 1 vCPU / 2 GB × 5 min | $0.0041 | ~$0.0012 |
| Orchestrator 0.25 vCPU / 0.5 GB × 6 min | $0.0012 | ~$0.0004 |
| S3 PUTs + ~20 MB stored | ~$0.0005 | same |
| **Per website** | **~$0.006** | **~$0.002** |

---

## 4. Side by side

| | **A — single node** | **B — scale-to-zero burst** |
|---|---|---|
| Fixed $/mo | ~$10 (Spot) · ~$27 (on-demand) | **~$5–8** |
| $/website | $0 (fixed capacity) | ~$0.002 Spot · ~$0.006 on-demand |
| At 10 sites/day | ~$10 | **~$6** |
| At 50 sites/day | ~$10, but ~4 h/day serialized | **~$9** |
| At 200 sites/day | needs a bigger box; queue backs up | **~$20–25** |
| Concurrency | 1 Chromium | scales to the max-task cap you set |
| Availability | single point of failure | task-level failure only |
| Cold start | none (always warm) | 60–120 s task + 15 s Aurora |
| Backups | roll your own on EBS | Aurora automated |
| Time to build | ~1 day | ~3–5 days |
| Blast radius of a Spot reclaim | whole platform | one job, redelivered |

Volume figures are estimates that assume `ZERO_LLM=off`; LLM spend is separate and capped per run.

### Recommendation

**Option B.** The deciding factor is not the ~$3/mo difference at low volume — it is that B answers "size it so it scales without a redesign" and A does not. A is capped at one concurrent Chromium and grows only by resizing the box, so moving from 10 to 100 sites a day means rebuilding onto B anyway. B's cost curve is flat-then-linear with no step change, and the same Terraform serves 10 or 500 sites a day by raising a max-task number.

Option A remains the right answer for one case: a permanent internal instance where you want a flat bill, always-warm UI, and no ECS to operate.

---

## 5. Daily multi-site batch trigger

Free on both options, and no new subsystem.

```
EventBridge Scheduler (cron, e.g. 02:00 daily)
        ▼
Lambda (Node 20, 128 MB)
   ├─ reads the URL list from an SSM parameter or an S3 object
   ├─ reads the API key from Parameter Store
   └─ POST /runs  { ottUrl, testCaseInputMode: "auto" }  per site
        ▼
SQS runs.requested  ── holds the backlog; auto scaling drains it
```

Cost is $0: EventBridge Scheduler's free tier covers 14M invocations/mo and Lambda's covers 1M requests plus 400,000 GB-seconds.

**Do not throttle in the Lambda.** Post all URLs at once and let SQS hold the backlog — the queue *is* the buffer. Throttle with `ZERO_ORCH_CONCURRENCY`, `ZERO_EXEC_CONCURRENCY`, and the ECS max-task ceiling, because those are also the knobs that bound your bill. A max-task cap is the only thing standing between a bug and a runaway Fargate spend, so set it before the first apply.

Keep the URL list in an SSM parameter rather than in code, so adding a site is a one-line change with no deploy.

---

## 6. Blockers found in the code

**These are prerequisites for either option, and two of them are correctness bugs rather than cost items.** They do not surface today because `ZERO_CLOUD=aws` is not yet running anywhere.

### B1 — SQS visibility timeout is far shorter than a job (correctness)

`packages/cloud/aws/queue.js` deletes a message only *after* the handler resolves, which is correct at-least-once behavior:

```js
for (const m of out.Messages || []) {
  // …
  await handler(parsed);
  if (m.ReceiptHandle) {
    await client().send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: m.ReceiptHandle }));
  }
}
```

But `infra/aws/main.tf` never sets `visibility_timeout_seconds`, so the queues take the **SQS default of 30 seconds** while an execution job runs for minutes (`ZERO_EXEC_TIMEOUT_MS` defaults to 300000). The message becomes visible again mid-job and a second consumer starts **a duplicate Chromium run on the same `runId`** — wrong results and doubled compute, repeating every 30 seconds.

Fix: set `visibility_timeout_seconds` above the job ceiling (≥ 360 s for the execution queue), and preferably add a periodic `ChangeMessageVisibility` heartbeat so a slow job cannot be redelivered at all.

### B2 — a batch of 5 is processed serially (correctness)

The same loop receives `MaxNumberOfMessages: 5` and awaits each handler in turn, so message 5 waits for messages 1–4 to finish. Even with B1 fixed, later messages in a batch can exceed their visibility timeout while queued behind a multi-minute Chromium job.

Fix: `MaxNumberOfMessages: 1` for the execution topic, or extend visibility per message on receipt.

### B3 — no graceful shutdown (Spot and scale-in)

`services/executor/main.js` installs no `SIGTERM` handler. On a Spot reclaim (2-minute notice) or a scale-in event, ECS sends `SIGTERM` then `SIGKILL` after `stopTimeout` (default 30 s), killing in-flight Chromium. With B1 fixed, SQS redelivers the job so nothing is lost, but you pay for the wasted partial run and may orphan artifacts.

Fix: on `SIGTERM`, stop polling, let in-flight jobs finish, then exit; set ECS `stopTimeout: 120`. The queue adapter already returns an unsubscribe function from `subscribe()` — wire it up.

### B4 — the SPA cannot authenticate (product decision)

Documented in [DEPLOY.md](./DEPLOY.md): the SPA never sends `x-api-key`, so `NODE_ENV=production` returns 401 on every `/runs` call from the browser. A demo works around this by leaving auth off; **a permanent deployment cannot.** This needs either a UI change to send a key, or a real session layer in front of the API. It is the largest non-infra blocker and it is a product decision, not an infra one.

### B5 — verify artifact URL generation under `ZERO_CLOUD=aws`

With `ZERO_CLOUD=local` artifact links are HMAC-signed `/cloud/local` URLs built from `ZERO_PUBLIC_BASE_URL`. Under `ZERO_CLOUD=aws` they should be presigned S3 URLs instead. Confirm which path `packages/cloud/aws/objectStore.js` takes end to end before deploying, and set `ZERO_PUBLIC_BASE_URL` to the stable App Runner origin regardless.

### B6 — CloudWatch Logs can outgrow the database bill

`services/executor/jobs.js` is verbose. At ~5 MB of logs per run and 50 runs/day, ingestion at $0.50/GB is ~$3.75/mo — more than Aurora costs while paused. Set 7-day retention from day one and treat log volume as a cost line, not an afterthought.

---

## 7. Terraform changes required

`infra/aws/main.tf` today provisions S3, three SQS queues, one Secrets Manager secret, and an optional ElastiCache cluster. For Option B it needs:

| Change | Reason |
|--------|--------|
| **Remove** `aws_elasticache_*` | Not needed with SQS queues — [§1](#elasticache-is-optional-and-the-code-proves-it) |
| **Add** `visibility_timeout_seconds` to all three queues | Blocker B1 |
| **Add** a dead-letter queue + `redrive_policy` | Otherwise a poison message retries forever |
| **Add** `aws_s3_bucket_lifecycle_configuration` (30-day expiry) | Bounds artifact storage growth |
| **Add** ECS cluster, two task definitions, two services with `FARGATE_SPOT`, `desired_count = 0` | The workers |
| **Add** Application Auto Scaling: `min_capacity = 0`, step policy for 0 → 1, target tracking for 1 → N | [§3](#3-option-b--scale-to-zero-burst) |
| **Add** App Runner service + VPC connector | The API, without an ALB |
| **Add** Aurora Serverless v2 cluster, `MinCapacity = 0`, `SecondsUntilAutoPause = 600` | Scale-to-zero Postgres |
| **Add** SSM parameters + task-role IAM | Free secrets, [§1](#secrets-manager-is-optional-too) |
| **Add** S3 + CloudFront for the SPA | Free TLS and hosting |
| **Add** EventBridge Scheduler + Lambda | [§5](#5-daily-multi-site-batch-trigger) |
| **Add** a budget alarm and an ECS max-task ceiling | AWS has no hard spend cap |
| **Replace** Secrets Manager secret with a Parameter Store parameter | $0.40/mo → $0 |

Note that [deploy/AWS.md](./deploy/AWS.md) argues against "Fargate + ALB + NAT" and it is right to — that shape carries a ~$50/mo floor at zero traffic. **This doc proposes Fargate specifically *without* an ALB or a NAT gateway**, which is what makes the floor ~$5–8 instead. The two documents are not in conflict; they reject the same line items.

---

## 8. Product implication — what a free tier can include

Because the deterministic stages have no marginal cost ([§1](#1-the-economic-premise)), the WebPageTest model transfers directly. A free tier can include the full crawl, performance metrics, accessibility pass, security header audit, template-generated test cases, and the Playwright and Java script exports — everything reachable with `ZERO_LLM=off`, costing roughly **$0.002 of Spot compute per site**.

What has to sit behind a paid plan or bring-your-own key is exactly the LLM enrichment: BA consolidation, LLM-authored manual cases, locator inference, the Manager narrative, and domain inference. That boundary already exists as a supported runtime configuration, so no new code is needed to enforce it.

Manage demand the way WebPageTest does — queue depth, per-key rate limits, and expiring artifacts (the 30-day S3 lifecycle rule is already the mechanism) — rather than by buying capacity.

---

## 9. Open decisions

1. **Option A or B**, per [§4](#4-side-by-side). Recommendation is B.
2. **How the UI authenticates** (blocker B4) — API key in the SPA, or a session layer.
3. **Aurora at 0 ACU, or no database at all.** ZER0 already falls back to memory plus `run.json` in the object store. If nobody queries run history in SQL, S3 alone is cheaper and simpler — but you lose cross-run locator learning.
4. **Whether to track this as a workflow milestone.** `support/agent-workflow/progress.json` has `current: "Q5"` (domain/sub-domain classification). This is infrastructure, not product capability, so it belongs in the packaging track as a new **S8** rather than folded into Q5 — otherwise `npm run workflow:verify -- --milestone Q5` stops meaning anything.

---

## Related

- [COST.md](./COST.md) — demo tier vs production floors, LLM caps, executor sizing
- [DEPLOY.md](./DEPLOY.md) — demo tier, auth/CORS trade-offs
- [deploy/AWS.md](./deploy/AWS.md) — single-EC2 demo, and why not ALB + NAT
- [DOCKER.md](./DOCKER.md) — the Compose stack Option A reuses
- [ARCHITECTURE.md](./ARCHITECTURE.md) — runtime topology and LLM wiring
- [../v2/ARCHITECTURE.md](../v2/ARCHITECTURE.md) — production gaps
- [../../../../infra/README.md](../../../../infra/README.md) — Terraform bootstrap
- Root [AGENTS.md](../../../../AGENTS.md) — pipeline stages, execution modes, env knobs

### Pricing sources

All dollar figures are **estimates for `us-east-1`, Aug 2026**. Verify before committing.

- [EC2 on-demand](https://aws.amazon.com/ec2/pricing/on-demand/) · [Fargate](https://aws.amazon.com/fargate/pricing/) · [App Runner](https://aws.amazon.com/apprunner/pricing/)
- [Aurora](https://aws.amazon.com/rds/aurora/pricing/) · [Aurora Serverless v2 auto-pause](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html)
- [S3](https://aws.amazon.com/s3/pricing/) · [CloudFront](https://aws.amazon.com/cloudfront/pricing/) · [SQS](https://aws.amazon.com/sqs/pricing/) · [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/)
- [VPC / NAT](https://aws.amazon.com/vpc/pricing/) · [ELB](https://aws.amazon.com/elasticloadbalancing/pricing/) · [Systems Manager](https://aws.amazon.com/systems-manager/pricing/)
- [ECS auto scaling best practice](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/capacity-autoscaling-best-practice.html)

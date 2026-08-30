# Demo deploy — AWS (single EC2 + Compose)

One `t4g.medium` EC2 instance, a public IP, and `docker compose up`. The SPA (nginx `:3000`) and the API (Express `:3001`) come off the same box, so there is no ALB, no CloudFront, no RDS, no ElastiCache, and no NAT gateway. Headline: **~$0.04 per demo-hour**, dropping to **~$2.40/mo** if you stop the instance afterwards and **$0** if you terminate it.

| | |
|---|---|
| **Path** | 1× EC2 `t4g.medium` (2 vCPU / 4 GB, Graviton) running the `docker-compose.yml` stack on a public IP |
| **Est. cost while running** | **$0.042 / demo-hour** — $0.0336 instance + $0.005 public IPv4 + $0.0033 EBS (estimate, Aug 2026, `us-east-1`) |
| **Est. cost after teardown** | **$2.40 / mo** stopped (30 GB gp3 only) · **$0.00 / mo** terminated |
| **Free tier** | Depends on account age; `t4g.medium` is not eligible under either plan — see [§10](#10-cost-safety) |
| **Postgres** | not required (memory + file); the Compose `postgres` container is free and used by default |
| **Time to first demo** | ~20 minutes, ~10 of which is the Playwright image build |

---

## 0. What you are deploying

Four app containers plus two infra containers on one host, exactly as [DOCKER.md](../DOCKER.md) describes:

| Container | Port | Role |
|-----------|------|------|
| `web` | `3000` | nginx serving the built Vite SPA (static only, no `/api` proxy) |
| `api` | `3001` | Express intake — `/runs`, `/cloud/local`, `/health`, SSE |
| `orchestrator` | — | DAG worker consuming `runs.requested` |
| `executor` | — | Playwright/Chromium worker consuming `execution.requested` |
| `redis` | — | Queue + cache shared by the three app containers |
| `postgres` | — | Run/asset metadata; free because it is a container, not RDS |

`docs` (`:5174`) and `workflow` (`:5175`) are not started — `docs` runs `npm ci` on boot and wastes minutes.

**Redis is mandatory for this topology.** With `ZERO_CLOUD=local` the object store is the local filesystem, but the queue in `packages/cloud/local/queue.js` is an in-process `Map` of handlers — three containers publishing to it never see each other. Compose fixes this with the `redis` container plus the shared `app-artifacts` volume; keep both. The single-process alternative is `Dockerfile.demo`, used by the [App Runner path](#alternative--app-runner-pause-instead-of-stop).

**No RDS.** `DATABASE_URL` points at the `postgres` container. Unset it and ZER0 falls back to an in-memory `Map` + `dist/artifacts/<runId>/run.json`, with `/health` reporting `storage: "memory"`. Either way the database costs $0 — and artifacts are ephemeral, so replacing the instance loses every past run.

> **Security trade-off, read this.** The demo leaves `NODE_ENV` unset. Setting `NODE_ENV=production` forces verified auth on `/runs`, `/provider-keys`, and `/agent-settings`, and the SPA never sends `x-api-key` — the browser UI would 401 on every call. Unset `NODE_ENV` also means CORS allows all origins. So **anyone who can reach `:3001` can start Playwright runs on your instance.** Lock the security group to your own IP ([§3](#3-create-the-network--key-pair--security-group)) and stop the instance when the demo ends.

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|-------|
| AWS account with billing enabled | Free-plan accounts cannot exceed credits — [§10](#10-cost-safety) |
| IAM identity with `ec2:*` in one region | Plus `budgets:*` for the spend alarm |
| SSH client | OpenSSH, or Session Manager if you prefer no SSH |
| Your public IP | `curl -s https://checkip.amazonaws.com` |
| A Git remote for this repo | The instance clones it; public fork or HTTPS token both work |

No local Docker, Node, or Playwright needed — everything builds on the instance. Examples use `us-east-1` because it is cheapest and every price below is quoted for it; other regions run 5–15% higher.

---

## 2. Install and authenticate the CLI

```bash
brew install awscli          # or: curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o AWSCLIV2.pkg && sudo installer -pkg AWSCLIV2.pkg -target /
aws --version                # expect aws-cli/2.x
aws configure                # access key, secret, region=us-east-1, output=json
aws sts get-caller-identity  # confirms credentials resolve
```

Console: sign in at `https://console.aws.amazon.com/` → top-right region selector → **US East (N. Virginia)**.

Export these once; every later block reuses them:

```bash
export AWS_REGION=us-east-1
export ZERO_REPO=https://github.com/<you>/Zero.git   # your fork / remote
export MY_IP="$(curl -s https://checkip.amazonaws.com)/32"
```

---

## 3. Create the network + key pair + security group

Use the **default VPC** — it already has an internet gateway, public subnets, and auto-assigned public IPs. Building your own risks a NAT gateway you do not need.

```bash
export VPC_ID=$(aws ec2 describe-vpcs --region "$AWS_REGION" \
  --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
# prints None? → aws ec2 create-default-vpc --region "$AWS_REGION"

# key pair — the private key is only downloadable at creation time
aws ec2 create-key-pair --region "$AWS_REGION" --key-name zero-demo \
  --query 'KeyMaterial' --output text > ~/.ssh/zero-demo.pem
chmod 400 ~/.ssh/zero-demo.pem

export SG_ID=$(aws ec2 create-security-group --region "$AWS_REGION" \
  --group-name zero-demo-sg --description "ZER0 demo: SSH + SPA + API" \
  --vpc-id "$VPC_ID" --query 'GroupId' --output text)

for PORT in 22 3000 3001; do
  aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
    --group-id "$SG_ID" --protocol tcp --port "$PORT" --cidr "$MY_IP"
done
```

| Port | Source | Why |
|------|--------|-----|
| 22 | your `/32` | SSH for logs and rebuilds |
| 3000 | your `/32` | Browser loads the SPA from nginx |
| 3001 | your `/32` | Browser and `curl` call the API directly |

Outbound stays default allow-all — needed to pull images, clone, and let the crawler reach the target site. Add a colleague's `/32` to demo to them, but **never `0.0.0.0/0`**: auth is off, so that publishes an unauthenticated run-trigger.

Console: **EC2 → Key Pairs → Create key pair** (`.pem`), then **Security Groups → Create security group** → three Custom TCP inbound rules with source **My IP**.

---

## 4. Launch the instance

| Type | vCPU | RAM | $/hr | $/mo (730 h) | Verdict |
|------|------|-----|------|--------------|---------|
| `t4g.small` | 2 | 2 GB | $0.0168 | $12.26 | Works but tight — Chromium + 6 containers will swap |
| **`t4g.medium`** | 2 | **4 GB** | **$0.0336** | **$24.53** | **Recommended** — cheapest comfortable option |
| `t3.small` | 2 | 2 GB | $0.0208 | $15.18 | x86 equivalent of `t4g.small` |
| `t3.medium` | 2 | 4 GB | $0.0416 | $30.37 | x86 fallback if anything arm64 misbehaves |

Linux on-demand, `us-east-1` (estimate, Aug 2026 — verify on the [EC2 on-demand pricing page](https://aws.amazon.com/ec2/pricing/on-demand/)).

**Graviton is safe here — verified.** `mcr.microsoft.com/playwright:v1.58.2-jammy` is a multi-arch manifest; the MCR tag list publishes both `v1.58.2-jammy-amd64` and `v1.58.2-jammy-arm64`, and Docker resolves the right one. Every other base image (`node:20-bookworm`, `node:20-alpine`, `nginx:1.27-alpine`, `postgres:16-alpine`, `redis:7-alpine`) is multi-arch too, and Compose **builds on the instance**, so no cross-compilation is involved. If a future image drops arm64, switch to `t3.medium` + the amd64 AMI; nothing else changes.

**Why 4 GB.** `services/executor/browser.js` launches Chromium with `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`, so a large `/dev/shm` is not required (Compose's `shm_size: 1gb` is belt-and-braces) — but that flag pushes shared-memory traffic into ordinary RAM. 2 GB is the floor; 4 GB is the safe target.

Resolve the AMI from Canonical's public SSM parameter rather than hardcoding an ID:

```bash
export AMI_ID=$(aws ssm get-parameters --region "$AWS_REGION" \
  --names /aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id \
  --query 'Parameters[0].Value' --output text)
# x86 fallback: swap arm64 → amd64 in that path and use t3.medium
```

Bootstrap script — installs Docker, clones, discovers its **own** public IP via IMDSv2, writes both config files, starts the four app services:

```bash
cat > user-data.sh <<'EOS'
#!/bin/bash
set -euxo pipefail
apt-get update -y && apt-get install -y git curl openssl
curl -fsSL https://get.docker.com | sh          # installs the compose v2 plugin too
usermod -aG docker ubuntu

git clone --depth 1 "__ZERO_REPO__" /opt/zero && cd /opt/zero

TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)

# Interpolated by Compose; baked into the SPA bundle at build time.
echo "VITE_API_BASE_URL=http://$IP:3001" > .env

# docker-compose.yml hardcodes ZERO_PUBLIC_BASE_URL=http://localhost:3001 with no
# ${VAR} interpolation, so it MUST be overridden or signed /cloud/local URLs point
# at the browser's own localhost and every artifact download 404s.
cat > docker-compose.override.yml <<EOF
x-demo-env: &demo-env
  ZERO_PUBLIC_BASE_URL: http://$IP:3001
  ZERO_WEB_URL: http://$IP:3000
  KEY_ENC_SECRET: $(openssl rand -hex 32)
  ZERO_LOCAL_STORE_SECRET: $(openssl rand -hex 32)
  ZERO_LLM: "off"
  ZERO_ANALYZER_MAX_PAGES: "3"
  ZERO_ORCH_CONCURRENCY: "1"
  ZERO_EXEC_CONCURRENCY: "1"

services:
  api:          { environment: *demo-env }
  orchestrator: { environment: *demo-env }
  executor:     { environment: *demo-env }
EOF

docker compose up -d --build web api orchestrator executor
EOS

sed -i '' "s|__ZERO_REPO__|$ZERO_REPO|" user-data.sh   # GNU sed: drop the ''
```

`ZERO_LOCAL_STORE_SECRET` must be **byte-identical across `api`, `orchestrator`, and `executor`** — the YAML anchor guarantees it. Different values mean HMAC-signed `/cloud/local` URLs minted by one process are rejected by another.

```bash
export INSTANCE_ID=$(aws ec2 run-instances --region "$AWS_REGION" \
  --image-id "$AMI_ID" --instance-type t4g.medium --key-name zero-demo \
  --security-group-ids "$SG_ID" --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
  --metadata-options 'HttpTokens=required' \
  --user-data file://user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=zero-demo},{Key=Project,Value=zero-demo}]' \
  --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"

export PUBLIC_IP=$(aws ec2 describe-instances --region "$AWS_REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "SPA http://$PUBLIC_IP:3000   API http://$PUBLIC_IP:3001"
```

30 GB gp3 is deliberate: the executor image is ~1.6 GB compressed and several GB unpacked, plus five more images and build layers — 20 GB fills up mid-build. `DeleteOnTermination: true` means terminating also deletes the volume, so no orphaned EBS bill.

Console: **EC2 → Instances → Launch instance** → Name `zero-demo` → AMI **Ubuntu Server 24.04 LTS (arm64)** → Type `t4g.medium` → Key pair `zero-demo` → Network settings **Edit** → existing security group `zero-demo-sg`, **Auto-assign public IP = Enable** → Storage **30 GiB gp3** → Advanced details → **User data** = paste `user-data.sh` → **Launch instance**.

---

## 5. Install Docker and start the stack

The user-data above already did this — watch it finish, or run the same steps by hand to recover from a failed bootstrap:

```bash
ssh -i ~/.ssh/zero-demo.pem ubuntu@"$PUBLIC_IP" 'sudo tail -f /var/log/cloud-init-output.log'

# manual recovery, on the instance
sudo apt-get update -y && sudo apt-get install -y git curl openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exec newgrp docker
git clone --depth 1 https://github.com/<you>/Zero.git /opt/zero && cd /opt/zero
echo "VITE_API_BASE_URL=http://$(curl -s https://checkip.amazonaws.com):3001" > .env
# write docker-compose.override.yml exactly as in §4, then:
docker compose up -d --build web api orchestrator executor && docker compose ps
```

The Playwright pull plus `npm ci` across four images takes **8–12 minutes** on 2 burstable vCPU; `docker compose logs -f api` is the useful stream. `postgres` and `redis` start automatically because all three app services declare `depends_on … condition: service_healthy` on both, and naming only the four app services keeps `docs` and `workflow` out.

---

## 6. Point the SPA at the API

This is the step people get backwards.

| Variable | Value | Consumed by |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `http://<public-ip>:3001` | **Build arg** for the `web` image — the browser's API target |
| `ZERO_PUBLIC_BASE_URL` | `http://<public-ip>:3001` | API runtime — base for HMAC-signed `/cloud/local` URLs |
| `ZERO_WEB_URL` | `http://<public-ip>:3000` | Advisory only; logged at API startup |

The browser loads the SPA from **`:3000`** and calls the API at **`:3001`** — same IP, different ports. There is no nginx `/api` proxy; `web/nginx.conf` serves static files and `/health`, nothing else.

`VITE_API_BASE_URL` is **baked into the JavaScript bundle at build time** — there is no runtime config, so changing the API origin means rebuilding the `web` image. You need this after every stop/start, because a stopped instance **loses its auto-assigned public IP**:

```bash
cd /opt/zero
echo "VITE_API_BASE_URL=http://$(curl -s https://checkip.amazonaws.com):3001" > .env
docker compose up -d --build web

# alternative: a stable address, billed $0.005/hr (~$3.65/mo) attached OR idle,
# so it does NOT stop billing when the instance does — see §9 before you leave.
export ALLOC_ID=$(aws ec2 allocate-address --region "$AWS_REGION" --domain vpc \
  --query 'AllocationId' --output text)
aws ec2 associate-address --region "$AWS_REGION" \
  --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID"
```

Rebuilding takes ~1 minute with warm layers, so for a one-shot demo it beats an Elastic IP.

---

## 7. Verify

```bash
curl -s "http://$PUBLIC_IP:3000/health"            # nginx liveness → 200
curl -s "http://$PUBLIC_IP:3001/health"            # {"ok":true,"service":"ZER0","storage":"postgres+memory"}
curl -s "http://$PUBLIC_IP:3001/health/detailed"   # adapter + queue + DB detail
```

Both `/health` endpoints are unauthenticated by design, so they work regardless of auth config. `storage` reads `postgres+memory` because `DATABASE_URL` points at the container, or `memory` if you drop it.

Then open **`http://<public-ip>:3000`**. A blank page or `Failed to fetch` almost always means `web` was built with the wrong `VITE_API_BASE_URL` — see [Troubleshooting](#troubleshooting).

---

## 8. Run one demo end to end

URL-only autonomous run — no CSV, no Figma, no notes:

```bash
curl -s -X POST "http://$PUBLIC_IP:3001/runs" \
  -H 'Content-Type: application/json' \
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}'
# → 202 {"runId":"..."}

export RUN_ID=<runId>
curl -s  "http://$PUBLIC_IP:3001/runs/$RUN_ID"          # stage-by-stage status
curl -Ns "http://$PUBLIC_IP:3001/runs/$RUN_ID/stream"   # SSE progress
curl -s  "http://$PUBLIC_IP:3001/runs/$RUN_ID/assets"   # Playwright + Java scripts, reports
```

`ottUrl` is required, and `"testCaseInputMode":"auto"` is what permits a URL-only run: with no TC file, Web Analyzer crawls (BA notes are optional and do not skip it), then BA → Manual QA → Automation QA → Execution → Manager → Delivery. `POST /runs` returns **202 immediately** and the pipeline continues in the background.

Add `-H "x-api-key: <key>"` to every call except `/health` if you turned auth on. The browser UI cannot do this — the SPA never sends that header.

Expect **2–5 minutes** with `ZERO_ANALYZER_MAX_PAGES=3` and `EXECUTION_MODE=minimal` (the default: load URL, wait for body). Execution has a 5-minute ceiling — the orchestrator waits for `execution.completed` per `ZERO_EXEC_TIMEOUT_MS` (default `300000`). Do not set `RUN_HEADED=true`: there is no `DISPLAY`, so it silently falls back to headless.

In the UI: **New Run** → paste the URL → leave everything else blank → **Start** → watch the SSE stage timeline → open **Assets**.

---

## 9. Teardown / scale to zero

**Option A — Stop (keep the box, ~$2.40/mo).** Instance state and Docker images survive, so restarts are fast.

```bash
aws ec2 stop-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"
aws ec2 wait instance-stopped --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"
```

| Still billed after stop | Rate | At 30 GB |
|---|---|---|
| gp3 root volume | $0.08/GB-mo | **$2.40/mo** |
| Instance hours | — | $0 |
| Auto-assigned public IPv4 | — | $0 — released on stop |
| Elastic IP, if allocated | $0.005/hr | **$3.65/mo** — bills while idle |

Restart with `aws ec2 start-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"`, then rebuild `web` for the new IP ([§6](#6-point-the-spa-at-the-api)).

**Option B — Terminate (true $0).** `DeleteOnTermination: true` removes the root volume with the instance.

```bash
aws ec2 terminate-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"
aws ec2 wait instance-terminated --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"

# release an Elastic IP if you allocated one — an unattached EIP still bills $0.005/hr
aws ec2 release-address --region "$AWS_REGION" --allocation-id "$ALLOC_ID"

# free, but keeps the account tidy
aws ec2 delete-security-group --region "$AWS_REGION" --group-id "$SG_ID"
aws ec2 delete-key-pair --region "$AWS_REGION" --key-name zero-demo
```

Then sweep for the two things that silently keep billing:

```bash
aws ec2 describe-volumes --region "$AWS_REGION" --filters Name=status,Values=available \
  --query 'Volumes[].[VolumeId,Size]' --output table        # orphaned volumes, $0.08/GB-mo
aws ec2 describe-snapshots --region "$AWS_REGION" --owner-ids self \
  --query 'Snapshots[].[SnapshotId,VolumeSize]' --output table  # snapshots, $0.05/GB-mo
# aws ec2 delete-volume --volume-id vol-xxxx
# aws ec2 delete-snapshot --snapshot-id snap-xxxx
```

Console: **EC2 → Instances** → select → **Instance state → Stop** or **Terminate (delete) instance**; then **Elastic IPs → Release**, **Volumes** filtered *Available* → **Delete**, **Snapshots → Delete**. The default VPC, subnets, internet gateway, and route tables cost nothing — leave them.

**Do not run `terraform apply` in `infra/aws/`.** That module provisions S3, three SQS queues, Secrets Manager, and an ElastiCache `cache.t3.micro` (~$12/mo) for the `ZERO_CLOUD=aws` adapters. This demo runs `ZERO_CLOUD=local` and needs none of it.

---

## 10. Cost safety

AWS has **no hard spend cap** on a paid account. Budgets only notify — they do not stop anything. Set one before you launch. Budgets is global but the endpoint lives in `us-east-1`:

```bash
export ACCT=$(aws sts get-caller-identity --query Account --output text)

cat > budget.json <<'EOF'
{ "BudgetName": "zero-demo-guardrail",
  "BudgetLimit": { "Amount": "5", "Unit": "USD" },
  "TimeUnit": "MONTHLY", "BudgetType": "COST" }
EOF

cat > notify.json <<'EOF'
[ { "Notification": { "NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN",
      "Threshold": 1, "ThresholdType": "ABSOLUTE_VALUE" },
    "Subscribers": [ { "SubscriptionType": "EMAIL", "Address": "you@example.com" } ] } ]
EOF

aws budgets create-budget --region us-east-1 --account-id "$ACCT" \
  --budget file://budget.json --notifications-with-subscribers file://notify.json
```

Console: **Billing and Cost Management → Budgets → Create budget → Use a template → Zero spend budget** (or **Monthly cost budget**) → amount → your email → **Create budget**. Also enable **Billing preferences → Receive free tier usage alerts** and **Receive billing alerts**. The `run-instances` call tags `Project=zero-demo`, so **Cost Explorer → group by Tag** isolates the demo.

**Free tier, honestly.** Two models coexist and which applies depends on when the account was opened:

| Account created | Model | What it means here |
|---|---|---|
| before 15 Jul 2025 | Legacy 12-month tier: 750 h/mo `t2.micro`/`t3.micro`, 750 h/mo public IPv4, 30 GB EBS | Neither micro size has enough RAM for Chromium, so you pay for `t4g.medium` |
| on/after 15 Jul 2025 | Free plan: $100 credit at signup + up to $100 earned, 6 months, account closes at 6 months or credit exhaustion. Eligible types: `t3.micro`, `t3.small`, `t4g.micro`, `t4g.small`, `c7i-flex.large`, `m7i-flex.large` | EC2 usage **draws down the credit** — not a separate hour allowance. `t4g.medium` is not on that list; a few demo-hours cost cents against the credit |

Do not assume the 750-hour tier still applies — check **Billing → Free tier** for your own account. Either way, `t4g.medium` at ~$0.042/hr makes a two-hour demo cost under a dime. The real risk is forgetting to stop it: ~$28/mo.

Data transfer out is free for the first 100 GB/mo aggregated across the account, then ~$0.09/GB — irrelevant at demo volume.

---

## Alternative — App Runner (pause instead of stop)

One managed service running `Dockerfile.demo`: a **single container** booting orchestrator + executor + API in one OS process via `scripts/local-stack.js`. That is what makes `ZERO_CLOUD=local` work with **no Redis and no Postgres** — the in-process queue only functions when publisher and subscriber share a process, so do **not** set `REDIS_URL` here.

Pick App Runner over EC2 for a managed HTTPS URL and certificate, no SSH, no security group, and one-command pause. Pick EC2 for the lowest hourly cost, the browser UI on the same host, and no ECR push. Both run the container continuously, which matters: `POST /runs` returns 202 and works in the background, so any platform that freezes the container after the response (Lambda, request-scoped-CPU serverless generally) abandons the pipeline mid-run. Two App Runner constraints:

1. **No arm64.** App Runner instances are x86_64 only — there is no architecture field in `InstanceConfiguration`. Build with `--platform linux/amd64` even on Apple Silicon, and expect a slow emulated build.
2. **One port per service**, so this path serves the **API only**. Host the SPA elsewhere (`npm run build` → S3 + CloudFront, or `npm run client` locally) with `VITE_API_BASE_URL` set to the App Runner HTTPS URL. Because `NODE_ENV` stays unset, CORS allows all origins and no `ALLOWED_ORIGINS` entry is needed; if you ever set `NODE_ENV=production`, add that SPA origin, since the production allowlist covers only localhost, `zer0.io`, `app.zer0.io`, `*.vercel.app`, and `*.up.railway.app`.

```bash
export ACCT=$(aws sts get-caller-identity --query Account --output text)
export ECR="$ACCT.dkr.ecr.$AWS_REGION.amazonaws.com/zero-demo"

aws ecr create-repository --region "$AWS_REGION" --repository-name zero-demo
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ACCT.dkr.ecr.$AWS_REGION.amazonaws.com"

# from the repo root — amd64 is mandatory
docker build --platform linux/amd64 -f Dockerfile.demo -t "$ECR:demo" . && docker push "$ECR:demo"

cat > apprunner.json <<EOF
{ "ServiceName": "zero-demo",
  "SourceConfiguration": {
    "AuthenticationConfiguration": { "AccessRoleArn": "arn:aws:iam::$ACCT:role/AppRunnerECRAccessRole" },
    "AutoDeploymentsEnabled": false,
    "ImageRepository": {
      "ImageIdentifier": "$ECR:demo", "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3001",
        "RuntimeEnvironmentVariables": {
          "ZERO_CLOUD": "local", "EXECUTION_MODE": "minimal", "ZERO_LLM": "off",
          "ZERO_ANALYZER_MAX_PAGES": "3",
          "KEY_ENC_SECRET": "$(openssl rand -hex 32)",
          "ZERO_LOCAL_STORE_SECRET": "$(openssl rand -hex 32)" } } } },
  "InstanceConfiguration": { "Cpu": "2 vCPU", "Memory": "4 GB" },
  "HealthCheckConfiguration": { "Protocol": "HTTP", "Path": "/health" } }
EOF

aws apprunner create-service --region "$AWS_REGION" --cli-input-json file://apprunner.json
export SVC=$(aws apprunner list-services --region "$AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='zero-demo'].ServiceArn" --output text)
aws apprunner describe-service --region "$AWS_REGION" --service-arn "$SVC" \
  --query 'Service.ServiceUrl' --output text
```

`AppRunnerECRAccessRole` must exist, trust `build.apprunner.amazonaws.com`, and have `AWSAppRunnerServicePolicyForECRAccess` attached — the console creates it on first use (**App Runner → Create service → Container registry → Amazon ECR → Create new service role**). Once the URL resolves, set `ZERO_PUBLIC_BASE_URL` to `https://<service-url>` in a second update deployment so signed `/cloud/local` URLs are reachable.

**Cost** (`us-east-1`, estimate Aug 2026 — [App Runner pricing](https://aws.amazon.com/apprunner/pricing/), [ECR pricing](https://aws.amazon.com/ecr/pricing/)):

| Line item | Rate | At 2 vCPU / 4 GB |
|---|---|---|
| Active (processing a request) | $0.064/vCPU-hr + $0.007/GB-hr | **$0.156/hr** |
| Provisioned / idle (memory only) | $0.007/GB-hr | **$0.028/hr** (~$20/mo if never paused) |
| ECR storage | $0.10/GB-mo | ~**$0.15–0.35/mo** — the demo image measures ~3.5 GB on disk; ECR bills compressed layers, so check with `aws ecr describe-images --repository-name zero-demo --query 'imageDetails[].imageSizeInBytes'` |

Roughly **4× the EC2 hourly cost** for the same demo — and because ZER0 keeps working after the 202 response, a long pipeline bills at the active rate with no inbound requests. Pausing is the whole point:

```bash
aws apprunner pause-service  --region "$AWS_REGION" --service-arn "$SVC"   # compute → $0, ECR still bills
aws apprunner resume-service --region "$AWS_REGION" --service-arn "$SVC"

# full teardown
aws apprunner delete-service --region "$AWS_REGION" --service-arn "$SVC"
aws ecr batch-delete-image --region "$AWS_REGION" --repository-name zero-demo --image-ids imageTag=demo
aws ecr delete-repository  --region "$AWS_REGION" --repository-name zero-demo --force
```

After `pause-service` you still pay ~$0.16/mo of ECR storage; after `delete-repository --force`, $0.

---

## Why not Fargate + ALB + NAT

The correct production shape, the wrong demo shape — on both cost and correctness.

> For a **permanent** deployment, the answer is not "Fargate + ALB + NAT" either. [../PRODUCTION_AWS.md](../PRODUCTION_AWS.md) proposes Fargate Spot scaled to zero in public subnets with **no ALB and no NAT gateway**, which drops the floor from the ~$50/mo below to ~$5–8/mo. This section rejects the same line items it does.

| Line item | Rate (`us-east-1`, estimate Aug 2026) | Monthly at idle |
|---|---|---|
| Application Load Balancer | $0.0225/hr + $0.008/LCU-hr | **~$16.43** base, before any traffic |
| NAT gateway (per AZ) | $0.045/hr + $0.045/GB processed | **~$32.85** per gateway |
| Fargate tasks (3 × 1 vCPU / 2 GB) | per-vCPU + per-GB, per second | tens of dollars if always on |
| EFS (required — see below) | per GB-mo + throughput | small but non-zero |

Sources: [ELB pricing](https://aws.amazon.com/elasticloadbalancing/pricing/), [VPC pricing](https://aws.amazon.com/vpc/pricing/), [Fargate pricing](https://aws.amazon.com/fargate/pricing/). That is a **~$50/mo floor at zero traffic** — more than a year of demo-hours on `t4g.medium`.

The correctness problem is worse. Splitting into three tasks needs **both** a shared Redis *and* a shared POSIX filesystem, because `ZERO_CLOUD=local` writes blobs to `dist/artifacts/cloud-store` on local disk. Compose satisfies this with the `app-artifacts` volume plus the `redis` container; three Fargate tasks have neither by default, so without EFS the executor writes screenshots the API cannot read and `/cloud/local` URLs 404. You would pay for ALB + NAT + ElastiCache + EFS to reproduce what one `t4g.medium` does for four cents an hour. If you do go this way, run `ZERO_CLOUD=aws` (real S3 + SQS via `infra/aws/`) rather than bolting EFS onto the local adapter.

---

## Environment reference

Compose defaults come from `x-app-env` in [docker-compose.yml](../../../../../docker-compose.yml).

| Variable | Demo value | Notes |
|----------|-----------|-------|
| `NODE_ENV` | **unset** | `production` forces auth on `/runs` and throws at boot without a real `KEY_ENC_SECRET`; the SPA cannot send `x-api-key` |
| `PORT` | `3001` | API listen port |
| `ZERO_CLOUD` | `local` | Filesystem store at `dist/artifacts/cloud-store`; queue = Redis when `REDIS_URL` set, else in-process |
| `REDIS_URL` | `redis://redis:6379` | **Required** for the split Compose stack; must be **absent** for single-process `Dockerfile.demo` |
| `DATABASE_URL` | `postgres://zero:zero@postgres:5432/zero` | Container Postgres, $0. Unset → memory + `run.json` only |
| `ZERO_PUBLIC_BASE_URL` | `http://<ip>:3001` | Base for signed `/cloud/local` URLs. Hardcoded to `localhost:3001` in Compose — **must be overridden** |
| `ZERO_WEB_URL` | `http://<ip>:3000` | Advisory; logged at startup |
| `VITE_API_BASE_URL` | `http://<ip>:3001` | Build arg baked into the SPA bundle; change ⇒ rebuild `web` |
| `KEY_ENC_SECRET` | `openssl rand -hex 32` | Encrypts stored provider keys; boot fails in production at the dev default |
| `ZERO_LOCAL_STORE_SECRET` | `openssl rand -hex 32` | HMAC key for `/cloud/local`; **identical** in api + orchestrator + executor |
| `ZERO_LLM` | `off` | Template-only pipeline, $0 LLM spend |
| `ZERO_LLM_MAX_USD_PER_RUN` | `0.50` (default) | Only relevant if you enable LLM |
| `EXECUTION_MODE` | `minimal` (default) | URL load + wait for body; reliable and cheap |
| `ZERO_ANALYZER_MAX_PAGES` | `3` | Default 8; fewer crawled pages = faster, cheaper demo |
| `ZERO_ORCH_CONCURRENCY` | `1` | Default 2; 1 keeps a 4 GB box calm |
| `ZERO_EXEC_CONCURRENCY` | `1` | Default 2; one Chromium at a time |
| `ZERO_EXEC_ATTEMPTS` | `2` (default) | Execution retries |
| `ZERO_EXEC_TIMEOUT_MS` | `300000` (default) | Orchestrator wait for `execution.completed` |
| `ZERO_DIST_ROOT` | unset | Overrides the `dist/` root if you mount a data volume |
| `ZERO_LOCAL_STORE_DIR` | unset | Overrides the object-store directory |
| `ZERO_AUTH` | unset | `on` forces auth even outside production — breaks the browser UI |
| `ZERO_API_KEYS` | unset | `tenant:email:key`, comma-separated, for `curl`-only demos |
| `ZERO_DEV_API_KEY` | unset | Single dev key alternative |
| `ALLOWED_ORIGINS` | unset | Only needed when `NODE_ENV=production` and the SPA is on another origin |
| `RECORDING_ORIGINS` | unset | Separate allowlist for `/recordings/*` |
| `RUN_HEADED` | unset | Pointless without `DISPLAY`; silently falls back to headless |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| SPA loads, every call `Failed to fetch` | `web` built with the wrong `VITE_API_BASE_URL` — usually `localhost:3001` after a stop/start changed the IP | Update `.env`, then `docker compose up -d --build web` |
| Cannot reach `:3000` / `:3001` at all | Security group scoped to a stale `/32` | Re-run `authorize-security-group-ingress` with the new `checkip.amazonaws.com` value |
| Run stuck at `execution`, times out at 5 min | `executor` dead, or `REDIS_URL` missing so `execution.requested` went to an in-process queue nobody consumes | `docker compose ps`; `docker compose logs executor`; confirm `redis` is up |
| Artifact / screenshot links 404 | `ZERO_PUBLIC_BASE_URL` still `localhost:3001`, or `ZERO_LOCAL_STORE_SECRET` differs between containers | Fix `docker-compose.override.yml`, then `docker compose up -d api orchestrator executor` |
| API crash-loops at boot | `NODE_ENV=production` without a real `KEY_ENC_SECRET` — `assertProductionSecrets()` throws | Leave `NODE_ENV` unset, or set a genuine 32-byte secret |
| Every `/runs` call 401s in the browser | Auth on via `NODE_ENV=production` or `ZERO_AUTH=on`; the SPA never sends `x-api-key` | Unset both for a UI demo, or drive it with `curl -H "x-api-key: ..."` |
| Chromium exits / OOM kill | 2 GB instance | Move to `t4g.medium`/`t3.medium`; keep `ZERO_EXEC_CONCURRENCY=1` |
| Build dies `no space left on device` | Root volume under 30 GB | `docker system prune -af`, or relaunch with 30 GB |
| `manifest unknown` pulling a base image on `t4g` | That image has no arm64 variant | Relaunch on `t3.medium` with the `amd64` AMI |
| Past runs vanished after a restart | Memory-first persistence; `dist/artifacts` lives in a host-bound Docker volume | Expected for a demo; durability needs RDS + S3 (`ZERO_CLOUD=aws`) |
| Unexpected bill after teardown | Orphaned volume, snapshot, or idle Elastic IP | Run the sweep commands in [§9](#9-teardown--scale-to-zero) |

---

## Related

- [../DEPLOY.md](../DEPLOY.md) — deployment paths overview, auth/CORS trade-offs in full
- [../COST.md](../COST.md) — production cost floors, LLM caps, executor sizing
- [../PRODUCTION_AWS.md](../PRODUCTION_AWS.md) — permanent, cost-optimized AWS deployment (not a demo)
- [../DOCKER.md](../DOCKER.md) — the Compose stack this guide runs, service by service
- [./GCP.md](./GCP.md) — same demo on Cloud Run / Compute Engine
- [./AZURE.md](./AZURE.md) — same demo on Container Apps / VM
- [./PAAS.md](./PAAS.md) — Railway / Render / Fly.io demo paths
- Root [docker-compose.yml](../../../../../docker-compose.yml) — source of truth for services and env
- Root [Dockerfile.demo](../../../../../Dockerfile.demo) — single-process image used by the App Runner path

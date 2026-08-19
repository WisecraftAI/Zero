# Demo deploy — GCP (Cloud Run, scale to zero)

One Cloud Run service running `Dockerfile.demo` (API + orchestrator + executor in a single process, `ZERO_CLOUD=local`), plus the static SPA on Firebase Hosting. No Cloud SQL, no Memorystore, no Pub/Sub, no GCS bucket, no load balancer, no NAT. At 2 vCPU / 4 GiB with instance-based billing the list rate is **~$0.16 per demo-hour**, and the Cloud Run monthly free tier covers roughly the **first 31 demo-hours per month at $0.00**. After teardown the only residue is the container image in Artifact Registry, **~$0.15/mo** — or $0.00 if you delete the repository.

| | |
|---|---|
| **Path** | 1× Cloud Run service (`Dockerfile.demo`) + Firebase Hosting for the SPA + Artifact Registry for the image |
| **Est. cost while running** | **$0.16 / demo-hour** list rate (2 vCPU + 4 GiB, instance-based billing, `us-central1`); **$0.00** inside the monthly free tier (estimate, Aug 2026) |
| **Est. cost after teardown** | **~$0.15 / mo** — Artifact Registry storage only (~2 GiB stored, minus the 0.5 GiB free allowance, at ~$0.10/GiB-mo). $0.00 if you delete the repo |
| **Free tier** | Cloud Run instance-based: 240,000 vCPU-s + 450,000 GiB-s/mo. Artifact Registry: 0.5 GiB. Firebase Hosting Spark: 10 GB storage, 360 MB/day transfer |
| **Postgres** | not required (memory + file) |
| **Time to first demo** | ~25 minutes (most of it the 1.6 GB image build and push) |

---

## 0. What you are deploying

| Piece | Where | Why |
|-------|-------|-----|
| API + orchestrator + executor | **one** Cloud Run container, `node scripts/local-stack.js` | With `ZERO_CLOUD=local` and no `REDIS_URL`, the queue in `packages/cloud/local/queue.js` is an **in-process `Map` of handlers**. A publisher and a subscriber in different containers never see each other. A shared filesystem is not enough — they must be the same OS process. `scripts/local-stack.js` is the only supported way to co-locate them, which is exactly what `Dockerfile.demo` does. |
| Object store | container filesystem, `dist/artifacts/cloud-store` | `packages/cloud/local/storage.js`, served through HMAC-signed `GET\|PUT /cloud/local` URLs built from `ZERO_PUBLIC_BASE_URL`. No GCS bucket, no bill. |
| Run metadata | in-memory `Map` + `dist/artifacts/<runId>/run.json` | With `DATABASE_URL` and `PGHOST` both unset, `/health` reports `storage: "memory"`. **Artifacts vanish when the instance is replaced** — download reports before teardown. |
| SPA | Firebase Hosting (Spark, free) | `web/` builds to 100% static files. `VITE_API_BASE_URL` is a **build ARG baked into the bundle** — there is no runtime config, so changing the API URL means rebuilding the SPA. |
| Image | Artifact Registry, same region as Cloud Run | Same-region pulls are free; cross-region pulls bill egress. |

Two deliberate omissions, both to keep the demo free:

- **No `REDIS_URL`.** `ioredis` is a real dependency of `@zero/cloud`, so setting it genuinely switches the queue and cache to Redis — and that means Memorystore. Leave it unset.
- **No `NODE_ENV=production`.** In production `services/api/auth.js` forces verified auth on `/runs`, `/provider-keys`, and `/agent-settings`, and `assertProductionSecrets()` **throws at boot** unless `KEY_ENC_SECRET` differs from the dev default. The SPA never sends `x-api-key` (there is no such string anywhere in `web/src`), so with auth on the browser UI gets **401 on every `/runs` call** and only `curl` works. For a demo where you show the UI, leave `NODE_ENV` unset — which means the URL is **publicly open**, so tear it down right after the demo ([§9](#9-teardown--scale-to-zero)). The locked-down `curl`-only variant is in [Environment reference](#environment-reference).

---

## 1. Prerequisites

| Need | Check |
|------|-------|
| Google account + a billing account | Cloud Run and Artifact Registry require billing enabled, even inside the free tier |
| Docker with buildx | `docker version` — the image is `linux/amd64`; on Apple Silicon you must cross-build ([§4](#4-build-and-push-the-demo-image)) |
| Node 20 + npm | only for the SPA build in [§6](#6-build-and-host-the-spa) |
| The repo, at the root | `ls Dockerfile.demo` must succeed |
| ~5 GB free disk | the Playwright base image is ~1.6 GB |

---

## 2. Install and authenticate the CLI

```bash
brew install --cask google-cloud-sdk      # macOS; other OSes: https://cloud.google.com/sdk/docs/install
gcloud version
gcloud auth login                         # opens a browser
gcloud auth list                          # confirm the active account

npm install -g firebase-tools             # for §6
firebase login
```

Console equivalent: run everything below from **Cloud Shell** (Console → top-right terminal icon), which ships `gcloud`, `docker`, and Node with 5 GB of free persistent disk — the fastest path if you install nothing locally.

---

## 3. Create the project and enable APIs

```bash
export PROJECT_ID="zero-demo-$RANDOM"
export REGION="us-central1"          # free-tier reference region; also cheapest for Cloud Run
export REPO="zero"
export SERVICE="zero-demo"

gcloud projects create "$PROJECT_ID" --name="ZER0 demo"
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

# link billing (required even for free-tier usage)
gcloud billing accounts list
gcloud billing projects link "$PROJECT_ID" --billing-account=0X0X0X-0X0X0X-0X0X0X

gcloud services enable run.googleapis.com artifactregistry.googleapis.com firebasehosting.googleapis.com

# image repository — keep it in the SAME region as the service
gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION"
```

Console → **IAM & Admin → Manage resources → Create Project** → **Billing → Link a billing account** → **APIs & Services → Enable APIs** (*Cloud Run Admin API*, *Artifact Registry API*, *Firebase Hosting API*) → **Artifact Registry → Repositories → Create repository**, Format `Docker`, Mode `Standard`, Region `us-central1`.

Same-region image pulls are free; cross-region pulls are billed as egress.

---

## 4. Build and push the demo image

```bash
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

export IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/zero-demo:v1"

# from the repo root
docker build -f Dockerfile.demo -t "$IMAGE" .
docker push "$IMAGE"
```

On Apple Silicon, Cloud Run needs `linux/amd64`; build in the cloud instead if your uplink is the bottleneck:

```bash
# cross-build locally
docker buildx build --platform linux/amd64 -f Dockerfile.demo -t "$IMAGE" --push .

# or build server-side
gcloud services enable cloudbuild.googleapis.com
gcloud builds submit --tag "$IMAGE" .

# verify
gcloud artifacts docker images list "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"
```

Cloud Build's free tier is 2,500 build-minutes/month on the default `e2-standard-2` ([pricing](https://cloud.google.com/build/pricing)); larger machine types are **not** covered and bill from the first minute. A local `docker push` costs nothing (ingress to Google Cloud is free), so prefer it when you can.

---

## 5. Deploy the API + workers (one Cloud Run service)

`ZERO_PUBLIC_BASE_URL` must be the service's own HTTPS origin, which you only learn after the first deploy. So deploy, read the URL, then patch it in.

**5.1 — first deploy**

```bash
export STORE_SECRET="$(openssl rand -hex 32)"
export ENC_SECRET="$(openssl rand -hex 32)"

gcloud run deploy "$SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --port=3001 \
  --cpu=2 \
  --memory=4Gi \
  --execution-environment=gen2 \
  --no-cpu-throttling \
  --cpu-boost \
  --min-instances=0 \
  --max-instances=1 \
  --timeout=3600 \
  --allow-unauthenticated \
  --set-env-vars="ZERO_CLOUD=local,EXECUTION_MODE=minimal,ZERO_LLM=off,ZERO_ANALYZER_MAX_PAGES=3,ZERO_ORCH_CONCURRENCY=1,ZERO_EXEC_CONCURRENCY=1,ZERO_EXEC_ATTEMPTS=1,ZERO_EXEC_TIMEOUT_MS=300000,ZERO_LOCAL_STORE_SECRET=${STORE_SECRET},KEY_ENC_SECRET=${ENC_SECRET}"
```

Why each non-obvious flag matters:

| Flag | Why it is not optional |
|------|------------------------|
| `--no-cpu-throttling` | `POST /runs` returns **HTTP 202 immediately** and the pipeline then runs in the background. With the default request-based billing, CPU is throttled to ~0 once the response is sent, so **the run freezes at "queued"**. This flag is the "CPU always allocated" / instance-based billing setting. |
| `--max-instances=1` | The queue is in-process, the object store is on local disk, and SSE is per-instance. A second instance would accept a `POST /runs` and strand the run where the first instance cannot see it. |
| `--min-instances=0` | Scale to zero. With `min-instances=0` you are billed only while an instance is alive; idle instances that are not minimum instances are not charged. |
| `--execution-environment=gen2` | gen1 is gVisor and emulates *most* syscalls; gen2 is a microVM with a full Linux kernel. Chromium is the exact class of workload that trips gen1's unimplemented syscalls. |
| `--memory=4Gi` | `services/executor/browser.js` launches with `--disable-dev-shm-usage`, so Chromium writes temp files to memory instead of `/dev/shm`. Cloud Run's filesystem is memory-backed too, so artifacts also count against this limit. 2 GiB is the floor; 4 GiB is comfortable. |
| `--timeout=3600` | Max request timeout for a Cloud Run service (60 min). The SSE stream on `GET /runs/:id/stream` is a long-lived request and gets cut at this value. |
| `--port=3001` | `Dockerfile.demo` sets `EXPOSE 3001` and `PORT=3001`. |
| `--cpu-boost` | Optional. Extra CPU during cold start; the 1.6 GB image is slow to start otherwise. |

**5.2 — read the URL and patch the signed-URL base**

```bash
export API_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
echo "$API_URL"     # e.g. https://zero-demo-123456789012.us-central1.run.app

gcloud run services update "$SERVICE" --region="$REGION" \
  --update-env-vars="ZERO_PUBLIC_BASE_URL=${API_URL}"
```

If `ZERO_PUBLIC_BASE_URL` is wrong, the app still runs but every signed `/cloud/local` URL points at `http://localhost:3001` and artifact downloads fail from the browser.

Console path for all of the above: **Cloud Run → Deploy container → Service** → paste the Artifact Registry image URL → Container port `3001` → *Container(s) → Resources* CPU `2`, Memory `4 GiB` → *Billing* select **Instance-based billing** → *Revision autoscaling* Min `0`, Max `1` → *Execution environment* **Second generation** → Request timeout `3600` → Authentication **Allow unauthenticated invocations** → *Variables & Secrets* add each pair from `--set-env-vars` → **Create**.

---

## 6. Build and host the SPA

The API URL is baked into the bundle, so build **after** [§5.2](#5-deploy-the-api--workers-one-cloud-run-service). You can skip this whole section and demo through `curl` only — the API is fully usable without the SPA.

```bash
npm install                                     # from the repo root
VITE_API_BASE_URL="$API_URL" npm run build      # → dist/web/
```

Create `firebase.json` at the repo root (or let `firebase init hosting` write it and point `public` at `dist/web`):

```json
{
  "hosting": {
    "public": "dist/web",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

The `rewrites` entry is required — the SPA uses client-side routing, and without it a deep link returns 404.

```bash
firebase projects:addfirebase "$PROJECT_ID"     # attach Firebase to the same GCP project
firebase use "$PROJECT_ID"
firebase deploy --only hosting                  # → https://<PROJECT_ID>.web.app

# tell the API where the UI lives (advisory only — logged at boot)
gcloud run services update "$SERVICE" --region="$REGION" \
  --update-env-vars="ZERO_WEB_URL=https://${PROJECT_ID}.web.app"
```

Console → **Firebase console → Add project → select the existing GCP project** → **Build → Hosting → Get started**.

Because `NODE_ENV` is unset, `services/api/middleware.js` allows **all** origins, so the `web.app` origin reaches the API with no CORS configuration. If you later set `NODE_ENV=production` you must add it to `ALLOWED_ORIGINS` — see [Environment reference](#environment-reference).

---

## 7. Verify

```bash
curl -s "$API_URL/health"                 # {"ok":true,"service":"ZER0","storage":"memory", ...}
curl -s "$API_URL/health/detailed"
gcloud run services logs read "$SERVICE" --region="$REGION" --limit=50
```

`storage: "memory"` is the expected, correct answer here — it confirms no Postgres is attached. Both health endpoints are unauthenticated.

| Check | Expect |
|-------|--------|
| `curl -s "$API_URL/runs"` | `[]` or a JSON list — **not** 401 |
| `https://<PROJECT_ID>.web.app` | SPA loads, dashboard renders, no `Failed to fetch` in the console |
| `gcloud run services describe "$SERVICE" --region="$REGION" --format=yaml \| grep cpu-throttling` | `run.googleapis.com/cpu-throttling: 'false'` — instance-based billing is on |

---

## 8. Run one demo end to end

```bash
RUN_ID="$(curl -s -X POST "$API_URL/runs" \
  -H 'Content-Type: application/json' \
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["runId"])')"
echo "$RUN_ID"

curl -s "$API_URL/runs/$RUN_ID"                             # progress snapshot
curl -N -s "$API_URL/runs/$RUN_ID/stream"                   # live SSE; keeps the instance warm
curl -s "$API_URL/runs/$RUN_ID/assets"                      # artifacts
curl -s "$API_URL/runs/$RUN_ID/download?format=json&url=1"  # signed bundle URL
```

`ottUrl` is required. `"testCaseInputMode":"auto"` is what allows a URL-only autonomous run — Web Analyzer crawls, Manual QA derives major cases, Execution runs the discovered flows. Add `-H "x-api-key: <key>"` only if you turned auth on. Or drive it from the UI: `https://<PROJECT_ID>.web.app` → **New Run** → paste a target URL → **Start**.

Two Cloud Run behaviours to know before you demo live:

- **Cold start.** The first request after idle pulls and boots a 1.6 GB image. Warm it 60 seconds ahead with `curl -s "$API_URL/health" >/dev/null`.
- **15-minute idle ceiling.** Even with instance-based billing, an instance is never kept idle longer than 15 minutes after processing a request unless `min-instances ≥ 1`, and Cloud Run gives only 10 seconds of SIGTERM grace — nowhere near enough to finish a pipeline. A running pipeline does burn CPU, and instance-based autoscaling watches CPU outside requests, so it normally stays up; the safe habit is to **keep the SSE stream open** (or poll `GET /runs/:id` every ~30 s) for the life of the run. `requestExecution` waits up to `ZERO_EXEC_TIMEOUT_MS` (default 300000 = 5 min) for `execution.completed`.

---

## 9. Teardown / scale to zero

**Option A — park it, keep it.** Scale to zero without deleting anything. Cloud Run drops to $0.00 once the idle instance terminates (≤15 min); only the image still bills (~$0.15/mo).

```bash
gcloud run services update "$SERVICE" --region="$REGION" --min-instances=0
# and stop the public internet from waking it:
gcloud run services remove-iam-policy-binding "$SERVICE" --region="$REGION" \
  --member=allUsers --role=roles/run.invoker
```

**Option B — delete the service, keep the image**, so you can redeploy in one command. Still costs: Artifact Registry storage (~$0.15/mo).

```bash
gcloud run services delete "$SERVICE" --region="$REGION" --quiet
```

**Option C — delete the image too. This is the ~$0.00/mo state.** Firebase Hosting on Spark never bills, so leaving the SPA up is free — it will just show `Failed to fetch` once the API is gone.

```bash
gcloud artifacts repositories delete "$REPO" --location="$REGION" --quiet
firebase hosting:disable                             # offline, config kept
# firebase hosting:sites:delete "$PROJECT_ID"        # or drop the site entirely
```

**Option D — nuclear.** Deletes every resource and every possible residual charge. Charges stop immediately; the project sits in a 30-day *pending deletion* window (`gcloud projects undelete`).

```bash
gcloud projects delete "$PROJECT_ID"
```

| After you… | Cloud Run | Artifact Registry | Firebase Hosting |
|---|---|---|---|
| A — park | $0.00 | ~$0.15/mo | $0.00 |
| B — delete service | $0.00 | ~$0.15/mo | $0.00 |
| C — delete repo too | $0.00 | $0.00 | $0.00 |
| D — delete project | $0.00 | $0.00 | $0.00 |

> Download reports **before** teardown. Run metadata lives in an in-memory `Map` and `dist/artifacts/<runId>/run.json` on the instance's memory-backed filesystem. Deleting or replacing the instance destroys both.

---

## 10. Cost safety

Google Cloud has **no hard spend cap by default** — a Cloud Billing budget sends notifications, it does not stop spending. Set one anyway, then rely on the technical caps.

```bash
gcloud billing budgets create \
  --billing-account=0X0X0X-0X0X0X-0X0X0X \
  --display-name="ZER0 demo cap" \
  --budget-amount=5USD \
  --filter-projects="projects/${PROJECT_ID}" \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0 \
  --threshold-rule=percent=1.2,basis=forecasted-spend
```

Console → **Billing → Budgets & alerts → Create budget** → scope to this project → amount `$5` → thresholds 50 / 90 / 100 % → email recipients → **Finish**.

Cloud Run additionally honours **Cloud Billing spend caps** configured in the Cloud Billing console: when a cap is hit, Google *pauses* Cloud Run workloads in the project (services return `5xx`) and shows an enforcement banner on the Cloud Run console overview page ([docs](https://docs.cloud.google.com/run/docs/configuring/billing-settings#budget-spend-caps)). This is stronger than a plain budget alert, but it is a Cloud Run–specific enforcement, not a global GCP kill switch — do not treat it as a guarantee for other services.

The caps that actually bound this demo:

| Control | Effect |
|---|---|
| `--max-instances=1` | Hard ceiling of one instance. Worst case at list rate is $0.16/h ≈ **$116/mo** if you leave it pinned up 24×7 — which only happens if you set `min-instances ≥ 1`. |
| `--min-instances=0` | No instance, no charge, once idle. |
| `ZERO_LLM=off` | Template-only agents, **$0.00 in LLM spend**. Without it, `ZERO_LLM_MAX_USD_PER_RUN` (default 0.50) and `ZERO_LLM_RPM` (20) are the caps. |
| `ZERO_ANALYZER_MAX_PAGES=3` | Shorter crawl → shorter run → fewer billed vCPU-seconds. Default is 8. |
| No Cloud SQL / Memorystore | These are the two line items that would put a real floor under the bill. Neither is created here. |

Cost model, so you can sanity-check the bill (rates from [Cloud Run pricing](https://cloud.google.com/run/pricing), `us-central1`, instance-based, estimate Aug 2026):

| Item | Rate | 2 vCPU + 4 GiB for 1 h |
|---|---|---|
| CPU | $0.000018 / vCPU-s | 7,200 vCPU-s = $0.130 |
| Memory | $0.000002 / GiB-s | 14,400 GiB-s = $0.029 |
| **Total** | | **$0.158 / h** |
| Free tier | 240,000 vCPU-s + 450,000 GiB-s / mo | memory binds first: **~31 h/mo free** at this size |

A single ~5-minute demo run plus its ≤15-minute idle tail is roughly **$0.05** at list rate, and **$0.00** while you are inside the monthly free tier. Egress: 1 GiB/month free within North America, standard networking rates beyond — negligible for a demo, but real if you download many artifacts.

Artifact Registry storage is $0.000136986 per GiB-hour ≈ **$0.10/GiB-month**, with the first 0.5 GiB free **per billing account** ([pricing](https://cloud.google.com/artifact-registry/pricing), verified Aug 2026). The ~$0.15/mo figure above assumes ~2 GiB of *stored* (compressed-layer) bytes. For reference, `Dockerfile.demo` measures **~3.5 GB on disk** when built locally; registries bill compressed layers, which are smaller, so check the real number with `gcloud artifacts docker images list --include-tags --format='table(package,tags,IMAGE_SIZE_BYTES)'` and scale accordingly. Anywhere from $0.10 to $0.35/mo is plausible.

Honest caveat on the free tier: the Cloud Run pricing page publishes a distinct instance-based free tier of 240,000 vCPU-seconds and 450,000 GiB-seconds per month, so it **does** apply to `--no-cpu-throttling`. But it is aggregated per **billing account**, not per project, it is applied as a spending-based discount at Tier 1 pricing, and the published figures are us-central1-based. If you share the billing account with other Cloud Run workloads, assume you get less than 31 free hours — or none.

---

### Alternative: one Compute Engine VM with Docker Compose

Worth it only for a **long-lived** demo environment, or when you need Postgres, Redis, and the real four-container split. Cloud Run is $0.16/demo-hour and $0 when idle; a VM is flat monthly and billed whenever it is up, but its artifacts survive reboots on the persistent disk.

**The always-free `e2-micro` does not work here.** The free tier grants one non-preemptible `e2-micro` per month in `us-west1` / `us-central1` / `us-east1` plus 30 GB-months of standard persistent disk — but `e2-micro` has **1 GB of RAM**, below the ≥2 GB floor Chromium needs. The smallest honest option is `e2-small` (2 GB) at ≈$0.0168/h ≈ **$12.23/mo**, and it is tight; `e2-medium` (2 vCPU / 4 GiB) at ≈$0.0335/h ≈ **$24.46/mo** is the comfortable one (estimates, Aug 2026, `us-central1`, [pricing](https://cloud.google.com/compute/vm-instance-pricing)). Neither is free.

### If you must split into four services

Don't, for a demo. Splitting the API, orchestrator, and executor into separate Cloud Run services requires **both**:

1. **A shared queue** — Memorystore for Redis, or any reachable Redis, as `REDIS_URL` in all three. A per-hour instance charge with no scale-to-zero; this is the single biggest cost jump.
2. **A shared blob store** — the local disk store is per-container, so you need `ZERO_CLOUD=gcp` plus a GCS bucket via `@zero/cloud`. Keeping `ZERO_CLOUD=local` instead demands a genuinely shared POSIX filesystem (Filestore, or a Cloud Storage FUSE mount on gen2) **and** an identical `ZERO_LOCAL_STORE_SECRET` in every process, or signed `/cloud/local` URLs fail verification.

Compose does exactly this locally with the `redis` service plus the `app-artifacts` volume — see [../DOCKER.md](../DOCKER.md). On GCP that is the production topology, not the demo one.

---

## Environment reference

Set on the Cloud Run service. Bold = you must supply a value.

| Variable | Demo value | Notes |
|---|---|---|
| `PORT` | `3001` | Baked into `Dockerfile.demo`; must match `--port` |
| `ZERO_CLOUD` | `local` | Baked. Local disk object store, in-process queue |
| `EXECUTION_MODE` | `minimal` | Baked. URL-load checks; `full` is brittle on real sites |
| **`ZERO_PUBLIC_BASE_URL`** | the Cloud Run HTTPS URL | Base for signed `/cloud/local` URLs. Set in [§5.2](#5-deploy-the-api--workers-one-cloud-run-service) — wrong value ⇒ broken artifact downloads |
| **`ZERO_LOCAL_STORE_SECRET`** | `openssl rand -hex 32` | HMAC key for signed store URLs. Must be identical in every process that signs or verifies |
| **`KEY_ENC_SECRET`** | `openssl rand -hex 32` | Encrypts stored provider keys. Mandatory (throws at boot) only when `NODE_ENV=production`, but always set it |
| `ZERO_WEB_URL` | `https://<PROJECT_ID>.web.app` | Advisory; logged at boot so the API can print the UI URL |
| `ZERO_LLM` | `off` | Template-only agents, $0 LLM spend |
| `ZERO_LLM_MAX_USD_PER_RUN` / `ZERO_LLM_RPM` / `ZERO_LLM_TIMEOUT_MS` | *(unset)* | Defaults `0.50` / `20` / `8000`. Only relevant if you turn LLM on |
| `ZERO_ANALYZER_MAX_PAGES` | `3` | Default `8`. Lower = shorter crawl = cheaper run |
| `ZERO_ORCH_CONCURRENCY` | `1` | Default `2`. One instance, keep it serial |
| `ZERO_EXEC_CONCURRENCY` | `1` | Default `2`. One Chromium at a time in 4 GiB |
| `ZERO_EXEC_ATTEMPTS` | `1` | Default `2`. Halves worst-case run time |
| `ZERO_EXEC_TIMEOUT_MS` | `300000` | How long the orchestrator waits for `execution.completed` |
| `ZERO_DIST_ROOT` / `ZERO_LOCAL_STORE_DIR` | *(unset)* | Optional overrides for the `dist/` root and the object-store dir; `Dockerfile.demo` already creates and chowns `/app/dist` |
| `NODE_ENV` | *(unset)* | **Leave unset.** `production` forces auth the SPA cannot satisfy and requires a real `KEY_ENC_SECRET` at boot |
| `DATABASE_URL` / `PGHOST` | *(unset)* | Both unset ⇒ memory + file persistence, `/health` reports `storage: "memory"` |
| `REDIS_URL` | *(unset)* | **Leave unset.** Setting it switches `@zero/cloud` to Redis and forces Memorystore |
| `RUN_HEADED` | *(unset)* | Headed mode is impossible without `DISPLAY`; it silently falls back to headless |

Locked-down variant (`curl`-only, no browser UI):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `ZERO_AUTH` | `on` (forced in production anyway) |
| `KEY_ENC_SECRET` | a real 32-byte hex secret, **not** `zero-default-dev-key-change-in-production` |
| `ZERO_API_KEYS` | `demo:you@example.com:<random-key>` — format is `tenant:email:key`, comma-separated for multiple |
| `ALLOWED_ORIGINS` | `https://<PROJECT_ID>.web.app` — in production CORS allows only localhost, `zer0.io`, `app.zer0.io`, `*.vercel.app`, `*.up.railway.app`, plus `ALLOWED_ORIGINS` / `FRONTEND_URL` / `CLIENT_URL` / `PUBLIC_URL` / `RAILWAY_PUBLIC_DOMAIN`. A `run.app` or `web.app` origin is **not** allowed by default |
| `RECORDING_ORIGINS` / `APP_URL` | recording endpoints use a separate explicit allowlist in `services/api/auth.js` |

Then every call needs `-H "x-api-key: <key>"`, and the SPA will 401 — that is expected, not a bug.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Run sits at `queued` forever, no progress | Request-based billing throttled CPU after the 202. `gcloud run services update "$SERVICE" --region="$REGION" --no-cpu-throttling` |
| Service crash-loops immediately, logs show a thrown secret error | `NODE_ENV=production` without a real `KEY_ENC_SECRET`. `assertProductionSecrets()` throws at boot. Unset `NODE_ENV` or supply the secret |
| UI loads but every `/runs` call returns 401 | Auth is on and the SPA does not send `x-api-key`. Unset `NODE_ENV` for a UI demo |
| UI loads but shows `Failed to fetch` | Wrong `VITE_API_BASE_URL` baked into the bundle. Rebuild: `VITE_API_BASE_URL="$API_URL" npm run build && firebase deploy --only hosting` |
| Chromium crashes / `Target closed`, or OOM mid-run | Deployed on gen1 — redeploy with `--execution-environment=gen2`. If it persists, raise `--memory`: Cloud Run's filesystem is memory-backed and `--disable-dev-shm-usage` puts Chromium's temp files in memory too, so artifacts, Chromium, and Node all share the limit. Use `4Gi` with `ZERO_EXEC_CONCURRENCY=1` |
| Artifact links 404 or fail signature check | `ZERO_PUBLIC_BASE_URL` is not the live Cloud Run URL, or `ZERO_LOCAL_STORE_SECRET` changed between signing and verifying |
| Run vanished after a while | The instance was replaced (≤15 min idle ceiling, or a new revision). Memory + file persistence does not survive that — download before teardown |
| Second concurrent run never starts | Expected at `--max-instances=1` with `ZERO_ORCH_CONCURRENCY=1`. Runs are serial by design here |
| Cold start times out on the first request | 1.6 GB image. Warm with `curl "$API_URL/health"`, and keep `--cpu-boost` |
| `denied: Permission "artifactregistry.repositories.uploadArtifacts" denied` | `gcloud auth configure-docker "${REGION}-docker.pkg.dev"` was not run, or the repo region differs from `$IMAGE` |
| SSE stream drops after ~1 h | `--timeout` ceiling. 3600 s is the Cloud Run maximum; reconnect the stream |

---

## Related

- [../DEPLOY.md](../DEPLOY.md) — deployment overview and the choice between cloud targets
- [../COST.md](../COST.md) — infra floors, LLM caps, executor sizing
- [../DOCKER.md](../DOCKER.md) — the four-image split stack this demo deliberately collapses
- [../DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) — Day-0 local setup
- [./AWS.md](./AWS.md) — same demo on AWS
- [./AZURE.md](./AZURE.md) — same demo on Azure
- [./PAAS.md](./PAAS.md) — same demo on a managed PaaS
- Root [Dockerfile.demo](../../../../../Dockerfile.demo) — the single-container image used here
- Root [docker-compose.yml](../../../../../docker-compose.yml) — the split topology for comparison

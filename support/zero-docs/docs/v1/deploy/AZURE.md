# Demo deploy — Azure (Container Apps, scale to zero)

One Azure Container App runs the whole ZER0 pipeline — API, orchestrator, and Playwright executor — in a single container built from [`Dockerfile.demo`](../../../../../Dockerfile.demo), pulled from an Azure Container Registry Basic registry. No Postgres, no Redis, no Blob Storage, no Service Bus, no Front Door. The SPA is static, so it goes on Azure Static Web Apps Free. While the demo is up you pay roughly **$0.07 per demo-hour** (mostly inside the Container Apps free grant); after teardown the only residual is the registry at about **$5.08/month**, and deleting the registry takes you to **$0**.

| | |
|---|---|
| **Path** | ACR Basic → one Container App (Consumption, 2 vCPU / 4 GiB) + Static Web Apps Free |
| **Est. cost while running** | ~$0.07 / demo-hour (estimate, Aug 2026) — idle rate only; active compute usually free under the monthly grant. Worst case $0.22 / demo-hour if the grant is already spent |
| **Est. cost after teardown** | ~$5.08 / mo (ACR Basic only). $0.00 if you also delete the registry |
| **Free tier** | Container Apps: 180,000 vCPU-s + 360,000 GiB-s + 2M requests / subscription / month (active only). Static Web Apps Free: $0, 100 GB egress. New accounts: $200 credit for 30 days |
| **Postgres** | not required (memory + file) |
| **Time to first demo** | ~25 minutes (the ~1.6 GB Playwright image build dominates) |

---

## 0. What you are deploying

`Dockerfile.demo` runs `node scripts/local-stack.js`, which boots the orchestrator worker, the executor worker, and the Express API **in one OS process**. That co-location is mandatory, not a shortcut:

| Concern | `ZERO_CLOUD=local` behaviour | Consequence |
|---------|------------------------------|-------------|
| Queue | Redis when `REDIS_URL` is set, otherwise an **in-process `Map` of handlers** (`packages/cloud/local/queue.js`) | A publisher in one container never reaches a subscriber in another. One process or nothing. |
| Object store | Local filesystem at `dist/artifacts/cloud-store`, served via HMAC-signed `GET\|PUT /cloud/local` | Signed URLs are built from `ZERO_PUBLIC_BASE_URL`; every process must share `ZERO_LOCAL_STORE_SECRET` |
| Cache / SSE fan-out | Same Redis-or-in-process fallback | Same rule |
| Runs | In-memory `Map` + `dist/artifacts/<runId>/run.json` when `DATABASE_URL` and `PGHOST` are both unset | `/health` reports `storage: "memory"`; artifacts vanish when the replica is replaced |

So: **do not set `REDIS_URL` for this demo.** Splitting into three container apps would require both a shared Redis *and* a shared POSIX filesystem mount, which is exactly the ~$55/month floor this guide avoids.

Two things you must accept for a demo:

1. **`NODE_ENV` stays unset.** Setting `NODE_ENV=production` forces verified auth on `/runs`, `/provider-keys`, and `/agent-settings`, and the SPA never sends `x-api-key` (there is no such string in `web/src`) — the browser UI would 401 on every call. It also makes `auth.assertProductionSecrets()` throw at boot without a real `KEY_ENC_SECRET`, which is why the stock `zero-api` image (which bakes `NODE_ENV=production`) crash-loops in a cloud deploy with no secret. `Dockerfile.demo` deliberately leaves `NODE_ENV` unset.
2. **Because auth is off, the ingress FQDN is public and unauthenticated.** Tear it down the moment the demo ends (§9). If you need it locked, set `ZERO_AUTH=on` + `ZERO_API_KEYS` and drive it with `curl` only — the UI will not work.

`--cpu 2 --memory 4.0Gi` is deliberate. `services/executor/browser.js` launches Chromium with `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`, so a large `/dev/shm` is not required — but Chromium then falls back to memory-backed temp files, so give it 4 GiB (2 GiB is the floor). Headed mode is impossible without `DISPLAY`; `RUN_HEADED=true` silently falls back to headless.

---

## 1. Prerequisites

| Need | Detail |
|------|--------|
| Azure subscription | New accounts get **$200 credit valid 30 days** plus free monthly amounts of 20+ services for 12 months (verified on the [Azure free account page](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account), Aug 2026). The credit cannot be extended or reissued. |
| Azure CLI | 2.60+ recommended, plus the `containerapp` extension (§2) |
| Local Docker | **Not required** — `az acr build` builds in the cloud. Keep Docker as the fallback (see the free-credit caveat in §4) |
| Node 20 + npm | Only to build the SPA in §6 |

Commands run from the repo root. This guide uses `eastus` because every price quoted here is an East US rate.

---

## 2. Install and authenticate the CLI

```bash
# macOS
brew update && brew install azure-cli
# or: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash   (Debian/Ubuntu)

az login                      # opens a browser
az account show --output table
az account set --subscription "<SUBSCRIPTION_NAME_OR_ID>"

az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.OperationalInsights
```

Provider registration is idempotent and can take a minute the first time.

**Portal equivalent:** everything below except `az acr build` is clickable, and Azure Cloud Shell (the `>_` icon in the portal top bar) already has the CLI and the `containerapp` extension — use it if you would rather install nothing.

---

## 3. Create the resource group and registry

```bash
export RG=zero-demo-rg
export LOC=eastus
export ACR=zerodemo$RANDOM          # must be globally unique, lowercase alphanumeric only

az group create --name $RG --location $LOC

az acr create \
  --resource-group $RG \
  --name $ACR \
  --sku Basic \
  --admin-enabled true

az acr show --name $ACR --query loginServer --output tsv    # → <ACR>.azurecr.io
```

`--admin-enabled true` is the shortest path to letting Container Apps pull the image. For anything beyond a demo, use a managed identity instead (`az containerapp create --registry-identity system`) and leave the admin user off.

**Portal:** Portal → **Resource groups** → **Create** → name `zero-demo-rg`, region East US → **Review + create**. Then Portal → search **Container registries** → **Create** → same resource group, unique registry name, **Pricing plan: Basic** → **Review + create**. Then registry → **Settings → Access keys** → toggle **Admin user** on.

**Cost:** ACR Basic is **$0.167/day ≈ $5.08/month** with 10 GB storage included (estimate, Aug 2026 — [ACR pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/)). There is no ACR free tier: the daily charge starts on day one, prorated per day. The demo image measures ~3.5 GB on disk and less as compressed registry layers — comfortably inside the included 10 GB either way. **This is the one thing that keeps billing after teardown** — §9 covers deleting it.

---

## 4. Build and push the demo image

`az acr build` uploads the build context and runs the build on ACR Tasks in Azure — no local Docker daemon, no 1.6 GB pull over your home connection. This is the single biggest convenience win of the Azure path.

```bash
az acr build \
  --registry $ACR \
  --image zero-demo:v1 \
  --file Dockerfile.demo \
  .
```

Expect 8–15 minutes: the Playwright base image (`mcr.microsoft.com/playwright:v1.58.2-jammy`) is large and `npm ci --omit=dev` runs for the API, orchestrator, and executor workspaces.

**Cost:** ACR Tasks bills **$0.0001 per CPU-second** with no free allotment (estimate, Aug 2026). A 10-minute build on the default 2-CPU runner is ~1,200 CPU-seconds ≈ **$0.12**. Pennies, but not zero.

> **Verified gotcha, not in the fact sheet:** Microsoft's [ACR Tasks docs](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview) carry an active notice that **ACR task runs are temporarily paused for subscriptions spending Azure free credits.** If you are on the $200 trial and `az acr build` fails, fall back to a local build:
>
> ```bash
> az acr login --name $ACR
> docker build -f Dockerfile.demo -t $ACR.azurecr.io/zero-demo:v1 .
> docker push $ACR.azurecr.io/zero-demo:v1
> ```

**Portal:** there is no portal image build. Use Cloud Shell for the `az acr build` line above; browse results at registry → **Services → Repositories**.

---

## 5. Deploy the API + workers (one Container App)

Create the environment with logging switched off — the default provisions a Log Analytics workspace whose ingestion is billed separately.

```bash
export ENVNAME=zero-demo-env
export APPNAME=zero-demo-api

az containerapp env create \
  --name $ENVNAME \
  --resource-group $RG \
  --location $LOC \
  --logs-destination none
```

Then the app. Generate two secrets first — they are not optional, and the store secret must be identical in every process that signs or verifies `/cloud/local` URLs (here there is only one process, so any value works, but it must be stable across revisions or old signed URLs break).

```bash
export KEY_ENC_SECRET=$(openssl rand -hex 32)
export STORE_SECRET=$(openssl rand -hex 32)

az containerapp create \
  --name $APPNAME \
  --resource-group $RG \
  --environment $ENVNAME \
  --image $ACR.azurecr.io/zero-demo:v1 \
  --registry-server $ACR.azurecr.io \
  --registry-username $ACR \
  --registry-password "$(az acr credential show --name $ACR --query 'passwords[0].value' --output tsv)" \
  --target-port 3001 \
  --ingress external \
  --cpu 2 --memory 4.0Gi \
  --min-replicas 1 --max-replicas 1 \
  --env-vars \
    PORT=3001 ZERO_CLOUD=local EXECUTION_MODE=minimal ZERO_LLM=off \
    ZERO_ANALYZER_MAX_PAGES=3 ZERO_ORCH_CONCURRENCY=1 ZERO_EXEC_CONCURRENCY=1 \
    ZERO_EXEC_ATTEMPTS=1 ZERO_EXEC_TIMEOUT_MS=300000 \
    KEY_ENC_SECRET="$KEY_ENC_SECRET" ZERO_LOCAL_STORE_SECRET="$STORE_SECRET"

export API=https://$(az containerapp show --name $APPNAME --resource-group $RG \
  --query properties.configuration.ingress.fqdn --output tsv)
echo $API
```

The FQDN does not exist until the app does, so the signed-URL base is a second pass:

```bash
az containerapp update --name $APPNAME --resource-group $RG \
  --set-env-vars ZERO_PUBLIC_BASE_URL=$API
```

Come back after §6 and add the SPA origin to CORS:

```bash
az containerapp update --name $APPNAME --resource-group $RG \
  --set-env-vars ALLOWED_ORIGINS=$WEB ZERO_WEB_URL=$WEB APP_URL=$WEB
```

`ALLOWED_ORIGINS` only matters if you later set `NODE_ENV=production` — with `NODE_ENV` unset, `services/api/middleware.js` allows all origins. `APP_URL` feeds the **separate** recording-endpoint allowlist in `auth.allowedOrigins()`, which is always enforced regardless of `NODE_ENV`. Set both and you are covered either way.

**Portal:** Portal → **Container Apps** → **Create** → **Container app**. *Basics* tab: resource group `zero-demo-rg`, name `zero-demo-api`, region East US, **Create new** environment → set **Zone redundancy** off. *Container* tab: uncheck *Use quickstart image*, registry `<ACR>.azurecr.io`, image `zero-demo`, tag `v1`, **CPU and Memory → 2 CPU cores, 4 Gi memory**, and add each env var under **Environment variables**. *Ingress* tab: **Enabled**, **Accepting traffic from anywhere**, **Target port 3001**. Then app → **Application → Scale** → set min = max = 1.

### Why `--min-replicas 1` and `--max-replicas 1`

This is the load-bearing decision, and the reason is ZER0's async shape: `POST /runs` returns **HTTP 202 immediately** and the pipeline then runs in the background inside the orchestrator; `requestExecution` waits up to `ZERO_EXEC_TIMEOUT_MS` (default 300000 ms) for `execution.completed`. Nothing keeps an HTTP request open while that happens.

Verified in Microsoft's docs: Container Apps scales with **KEDA**, and the default HTTP scaler counts concurrent requests — scale-to-zero is driven by inbound HTTP, not by what your process is doing. Billing distinguishes *active* from *idle*, and a replica counts as idle only when it is at the minimum replica count **and** all containers are running **and** it is processing no HTTP requests **and** it is using **less than 0.01 vCPU** **and** it is receiving under 1,000 bytes/second ([billing](https://learn.microsoft.com/en-us/azure/container-apps/billing)). Microsoft's scaling guidance and the long-running-work thread in [azure-container-apps#176](https://github.com/microsoft/azure-container-apps/issues/176) both state that fire-and-forget background work is *not* a signal that keeps a replica alive; the recommended mitigations are `minReplicas >= 1` or a longer cooldown.

Honest reading: with `--min-replicas 0`, a 202-then-background run is exactly the pattern that can be scaled in mid-flight, and since runs live in an in-memory `Map`, a stranded run is a lost run. With **min = max = 1** there is no replica below which to scale in, so the pipeline is safe. The cost of that safety is idle billing (§10) — which is why §9 sets min-replicas back to 0 the second you are done. I did *not* test scale-in against a live ZER0 run; this is inferred from the documented scaler behaviour plus the code's 202 contract.

### Two more verified Azure-specific limits

| Limit | Value | Impact on ZER0 |
|-------|-------|----------------|
| Consumption CPU/memory pairs | Must be an exact pair from the documented list; `2.0` ↔ `4.0Gi`. A *Consumption-only* environment caps at **2 cores / 4 GiB** | `--cpu 2 --memory 4.0Gi` is both valid and the maximum on a consumption-only env — you cannot give Chromium more without a workload-profiles environment |
| Ephemeral storage | ~8 GB per replica on the Consumption profile | Fine for `dist/artifacts/`, but a long demo generating many screenshots is not unbounded |
| HTTP ingress request timeout | **240 seconds** documented; separate **idle** request timeout defaults to 4 minutes, raisable to 30 via premium ingress on a workload-profiles environment | `GET /runs/:id/stream` (SSE) writes a `: ping` heartbeat every 15 s, so the *idle* timeout will not fire. Whether an actively-streaming SSE connection survives past the 240 s request timeout on default ingress I could **not** confirm — assume it may drop and poll `GET /runs/:id` for runs longer than ~4 minutes |

---

## 6. Build and host the SPA

The SPA is 100% static and the API origin is **baked into the bundle at build time** (`VITE_API_BASE_URL`). There is no runtime config — changing the API URL means rebuilding.

```bash
npm install
VITE_API_BASE_URL=$API npm run build     # → dist/web/
```

Then Static Web Apps Free:

```bash
az staticwebapp create --name zero-demo-web --resource-group $RG \
  --location eastus2 --sku Free

npm install -g @azure/static-web-apps-cli
swa deploy ./dist/web \
  --deployment-token "$(az staticwebapp secrets list --name zero-demo-web \
      --resource-group $RG --query properties.apiKey --output tsv)" \
  --env production

export WEB=https://$(az staticwebapp show --name zero-demo-web --resource-group $RG \
  --query defaultHostname --output tsv)
echo $WEB
```

Now go back and run the `ALLOWED_ORIGINS` update from §5.

**Portal:** Portal → **Static Web Apps** → **Create** → resource group `zero-demo-rg`, name `zero-demo-web`, **Plan type: Free**, **Deployment source: Other** (avoids wiring GitHub) → **Review + create**. Then app → **Overview → Manage deployment token**, copy it, and run the `swa deploy` line above.

**Alternative — Storage static website** (no SWA CLI, no CDN, no free custom-domain TLS; costs a few cents of LRS storage plus egress, so prefer SWA Free):

```bash
az storage account create --name zerodemoweb$RANDOM --resource-group $RG \
  --location $LOC --sku Standard_LRS --kind StorageV2
az storage blob service-properties update --account-name <STORAGE> \
  --static-website --index-document index.html --404-document index.html
az storage blob upload-batch --account-name <STORAGE> -s ./dist/web -d '$web'
```

**Static Web Apps Free limits** (verified, [quotas](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas)): 100 GB bandwidth per subscription per month, 500 MB total storage per app, 250 MB per environment, 15,000 files, 2 custom domains with free auto-renewing TLS, 10 apps per subscription, no SLA. Exceeding the bandwidth quota **stops serving** the site rather than billing overage.

---

## 7. Verify

```bash
curl -s $API/health
# → {"ok":true,"service":"ZER0","storage":"memory"}

curl -s $API/health/detailed
```

`storage: "memory"` is the expected, correct answer here — it confirms no Postgres is attached. Both health routes are unauthenticated. Container Apps does not bill health-probe requests.

Then open `$WEB` in a browser. If the UI shows `Failed to fetch`, the SPA was built with the wrong `VITE_API_BASE_URL` — rebuild (§6) and redeploy, and confirm `az containerapp show ... ingress.fqdn` matches.

```bash
az containerapp logs show --name $APPNAME --resource-group $RG --follow
```

Log streaming works even with `--logs-destination none` — it reads from the replica rather than querying a workspace.

---

## 8. Run one demo end to end

```bash
RUN=$(curl -s -X POST $API/runs \
  -H 'Content-Type: application/json' \
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["runId"])')
echo $RUN

curl -s $API/runs/$RUN                 # poll: queued → running → completed
curl -s $API/runs/$RUN/assets
```

`ottUrl` is required. `"testCaseInputMode":"auto"` is what permits a URL-only autonomous run: with no TC file, the Web Analyzer crawls (capped to 3 pages by `ZERO_ANALYZER_MAX_PAGES` above; BA notes do not skip it), then BA → Manual QA → Automation QA → Playwright execution in `minimal` mode → Manager → Delivery. The response is **202** with a `runId`, not a finished run.

If you turned auth on, add `-H "x-api-key: <key>"` to every call — and remember the browser UI will 401.

For live progress, `GET $API/runs/$RUN/stream` is SSE; see the 240 s ingress caveat in §5 and prefer polling for long runs.

---

## 9. Teardown / scale to zero

Pick the row that matches how soon you need the demo back.

| Goal | Command | Still billing afterwards |
|------|---------|--------------------------|
| Pause between demos (seconds to restart) | `az containerapp update --name $APPNAME --resource-group $RG --min-replicas 0` | ACR Basic ~$5.08/mo. Compute only when a request wakes it (cold start pulls the ~1.6 GB image, so expect tens of seconds) |
| Done for the week | `az containerapp delete --name $APPNAME --resource-group $RG --yes` | ACR Basic ~$5.08/mo. The environment resource itself has no standing charge on Consumption, but delete it too: `az containerapp env delete --name $ENVNAME --resource-group $RG --yes` |
| Truly $0 | Add `az acr delete --name $ACR --resource-group $RG --yes` | Nothing. You will re-run §4 (8–15 min) next time |
| Nuclear — remove everything | `az group delete --name $RG --yes --no-wait` | Nothing. Deletes the app, environment, registry, Static Web App, and any storage account in the group |

**Portal:** Container App → **Application → Scale** → set min replicas 0 → **Save**. Or Resource group → **Delete resource group** → type the name to confirm.

`--min-replicas 0` stops idle billing but **keeps the public FQDN live** — anyone hitting it wakes the container. Since this demo runs with auth off, delete the app (not just scale it) once the demo is over, and `az group delete` when you are finished for good.

---

## 10. Cost safety

Where the money actually goes (all East US pay-as-you-go, **estimates, Aug 2026** — [Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)):

| Meter | Rate | 1 hour at 2 vCPU / 4 GiB |
|-------|------|--------------------------|
| Active vCPU-s / GiB-s | ~$0.000024 / ~$0.000003 | $0.173 + $0.043 = **~$0.216/hr** before the grant |
| Idle vCPU-s / GiB-s | ~$0.000008 / ~$0.000001 | $0.058 + $0.014 = **~$0.072/hr** |
| HTTP requests | first 2M/month free | $0 |

The free grant — **180,000 vCPU-seconds and 360,000 GiB-seconds per subscription per calendar month** — is verified in Microsoft's billing doc, and so is the critical asterisk: **the grant applies to active usage only, never to idle.** At 2 vCPU the grant is worth ~25 hours of *active* compute per month, so a demo's active compute is realistically free. What you pay is the idle time while the app sits at min-replicas 1 waiting for you to click something: **~$0.07 per demo-hour**. The per-vCPU-second and per-GiB-second rates themselves are from a third-party calculator that cites the official page (Microsoft's page renders rates as `$-` to scrapers), so treat the two decimal places as indicative and confirm in the portal for your currency and region.

Set a budget. Azure budgets **alert, they do not hard-stop spend** — the only true hard stop is running out of trial credit, which disables the subscription.

**Portal (recommended, this is where thresholds are easiest):** Portal → **Cost Management + Billing** → **Cost Management** → **Budgets** → **+ Add** → scope the subscription or `zero-demo-rg` → amount e.g. `10`, reset **Monthly** → **Next** → add alert conditions at 50% / 80% / 100% of budget with your email → **Create**.

**CLI** (the `consumption` command group is still flagged *preview*, and `az consumption budget create` historically sent a malformed `filters` field — [azure-cli#29950](https://github.com/Azure/azure-cli/issues/29950), fixed in a later release. If it errors, use the portal):

```bash
az consumption budget create \
  --budget-name zero-demo-budget \
  --category cost \
  --amount 10 \
  --time-grain monthly \
  --start-date 2026-08-01 \
  --end-date 2027-08-01
```

Cheap-by-default knobs already set in §5: `ZERO_LLM=off` (template-only agents, $0 in LLM spend — otherwise `ZERO_LLM_MAX_USD_PER_RUN` defaults to 0.50 per run), `EXECUTION_MODE=minimal`, `ZERO_ANALYZER_MAX_PAGES=3` (down from 8), and concurrency/attempts pinned to 1.

---

## Alternative — Container Instances (true per-second billing)

ACI has no environment resource, no scaling model, and no idle/active distinction to reason about. You create a container group, it bills per second while running, you delete it, billing stops. For a one-shot demo that is genuinely simpler than Container Apps.

```bash
az container create \
  --resource-group $RG --name zero-demo-aci \
  --image $ACR.azurecr.io/zero-demo:v1 \
  --registry-login-server $ACR.azurecr.io --registry-username $ACR \
  --registry-password "$(az acr credential show --name $ACR --query 'passwords[0].value' -o tsv)" \
  --cpu 2 --memory 4 --os-type Linux \
  --ports 3001 --ip-address Public --dns-name-label zero-demo-$RANDOM \
  --environment-variables \
    PORT=3001 ZERO_CLOUD=local EXECUTION_MODE=minimal ZERO_LLM=off \
    ZERO_ANALYZER_MAX_PAGES=3 ZERO_ORCH_CONCURRENCY=1 ZERO_EXEC_CONCURRENCY=1 \
  --secure-environment-variables \
    KEY_ENC_SECRET="$KEY_ENC_SECRET" ZERO_LOCAL_STORE_SECRET="$STORE_SECRET"

az container show --resource-group $RG --name zero-demo-aci \
  --query ipAddress.fqdn --output tsv        # → <label>.eastus.azurecontainer.io

az container delete --resource-group $RG --name zero-demo-aci --yes    # billing stops
```

Set `ZERO_PUBLIC_BASE_URL=http://<fqdn>:3001` on a recreate once you know the FQDN — ACI has no update-in-place for env vars.

**Cost** (Linux, East US, estimates Aug 2026 — [ACI pricing](https://azure.microsoft.com/en-us/pricing/details/container-instances/)): ~**$0.0000135 per vCPU-second** and ~**$0.0000015 per GB-second**, billed on the *requested* allocation (vCPU rounded up to a whole number, memory to the nearest 0.1 GB) from first image pull until the group stops. At 2 vCPU / 4 GB: `2 × 3600 × 0.0000135 = $0.097` plus `4 × 3600 × 0.0000015 = $0.022` ≈ **$0.12 per demo-hour**. Third-party sources quote the vCPU rate between $0.0000125 and $0.0000135, so call it $0.11–0.12/hour.

| ACI wins when | ACI loses when |
|---------------|----------------|
| You want the simplest true-$0 teardown — one `delete`, no environment resource left behind, no idle-rate reasoning | **No HTTPS.** Verified: ACI does not natively terminate TLS; the `*.azurecontainer.io` FQDN is plain **HTTP**. HTTPS needs a Caddy or Nginx sidecar doing ACME ([Microsoft walkthrough](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-container-group-automatic-ssl)) |
| You are demoing once and not coming back | An HTTPS SPA origin calling an HTTP API is mixed content and will be blocked — plan on `curl`, or serve the SPA over HTTP too |
| You distrust Container Apps scale-in for background work | No scaling, max 4 vCPU per group, and changing image or env vars means delete + recreate |

---

## Third option, briefly — one B-series VM

Closest to local development: `docker compose up` with the split stack exactly as in [DOCKER.md](../DOCKER.md), Postgres and Redis included if you want them.

```bash
az vm create --resource-group $RG --name zero-demo-vm \
  --image Ubuntu2204 --size Standard_B2als_v2 \
  --admin-username azureuser --generate-ssh-keys
az vm open-port --resource-group $RG --name zero-demo-vm --port 3000,3001
# ssh in, install docker, git clone, docker compose up --build
az vm deallocate --resource-group $RG --name zero-demo-vm    # stops compute billing
az vm delete --resource-group $RG --name zero-demo-vm --yes  # and delete the disk
```

`Standard_B2als_v2` (2 vCPU / 4 GiB, Linux, East US) is **~$0.0376/hour ≈ $27.45/month** (estimate, Aug 2026); `Standard_B2s` is ~$0.0416/hour. **A deallocated VM still bills for its managed disk** — a 30 GiB OS disk lands in the 32 GiB tier at roughly **$2.40/month** for Standard SSD (E4) or **$4.81/month** for Premium SSD (P4). Deallocation is not $0; deletion is. This path costs more per demo-hour than either container option and only earns its keep if you need the full multi-container stack.

---

## Environment reference

Everything the demo container reads. Values in the middle column are what §5 sets.

| Variable | Demo value | Why |
|----------|-----------|-----|
| `PORT` | `3001` | API listen port; must match `--target-port` |
| `NODE_ENV` | *(unset)* | Setting `production` forces auth on `/runs` and throws at boot without a real `KEY_ENC_SECRET`. The SPA sends no `x-api-key`, so the UI would 401 |
| `ZERO_CLOUD` | `local` | Filesystem object store + in-process queue. **Baked into `Dockerfile.demo`** |
| `REDIS_URL` | *(must stay unset)* | `ioredis` is a real `@zero/cloud` dependency — setting this switches to Redis and you would then need a real Redis |
| `DATABASE_URL` / `PGHOST` | *(unset)* | Keeps runs in memory + `dist/artifacts/<runId>/run.json`; `/health` reports `storage: "memory"` |
| `KEY_ENC_SECRET` | `openssl rand -hex 32` | Provider-key encryption. Required in production; set it anyway so nothing changes if you flip `NODE_ENV` |
| `ZERO_LOCAL_STORE_SECRET` | `openssl rand -hex 32` | HMAC for `/cloud/local` signed URLs. Must be identical across every process and stable across revisions |
| `ZERO_PUBLIC_BASE_URL` | `https://<ingress-fqdn>` | Base for signed `/cloud/local` URLs — the **API** origin, not the SPA origin |
| `ZERO_WEB_URL` | `https://<swa-hostname>` | Advisory; logged at startup |
| `ALLOWED_ORIGINS` | `https://<swa-hostname>` | CORS allowlist; only enforced when `NODE_ENV=production` |
| `APP_URL` / `RECORDING_ORIGINS` | `https://<swa-hostname>` | The **separate** recording-endpoint allowlist in `auth.allowedOrigins()`, always enforced |
| `EXECUTION_MODE` | `minimal` | URL-load + body-wait checks. `full` is brittle on real sites; `discovered_flows` is chosen automatically for URL-only runs |
| `ZERO_LLM` | `off` | Template-only agents → $0 LLM spend |
| `ZERO_LLM_MAX_USD_PER_RUN` | — | Default `0.50`; only relevant if you add a provider key |
| `ZERO_ANALYZER_MAX_PAGES` | `3` | Default 8; fewer crawled pages = shorter, cheaper demo |
| `ZERO_ORCH_CONCURRENCY` | `1` | Default 2 |
| `ZERO_EXEC_CONCURRENCY` | `1` | Default 2 |
| `ZERO_EXEC_ATTEMPTS` | `1` | Default 2 |
| `ZERO_EXEC_TIMEOUT_MS` | `300000` | Orchestrator's wait for `execution.completed` |
| `ZERO_AUTH` | *(unset)* | `on` forces verified `x-api-key` / Bearer JWT without `NODE_ENV=production` — breaks the browser UI |
| `ZERO_API_KEYS` / `ZERO_DEV_API_KEY` | — | `tenant:email:key` comma-separated, or a single-key shortcut. Only with `ZERO_AUTH=on` |
| `ZERO_DIST_ROOT` / `ZERO_LOCAL_STORE_DIR` | *(unset)* | Override the `dist/` root and the object-store directory |
| `RUN_HEADED` | *(unset)* | No `DISPLAY` in the container — silently falls back to headless |
| `VITE_API_BASE_URL` | build-time only | Baked into the SPA bundle by `npm run build`; not a container env var |

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Container restarts immediately, logs show `KEY_ENC_SECRET is required in production` | `NODE_ENV=production` reached the container. `assertProductionSecrets()` throws unless `KEY_ENC_SECRET` is set and is not the dev default. Remove `NODE_ENV` or set a real secret |
| UI loads but every `/runs` call is 401 | Auth is on (`NODE_ENV=production` or `ZERO_AUTH=on`) and the SPA does not send `x-api-key`. Turn auth off for the demo, or drive the API with `curl` |
| UI shows `Failed to fetch` | Wrong `VITE_API_BASE_URL` baked into the bundle. Rebuild with the real ingress FQDN and redeploy — there is no runtime override |
| `POST /runs` returns 202 but the run never leaves `queued` | The orchestrator did not boot in the same process. Confirm the image is `Dockerfile.demo` (`node scripts/local-stack.js`), not the stock `zero-api` image, and that `REDIS_URL` is unset |
| Run reaches `execution` then stalls, then fails at ~5 minutes | `requestExecution` timed out (`ZERO_EXEC_TIMEOUT_MS`, default 300000). Usually Chromium OOM — check you actually got 4 GiB, and lower `ZERO_EXEC_CONCURRENCY` |
| Screenshots or downloads 403 / signature mismatch | `ZERO_LOCAL_STORE_SECRET` or `ZERO_PUBLIC_BASE_URL` changed between when the URL was signed and when it was fulfilled. Both must be stable across revisions |
| SSE stream dies after ~4 minutes | Container Apps ingress request timeout (240 s documented). The 15 s `: ping` heartbeat defeats the *idle* timeout but not the request timeout. Poll `GET /runs/:id` instead |
| `ContainerAppInvalidResourceTotal` on create | CPU/memory must be an exact documented pair — use `--cpu 2 --memory 4.0Gi`, and note consumption-only environments cap at 2 / 4 GiB |
| `az acr build` fails on a trial subscription | ACR task runs are currently paused for subscriptions on Azure free credits. Build locally and `docker push` (§4) |
| `ImagePullBackOff` / `UNAUTHORIZED` on the container app | Admin user not enabled on the registry, or the password rotated. Re-run `az acr credential show` and `az containerapp registry set`, or switch to `--registry-identity system` |
| Artifacts from an earlier run have disappeared | Expected. Memory + ephemeral disk; a new revision or a restarted replica starts empty. Attach Postgres if you need durability |
| Cold start takes 30–60 s after scaling from zero | The Playwright base image is ~1.6 GB. Keep `--min-replicas 1` during the demo window |

---

## Related

- [../DEPLOY.md](../DEPLOY.md) — deploy overview and the auth / `NODE_ENV` trade-off in full
- [../COST.md](../COST.md) — infra floors, LLM caps, executor sizing
- [../DOCKER.md](../DOCKER.md) — the split four-image stack this demo collapses
- [./AWS.md](./AWS.md) — same demo on App Runner / ECS Fargate
- [./GCP.md](./GCP.md) — same demo on Cloud Run
- [./PAAS.md](./PAAS.md) — Railway / Render / Fly.io variants
- Root [Dockerfile.demo](../../../../../Dockerfile.demo) — the single-container image used here
- Root [AGENTS.md](../../../../../AGENTS.md) — pipeline stages and env knobs

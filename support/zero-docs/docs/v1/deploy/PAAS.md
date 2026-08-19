# Demo deploy — PaaS (Fly.io, scale to zero)

One Fly Machine runs `Dockerfile.demo` — API + orchestrator + Playwright executor in a single process via `scripts/local-stack.js` — with no Redis, no Postgres, and no object-store bill. The SPA is static and goes on Cloudflare Pages for free. You pay Fly by the second for the machine while the demo is live and destroy the app afterwards.

| | |
|---|---|
| **Path** | 1× Fly Machine (`shared-cpu-2x`, 4 GB) + Cloudflare Pages SPA |
| **Est. cost while running** | **~$0.03 / demo-hour** (compute only; estimate, Aug 2026) |
| **Est. cost after teardown** | **$0.00 / mo** after `fly apps destroy` · ~$0.30–0.60/mo if you leave a *stopped* machine · $0.15/GB-mo per volume you keep |
| **Free tier** | None on Fly (trial only: 2 machine-hours or 7 days). Cloudflare Pages is genuinely free |
| **Postgres** | not required (memory + file) |
| **Time to first demo** | ~20 minutes (most of it the first image push) |

---

## 0. What you are deploying

`ZERO_CLOUD=local` with no `REDIS_URL` means the queue in `packages/cloud/local/queue.js` is an **in-process `Map` of handlers**, and the object store is the local filesystem under `dist/artifacts/cloud-store`. So the API, orchestrator, and executor must be **the same OS process** — a shared filesystem is not enough. `scripts/local-stack.js` boots all three in order; `Dockerfile.demo` is that launcher on the Playwright base image.

| Piece | Where | Why |
|-------|-------|-----|
| API + orchestrator + executor | one Fly Machine, `Dockerfile.demo`, port 3001 | in-process queue requires co-location |
| Artifacts / signed blobs | container disk under `/app/dist/artifacts` | `ZERO_CLOUD=local`, served via `GET\|PUT /cloud/local` |
| Run metadata | in-memory `Map` + `dist/artifacts/<runId>/run.json` | `/health` reports `storage: "memory"` |
| SPA | Cloudflare Pages (`dist/web/`) | 100% static, `VITE_API_BASE_URL` baked at build time |
| Queue / cache / Postgres | **not deployed** | leave `REDIS_URL`, `DATABASE_URL`, `PGHOST` unset |

Two constraints drive every decision below:

1. **Do not set `NODE_ENV=production`.** It forces verified auth on `/runs`, `/provider-keys`, and `/agent-settings`, and `auth.assertProductionSecrets()` throws at boot unless `KEY_ENC_SECRET` is set to something other than the dev default. The SPA **never sends `x-api-key`** (there is no such string in `web/src`), so with auth on, the browser UI gets 401 on every call and only `curl` works. `Dockerfile.demo` deliberately leaves `NODE_ENV` unset. The trade-off is that the URL is open while it exists — **tear it down right after the demo** (§9).
2. **Chromium needs RAM, not `/dev/shm`.** `services/executor/browser.js` launches with `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`, so Chromium falls back to memory-backed temp files. Budget **2 GB minimum, 4 GB comfortable**. That floor rules out most "free" PaaS tiers (Render free = 512 MB).

---

## 1. Prerequisites

1. A Fly.io account with a credit card on file. There is **no free tier** — new accounts get a trial capped at 2 machine-hours or 7 days ([Fly free trial](https://fly.io/docs/about/free-trial/)).
2. A Cloudflare account (free) for the SPA.
3. Local clone of this repo with Node 20+ and `npm install` done (needed only to build the SPA), and [`Dockerfile.demo`](../../../../../Dockerfile.demo) at the repo root.
4. A random secret: `openssl rand -hex 32`.

You do **not** need Docker locally: `fly deploy` builds remotely by default.

---

## 2. Install and authenticate the CLI

```bash
curl -L https://fly.io/install.sh | sh   # or: brew install flyctl
fly version
fly auth signup     # first time only
fly auth login      # opens a browser
fly auth whoami
```

Dashboard equivalent: [fly.io/dashboard](https://fly.io/dashboard) → **Sign in**. Most steps below exist in the dashboard too, but the CLI is the supported path for `fly.toml`.

---

## 3. Create the app and fly.toml

```bash
cd /path/to/Zero
fly launch --no-deploy --dockerfile Dockerfile.demo --name zero-demo --region iad
```

`--no-deploy` creates the app record and writes a `fly.toml` without shipping anything yet, so you can set secrets first. Pick a region close to you and to the sites you will crawl (`iad` Ashburn is the cheapest in Fly's table; `ams`, `lhr`, `syd`, `bom` cost more per second).

**Do not commit `fly.toml`.** It carries a globally unique app name and a region, which are yours, not the repo's. Add it to your local ignore list or keep it out of the repo entirely. Overwrite what `fly launch` generated with this:

```toml
app = 'zero-demo'                 # your app name from `fly launch`
primary_region = 'iad'

[build]
  dockerfile = 'Dockerfile.demo'

# Public, non-secret configuration. Visible in `fly config show`.
[env]
  PORT = '3001'
  ZERO_CLOUD = 'local'
  EXECUTION_MODE = 'minimal'
  ZERO_LLM = 'off'
  ZERO_ANALYZER_MAX_PAGES = '3'
  ZERO_ORCH_CONCURRENCY = '1'
  ZERO_EXEC_CONCURRENCY = '1'
  ZERO_EXEC_ATTEMPTS = '1'
  ZERO_PUBLIC_BASE_URL = 'https://zero-demo.fly.dev'
  ZERO_WEB_URL = 'https://zero-demo.pages.dev'
  ALLOWED_ORIGINS = 'https://zero-demo.pages.dev'

[http_service]
  internal_port = 3001
  force_https = true
  auto_start_machines = true
  auto_stop_machines = 'off'      # see the warning below
  min_machines_running = 1
  processes = ['app']

  [http_service.concurrency]
    type = 'requests'
    soft_limit = 20
    hard_limit = 50

[[vm]]
  memory = '4gb'
  cpu_kind = 'shared'
  cpus = 2
```

### Why `auto_stop_machines = 'off'` for a demo

`POST /runs` returns **HTTP 202 immediately** and the pipeline continues in the background; progress is SSE on `GET /runs/:id/stream`. Fly Proxy's autostop loop runs every few minutes and, **when there is only one machine in the region, stops it if the machine has no traffic (a load of 0)** — verified in [How Fly Proxy autostop/autostart works](https://fly.io/docs/reference/fly-proxy-autostop-autostart/). Background work is invisible to the proxy.

- An SSE stream held open by the UI **is** an active connection, so a UI-driven run keeps the machine alive. *(Inferred from the "no traffic / load of 0" rule; not stated explicitly for SSE in Fly's docs — do not bet a live demo on it.)*
- A `curl`-driven run that takes the 202 and disconnects can be stopped mid-pipeline.
- `requestExecution` waits for `execution.completed` for `ZERO_EXEC_TIMEOUT_MS` (default 300000 = 5 min). A machine stopped inside that window strands the run.

So: `auto_stop_machines = 'off'` plus `auto_start_machines = true` for the demo window, and `fly scale count 0` when you are done (§9). If you would rather let Fly idle it down, use `auto_stop_machines = 'suspend'` with `min_machines_running = 1` and drive every run from the UI so the SSE stream stays open.

### Optional: a volume for artifacts

Without a volume, `dist/artifacts/` lives on the machine's ephemeral rootfs and is gone when the machine is replaced (every `fly deploy`, and on host migrations). For a demo that is usually fine. If you want artifacts to survive:

```bash
fly volumes create zero_artifacts --size 1 --region iad   # $0.15/GB-mo
```

```toml
[mounts]
  source = 'zero_artifacts'
  destination = '/data'
```

…and add `ZERO_DIST_ROOT = '/data/dist'` to `[env]` (it moves `web/`, `artifacts/`, `logs/`; `ZERO_LOCAL_STORE_DIR` overrides just the object-store dir).

**Caveat:** `Dockerfile.demo` runs as `pwuser`, and a freshly formatted Fly volume mounts root-owned, so the first boot can fail to write. Fix once after the first deploy and restart:

```bash
fly ssh console -C 'chown -R pwuser:pwuser /data'
fly machine restart <machine-id>
```

*(Inferred from standard Fly volume behaviour — verify on your first deploy before demoing.)*

---

## 4. Set secrets and env

`[env]` values are plain config, stored in `fly.toml` and readable via `fly config show`. `fly secrets` are encrypted at rest and injected as env vars at boot; **setting a secret restarts the machines**.

```bash
fly secrets set KEY_ENC_SECRET="$(openssl rand -hex 32)"
fly secrets list
```

| Set as | Variable | Value | Why |
|--------|----------|-------|-----|
| secret | `KEY_ENC_SECRET` | 32-byte hex | Encrypts stored provider keys. Required if you ever flip `NODE_ENV=production`; set it now regardless |
| env | `PORT` | `3001` | API reads `Number(process.env.PORT) \|\| 3001`; must match `internal_port` |
| env | `ZERO_CLOUD` | `local` | Filesystem object store, in-process queue |
| env | `ZERO_PUBLIC_BASE_URL` | `https://<app>.fly.dev` | Base for HMAC-signed `/cloud/local` URLs — the **API** origin, not the SPA |
| env | `ZERO_WEB_URL` | `https://<project>.pages.dev` | Advisory; logged at startup |
| env | `ALLOWED_ORIGINS` | SPA origin | CORS (see below) |
| env | `ZERO_LLM` | `off` | Template-only pipeline, $0 of LLM spend |
| env | `ZERO_ANALYZER_MAX_PAGES` | `3` | Default is 8; fewer crawled pages = shorter, cheaper run |
| env | `EXECUTION_MODE` | `minimal` | Default; URL-load checks that complete reliably |
| — | `NODE_ENV` | **unset** | See §0 |
| — | `REDIS_URL` | **unset** | Setting it switches `@zero/cloud` to Redis and breaks the single-process assumption |
| — | `DATABASE_URL` / `PGHOST` | **unset** | Memory + file persistence |

### CORS, and a quirk worth knowing

`services/api/middleware.js` allows **all** origins when `NODE_ENV !== "production"`, which is the demo configuration — so CORS will not bite you here. It matters the moment you harden the deploy: in production the allowlist is localhost, `zer0.io`, `app.zer0.io`, plus **wildcards for `*.vercel.app` and `*.up.railway.app`**, plus whatever you put in `ALLOWED_ORIGINS` / `FRONTEND_URL` / `CLIENT_URL` / `PUBLIC_URL` / `RAILWAY_PUBLIC_DOMAIN`. The allowlist matches the **browser's** origin (the SPA), and there is **no `*.fly.dev` or `*.pages.dev` wildcard** — a Railway or Vercel-hosted SPA is allowed for free, a Fly- or Pages-hosted one is not. Set `ALLOWED_ORIGINS` and move on.

Recording endpoints (`/recordings/*`, `/record`) use a separate allowlist that also reads `RECORDING_ORIGINS` and `APP_URL`.

---

## 5. Deploy

```bash
fly deploy --dockerfile Dockerfile.demo
```

The Playwright base image is ~1.6 GB, so the first remote build and push takes several minutes. Watch it with `fly status`, `fly logs`, `fly machine list`, or **fly.io/dashboard → your app → Machines / Monitoring**. Expect boot lines from `scripts/local-stack.js` (orchestrator, then executor, then the API listener), and the `HEALTHCHECK` in `Dockerfile.demo` turning the machine green after its 45-second start period.

---

## 6. Build and host the SPA

The API origin is baked into the bundle at build time. **Changing the API URL requires a rebuild** — there is no runtime config.

```bash
VITE_API_BASE_URL=https://zero-demo.fly.dev npm run build   # → dist/web/
```

Then publish `dist/web/` anywhere static. Cloudflare Pages via Wrangler:

```bash
npm install -g wrangler
wrangler login
wrangler pages project create zero-demo --production-branch main
wrangler pages deploy dist/web --project-name zero-demo
```

Dashboard: **Cloudflare dashboard → Workers & Pages → Create → Pages → Upload assets**, drag `dist/web/`.

Set `ALLOWED_ORIGINS` and `ZERO_WEB_URL` to the resulting `https://<project>.pages.dev` and redeploy Fly config if they changed (`fly deploy`).

### Free static hosts (the SPA costs $0 everywhere)

| Host | Free bandwidth | Builds | Note (estimate, Aug 2026) |
|------|----------------|--------|---------------------------|
| [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/) | Unlimited | 500/mo, 1 concurrent | Commercial use allowed; recommended |
| [Netlify](https://www.netlify.com/pricing/) | 100 GB/mo | 300 build min/mo | Overages bill the card on file |
| [Vercel](https://vercel.com/pricing) | 100 GB/mo | 6,000 build min/mo | Hobby is **non-commercial only** |
| [GitHub Pages](https://docs.github.com/en/pages) | 100 GB/mo (soft) | 10-min build limit | Static only; no headers control |

---

## 7. Verify

```bash
API=https://zero-demo.fly.dev
curl -s $API/health            # {"ok":true,"service":"ZER0","storage":"memory", ...}
curl -s $API/health/detailed
```

Both health routes are unauthenticated. `storage: "memory"` confirms no Postgres is wired — the expected demo state, not an error. Then open the Pages URL and confirm the dashboard loads without a 401.

---

## 8. Run one demo end to end

```bash
API=https://zero-demo.fly.dev

# 1. Start a URL-only autonomous run. Returns 202 immediately.
curl -s -X POST $API/runs -H 'Content-Type: application/json' \
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}'
# → {"runId":"..."}

# 2. Watch progress (keeps a connection open — also keeps the machine awake).
curl -N $API/runs/<runId>/stream

# 3. Poll instead, if you prefer.
curl -s $API/runs/<runId>
curl -s $API/runs/<runId>/assets
curl -s "$API/runs/<runId>/download?format=json&url=1"
```

`ottUrl` is required. `"testCaseInputMode":"auto"` is what triggers the URL-only autonomous path: Web Analyzer crawls (capped by `ZERO_ANALYZER_MAX_PAGES`), then BA → Manual QA → Automation QA → execution → Manager → Delivery. If you ever turn auth on, add `-H "x-api-key: <tenant:email:key value>"` to every `/runs` call — and remember the UI cannot do that.

For the live demo, drive it from the SPA instead of curl: the UI holds the SSE stream open for the whole run.

---

## 9. Teardown / scale to zero

Run these in order of how much you want gone.

| Command | What stops billing | What still bills |
|---------|--------------------|------------------|
| `fly machine stop <id>` | CPU + RAM | rootfs at **$0.15/GB-mo** — the demo image measures ~3.5 GB on disk, so budget ~$0.30–0.60/mo; volumes |
| `fly scale count 0` | CPU, RAM, **and rootfs** (the machine is destroyed, not stopped) | volumes, dedicated IPv4 if you allocated one |
| `fly volumes destroy <id>` | volume storage | app record (free) |
| `fly apps destroy <app>` | **everything — true $0** | nothing for this app |

```bash
fly scale count 0                 # after the demo
fly scale count 1                 # bring it back for the next one (fresh rootfs, artifacts gone)

fly volumes list
fly volumes destroy <volume-id>

fly apps destroy zero-demo        # the only real $0
```

`fly scale count` **creates or destroys** machines — verified in [Scale the Number of Machines](https://fly.io/docs/apps/scale-count/). Scaling to 0 does not delete the app or its volumes, and the next `fly deploy` reseeds machines from `fly.toml`.

Two Fly gotchas, both from [Cost Management on Fly.io](https://fly.io/docs/about/cost-management/):

- **Managed services live outside your apps.** Managed Postgres, Upstash Redis, and Tigris storage created through Fly are **not** deleted with `fly apps destroy`. Check the dashboard.
- **Dedicated IPv4 is $2/mo.** You do not need one: every app gets a shared IPv4 and unlimited Anycast IPv6 for free.

Cloudflare Pages: delete the project under **Workers & Pages → your project → Settings → Delete**, or leave it — a static Pages project on the free plan has no ongoing cost.

---

## 10. Cost safety

Verified numbers (Aug 2026) from the [Fly.io pricing page](https://fly.io/docs/about/pricing/), Ashburn (`iad`) rates:

| Item | Rate | 2-hour demo |
|------|------|-------------|
| `shared-cpu-2x` / 4 GB | $0.0297/hr · $21.40/mo if left on | **~$0.06** |
| `shared-cpu-2x` / 2 GB (tight but works) | $0.0158/hr · $11.39/mo | ~$0.03 |
| `performance-1x` / 4 GB (faster crawls) | $0.0570/hr · $41.01/mo | ~$0.11 |
| Volume | $0.15/GB-mo, pro-rated hourly | ~$0.0004 for 1 GB |
| Volume snapshots | $0.08/GB-mo, first 10 GB free | $0.00 |
| Egress NA/EU | $0.02/GB (inbound free) | <$0.01 |
| Stopped machine rootfs | $0.15/GB-mo | only if you `stop` instead of `scale count 0` |

Prices are **region-dependent** — the same 4 GB machine is $0.0309/hr in `ams` and $0.0371/hr in some other regions. Check the region selector on the pricing page before you commit.

Which platforms can actually hard-cap spend:

| Platform | Hard cap? | What you get |
|----------|-----------|--------------|
| **Fly.io** | **No** | Fly's own docs say "We don't support billing alerts (yet), so budget accordingly," and prepaid credits roll into an invoice rather than suspending. Your controls are the dashboard's *current month to date bill* and discretionary "Accident Forgiveness" refunds after the fact |
| **Railway** | **Yes** | Opt-in [usage limits](https://docs.railway.com/pricing/cost-control) with threshold reminders |
| **Vercel** | Partial | A spend amount with notifications on by default and an optional auto-pause you enable yourself |
| **Render** | Prorated | Billing is per-second and you delete or suspend the service; no hard cap surfaced |
| **Cloudflare Pages (free)** | N/A | Static assets are unmetered; no card, no billing risk |

Because Fly has no brake, the safest demo discipline is: `fly apps destroy` immediately after the demo, and set a calendar reminder to check the dashboard the next day. Machines on Fly are never created for you — the only variable you don't control directly is egress, which is pennies here.

---

## Alternative — Render

**Cost:** Free tier does not work. **Standard** is $25/mo (2 GB RAM, 1 CPU), billed **prorated to the second**, so a 2-hour demo is ~$0.07. **Pro** is $85/mo (4 GB, 2 CPU) → ~$0.23 for two hours. Workspace plan can stay Hobby ($0). Disks are $0.25/GB-mo. ([Render pricing](https://render.com/pricing), estimate Aug 2026.)

**Why not free:** a Render Free web service is **512 MB RAM / 0.1 CPU** and **spins down after 15 minutes without inbound traffic**, taking about a minute to come back ([Render free docs](https://render.com/docs/free)). 512 MB will not hold Chromium plus the Node stack, and the idle spin-down strands a background pipeline exactly the way Fly's autostop does. Standard (2 GB) is the realistic floor; Pro (4 GB) is comfortable.

1. Push the repo to GitHub.
2. Dashboard → **New → Web Service** → connect the repo.
3. **Language: Docker**, **Dockerfile Path:** `./Dockerfile.demo`.
4. Instance type **Standard** (2 GB) or **Pro** (4 GB).
5. Environment variables: same table as §4 — `ZERO_CLOUD=local`, `ZERO_LLM=off`, `EXECUTION_MODE=minimal`, `ZERO_ANALYZER_MAX_PAGES=3`, `KEY_ENC_SECRET`, `ZERO_PUBLIC_BASE_URL=https://<service>.onrender.com`. Leave `NODE_ENV`, `REDIS_URL`, `DATABASE_URL` unset. Render injects `PORT` — the API honours it.
6. Deploy, then `curl https://<service>.onrender.com/health`.
7. **Teardown:** Service → **Settings → Suspend** stops compute billing; **Settings → Delete** removes it entirely. Delete any attached disk separately.

---

## Alternative — Railway

**Cost:** Hobby is **$5/mo that includes $5 of usage** — a demo run costs nothing extra. Metered rates are RAM $10/GB-mo, CPU $20/vCPU-mo, egress $0.05/GB, volumes $0.15/GB-mo, all per-second ([Railway pricing](https://railway.com/pricing)). A 4 GB / ~1 vCPU container is roughly **$0.05–0.08 per demo-hour** against that credit. New accounts get a one-time $5 trial credit (up to 2 vCPU / 1 GB per service — too small for Chromium, so plan on Hobby).

Railway is the least fiddly option for CORS: `*.up.railway.app` is already in the API's production allowlist, and `.env.example` already carries `RAILWAY_PUBLIC_DOMAIN`, `PUBLIC_URL`, `FRONTEND_URL`, `CLIENT_URL`, `ALLOWED_ORIGINS`.

1. `npm i -g @railway/cli && railway login`
2. `railway init` → new project. Dashboard: **New Project → Deploy from GitHub repo**.
3. Service **Settings → Build → Dockerfile Path:** `Dockerfile.demo`.
4. **Variables:** the §4 table, minus `PORT` — **do not set `PORT`; Railway injects it** (`.env.example` says so explicitly, and the API reads `Number(process.env.PORT) || 3001`). Set `ZERO_PUBLIC_BASE_URL=https://$RAILWAY_PUBLIC_DOMAIN` after you generate the domain.
5. **Settings → Networking → Generate Domain**.
6. `railway up` / `railway logs`; verify `/health`.
7. **Do not enable Serverless** on this service for a demo — Railway's serverless mode stops inactive services, which strands a background run the same way Fly's autostop does.
8. **Teardown:** service → **Settings → Remove Service**, or delete the project. Compute billing stops when the service stops; volumes bill until deleted. Set a cap under **Usage → Usage Limits**.

---

## Alternative — Vercel-hybrid (why it costs more)

**Vercel alone cannot run this pipeline.** Functions are request-scoped and per-invocation isolated, so the in-process queue and the local disk store do not survive between invocations, and Chromium is not in the function runtime. `services/api/server.js` does handle `process.env.VERCEL` (lazy DB init, `/tmp/dist` output root via `packages/domain/lib/outputRoots.js`), so the **API can serve** on Vercel — but the orchestrator and the executor cannot. A Vercel demo therefore needs a second, always-on container plus a real queue to bridge the two halves.

The repo already has the adapter for this shape: `ZERO_CLOUD=vercel` (`packages/cloud/vercel/`) wires **Cloudflare R2** for objects, **Upstash QStash** for the queue, and **Upstash Redis** for cache/pub-sub — see [`packages/cloud/vercel/README.md`](../../../../../packages/cloud/vercel/README.md) for the full env list (`R2_*`, `QSTASH_TOKEN`, `UPSTASH_REDIS_REST_URL`). QStash delivery is HTTP push, so `queue.subscribe()` is a no-op unless you wire a webhook route. Alternatively keep `ZERO_CLOUD=local` on the workers and set `REDIS_URL` to an Upstash Redis endpoint — `ioredis` is a real dependency of `@zero/cloud`, so that switch works — but then the object store is still each container's local disk, and the API on Vercel cannot serve `/cloud/local` blobs written by the worker.

| Piece | Where | Cost (estimate, Aug 2026) |
|-------|-------|---------------------------|
| SPA + API | Vercel Hobby / Pro | $0 Hobby (**non-commercial only**) · $20/mo/seat Pro ([pricing](https://vercel.com/pricing)) |
| Orchestrator + executor | Fly or Railway container | ~$0.03–0.08/demo-hour, ~$21/mo always-on |
| Queue + cache | [Upstash Redis](https://upstash.com/pricing/redis) | Free tier: 256 MB, 500K commands/mo, 10 GB bandwidth. PAYG $0.20 per 100K commands |
| Objects | Cloudflare R2 | Free monthly allowance; **zero egress fees** ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)) |
| Postgres (optional) | [Neon](https://neon.com/pricing) free plan | $0 — ~0.5 GB storage and a monthly compute-hour allowance per project |

**Verdict:** three or four vendors, two deploy pipelines, and a queue you have to wire, to reach roughly the same $/demo-hour as one Fly Machine. It is the most complex and least cheap demo option. Choose it only if you must demo the *production-shaped* split topology, not to save money.

---

## Environment reference

| Variable | Demo value | Effect |
|----------|-----------|--------|
| `PORT` | `3001` (platform-injected on Railway/Render) | `Number(process.env.PORT) \|\| 3001` |
| `NODE_ENV` | **unset** | Setting `production` forces auth + `KEY_ENC_SECRET` at boot; SPA then 401s |
| `KEY_ENC_SECRET` | 32-byte hex | Provider-key encryption; must differ from `zero-default-dev-key-change-in-production` |
| `ZERO_CLOUD` | `local` | Filesystem store + in-process queue |
| `REDIS_URL` | **unset** | Set ⇒ Redis queue/cache; breaks single-process demo |
| `DATABASE_URL` / `PGHOST` | **unset** | Memory + `dist/artifacts/<runId>/run.json` |
| `ZERO_PUBLIC_BASE_URL` | API origin | Base for HMAC-signed `/cloud/local` URLs |
| `ZERO_WEB_URL` | SPA origin | Advisory, logged at startup |
| `VITE_API_BASE_URL` | API origin | **Build-time** only; rebuild the SPA to change it |
| `ALLOWED_ORIGINS` | SPA origin | CORS allowlist (only enforced when `NODE_ENV=production`) |
| `ZERO_DIST_ROOT` | `/data/dist` with a volume | Moves `web/`, `artifacts/`, `logs/` |
| `ZERO_LOCAL_STORE_DIR` | optional | Overrides just the object-store dir |
| `ZERO_LLM` | `off` | Template-only; $0 LLM spend |
| `ZERO_LLM_MAX_USD_PER_RUN` | `0.50` default | Per-run cap if you do add a key |
| `EXECUTION_MODE` | `minimal` | Default; reliable URL-load checks |
| `ZERO_ANALYZER_MAX_PAGES` | `3` (default 8) | Crawl breadth = run length |
| `ZERO_ORCH_CONCURRENCY` / `ZERO_EXEC_CONCURRENCY` | `1` (default 2) | Lower peak RAM on a 4 GB box |
| `ZERO_EXEC_ATTEMPTS` | `1` (default 2) | Fewer Chromium retries |
| `ZERO_EXEC_TIMEOUT_MS` | `300000` default | Orchestrator wait for `execution.completed` |
| `ZERO_API_KEYS` | `tenant:email:key,…` | Only if you turn auth on (UI will 401) |
| `ZERO_AUTH` / `ZERO_DEV_API_KEY` | unset | Force auth on outside production |
| `RUN_HEADED` | unset | Headed mode needs `DISPLAY`; silently falls back to headless |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Machine crash-loops at boot | `NODE_ENV=production` without a real `KEY_ENC_SECRET` — `assertProductionSecrets()` throws | Unset `NODE_ENV`, or set `KEY_ENC_SECRET` |
| UI shows 401 on every `/runs` call | Auth is on; the SPA never sends `x-api-key` | Unset `NODE_ENV` / `ZERO_AUTH` for the demo |
| UI loads but "Failed to fetch" | SPA built with the wrong `VITE_API_BASE_URL` | Rebuild: `VITE_API_BASE_URL=https://… npm run build`, redeploy Pages |
| Run stuck at `execution`, then fails after ~5 min | Machine stopped mid-run, or Chromium OOM | `auto_stop_machines = 'off'`; raise memory to 4 GB; lower `ZERO_EXEC_CONCURRENCY` |
| `POST /runs` returns 202 but nothing progresses | `REDIS_URL` set, so the orchestrator listens on Redis while the API published locally (or vice versa) | Unset `REDIS_URL` for the single-process demo |
| Screenshots 404 after a redeploy | Artifacts were on ephemeral rootfs | Attach a volume + `ZERO_DIST_ROOT`, or accept it for demos |
| Volume mounted but writes fail | Image runs as `pwuser`; fresh volume is root-owned | `fly ssh console -C 'chown -R pwuser:pwuser /data'`, then restart |
| `/health` says `storage: "memory"` | No Postgres — expected | Only add `DATABASE_URL` (Neon/Supabase free tier) if runs must survive a restart |
| Chromium fails with shared-memory errors | Not `/dev/shm` — the launcher already passes `--disable-dev-shm-usage` | Give the machine more RAM |

---

## Related

- [../DEPLOY.md](../DEPLOY.md) — deployment options overview
- [../COST.md](../COST.md) — cost model across all paths
- [../DOCKER.md](../DOCKER.md) — local Compose stack (the split, production-shaped topology)
- [./AWS.md](./AWS.md) — ECS/Fargate demo deploy
- [./GCP.md](./GCP.md) — Cloud Run demo deploy
- [./AZURE.md](./AZURE.md) — Container Apps demo deploy
- Root [Dockerfile.demo](../../../../../Dockerfile.demo) — the single-container demo image
- Root [.env.example](../../../../../.env.example) — full env surface

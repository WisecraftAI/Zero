import { Card, CardGrid } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';
import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { ProvidersTable } from '@/components/ui/ProvidersTable';

export function DeployDemo() {
  return (
    <>
      <h3>Demo deploy · cheapest public URL per cloud</h3>
      <p className="sub">
        One container, one process, no managed services. <code>Dockerfile.demo</code> runs{' '}
        <code>scripts/local-stack.js</code>, so the API, orchestrator, and executor share a process
        and <code>ZERO_CLOUD=local</code> works with <strong>no Redis and no Postgres</strong>. Cents
        per demo-hour, ~$0/mo after teardown. Step-by-step guides live in{' '}
        <code>docs/v1/deploy/</code>.
      </p>

      <h3>Pick a path</h3>
      <ProvidersTable
        caption="Estimates as of Aug 2026 — each guide links the official pricing page per line item."
        headers={[
          'Cloud',
          'Path',
          'Est. $/demo-hour',
          'Est. $/mo after teardown',
          'Free tier covers a demo?',
        ]}
        rows={[
          [
            'GCP · recommended',
            '1× Cloud Run service, scale to zero',
            '~$0.16 list',
            '~$0.15 image → $0 if deleted',
            'Yes — ~31 demo-hours/mo in the Cloud Run free tier',
          ],
          [
            'PaaS · Fly.io',
            '1× Fly Machine, fly scale count 0',
            '~$0.03 — cheapest hourly',
            '$0.00 after fly apps destroy',
            'No free tier (trial only)',
          ],
          [
            'AWS',
            '1× t4g.medium EC2 + Docker Compose',
            '~$0.042',
            '~$2.40 stopped (EBS) → $0 terminated',
            'Account-dependent',
          ],
          [
            'Azure',
            '1× Container App, consumption plan',
            '~$0.07 idle rate',
            '~$5.08 ACR Basic → $0 if deleted',
            'Partly — grant covers active compute, not idle',
          ],
        ]}
      />

      <p className="prose">
        <strong>GCP</strong> if you want the demo to be genuinely free and to scale to zero without
        remembering to do anything. <strong>Fly.io</strong> for the lowest hourly rate and a
        one-command <code>$0</code> teardown. <strong>AWS</strong> if you also want to show the real
        four-container split — one EC2 box runs the stock <code>docker-compose.yml</code> unmodified.{' '}
        <strong>Azure</strong> only when Azure is where you must demo; ACR Basic is a fixed monthly
        charge, so its residual is the highest.
      </p>

      <h3>The topology</h3>
      <Diagram ariaLabel="single-container demo topology">
{`        browser
           │
    ┌──────┴───────┐
    ▼              ▼
 SPA (static)   API :3001 ──────────── one container, one process
 free tier      ├─ orchestrator          (Dockerfile.demo →
                ├─ executor (Chromium)    node scripts/local-stack.js)
                ├─ queue    → in-process
                ├─ cache    → in-process
                ├─ objects  → container filesystem
                └─ runs     → in-memory Map + dist/artifacts/<runId>/run.json`}
      </Diagram>

      <Note tone="warn">
        <strong>Why one process, not three containers.</strong> With <code>ZERO_CLOUD=local</code>{' '}
        and no <code>REDIS_URL</code>, the queue in <code>packages/cloud/local/queue.js</code> is an
        in-process <code>Map</code> of handlers. A publisher in one container and a subscriber in
        another never see each other — and a shared filesystem does not fix it. Co-locating via{' '}
        <code>scripts/local-stack.js</code> is the only supported way, which is exactly what{' '}
        <code>Dockerfile.demo</code> does.
      </Note>

      <h3>Rehearse locally first · free, and verified</h3>
      <p className="prose">
        This topology is verified, not theoretical. Built and run from{' '}
        <code>Dockerfile.demo</code> with no Postgres and no Redis, a URL-only autonomous run
        completed every stage — <code>webAnalyzer → ba → manualQa → automationQa → execution →
        manager → delivery</code> — with <code>/health</code> reporting{' '}
        <code>storage: &quot;memory&quot;</code> and the Manager report recording{' '}
        <code>llm.used: false, costUsd: 0</code>. Do this before you touch any cloud; it catches env
        mistakes that are slower to diagnose through a deploy pipeline.
      </p>
      <CodeBlock lang="bash" label="Local dry run of the exact demo image">
{`docker build -f Dockerfile.demo -t zero-demo .
docker run -d --name zero-demo -p 3111:3001 \\
  -e KEY_ENC_SECRET=$(openssl rand -hex 32) \\
  -e ZERO_LOCAL_STORE_SECRET=$(openssl rand -hex 32) \\
  -e ZERO_PUBLIC_BASE_URL=http://localhost:3111 \\
  -e ZERO_LLM=off -e ZERO_ANALYZER_MAX_PAGES=3 \\
  -e ZERO_ORCH_CONCURRENCY=1 -e ZERO_EXEC_CONCURRENCY=1 -e ZERO_EXEC_ATTEMPTS=1 \\
  zero-demo

curl -s localhost:3111/health
curl -s -X POST localhost:3111/runs -H 'Content-Type: application/json' \\
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}'

docker rm -f zero-demo    # cleanup`}
      </CodeBlock>
      <p className="prose">
        Budget ~8 GB of free disk: the image measures <strong>~3.5 GB on disk</strong> (Playwright
        base ~1.6 GB plus the API, orchestrator, and executor dependencies). Registries bill
        compressed layers, which are smaller — measure yours before trusting a storage estimate.
      </p>

      <h3>What makes it cheap</h3>
      <ProvidersTable
        headers={['Choice', 'Avoided line item']}
        rows={[
          ['DATABASE_URL unset → memory + file', 'Managed Postgres (~$7–25/mo)'],
          [
            'REDIS_URL unset → in-process queue + cache',
            'ElastiCache ~$12/mo · Memorystore ~$35/mo · Azure Cache ~$16/mo',
          ],
          ['ZERO_CLOUD=local → filesystem object store', 'S3 / GCS / Blob plus its IAM setup'],
          ['One container with a public hostname', 'ALB ~$16/mo · NAT gateway ~$32/mo'],
          ['Scale to zero / stop after the demo', '24×7 always-on compute'],
          ['ZERO_LLM=off', 'Up to ZERO_LLM_MAX_USD_PER_RUN (default $0.50) per run'],
          [
            'ZERO_ANALYZER_MAX_PAGES=3 · EXECUTION_MODE=minimal',
            'Billed compute seconds per run',
          ],
        ]}
      />

      <h3>Demo env · cheapest correct combination</h3>
      <ProvidersTable
        caption="Identical on all four clouds. Per-variable notes are in each guide's Environment reference."
        headers={['Variable', 'Demo value', 'Why']}
        rows={[
          ['ZERO_CLOUD', 'local', 'Filesystem store + in-process queue/cache. Baked into Dockerfile.demo'],
          [
            'REDIS_URL',
            'unset',
            'Setting it switches @zero/cloud to Redis (ioredis is a real dependency) and forces a managed cache',
          ],
          ['DATABASE_URL / PGHOST', 'unset', 'Memory + file persistence; /health reports storage: "memory"'],
          ['NODE_ENV', 'unset', 'production forces auth the SPA cannot satisfy — see the warning below'],
          ['KEY_ENC_SECRET', 'openssl rand -hex 32', 'Encrypts stored provider keys; the API throws at boot without it when NODE_ENV=production'],
          ['ZERO_LOCAL_STORE_SECRET', 'openssl rand -hex 32', 'HMAC key for signed /cloud/local URLs'],
          ['ZERO_PUBLIC_BASE_URL', 'the API public origin', 'Base for signed artifact URLs; wrong value ⇒ downloads point at localhost'],
          ['EXECUTION_MODE', 'minimal', 'Default. URL-load checks complete reliably; full is brittle'],
          ['ZERO_LLM', 'off', 'Template-only agents ⇒ $0 LLM spend'],
          ['ZERO_ANALYZER_MAX_PAGES', '3', 'Default 8. Shorter crawl ⇒ shorter run'],
          ['ZERO_ORCH_CONCURRENCY / ZERO_EXEC_CONCURRENCY', '1 / 1', 'Defaults 2 / 2. One instance, one Chromium in 4 GB'],
          ['ZERO_EXEC_ATTEMPTS', '1', 'Default 2. Halves worst-case run time'],
        ]}
      />

      <h3>Four things that are not obvious</h3>
      <CardGrid columns={2}>
        <Card title="Auth on means the UI is broken">
          <p>
            <code>NODE_ENV=production</code> forces verified auth on <code>/runs</code>. The SPA{' '}
            <strong>never sends <code>x-api-key</code></strong>, so the browser gets 401 on every
            call and only <code>curl</code> works. Leave <code>NODE_ENV</code> unset for a UI demo —
            which makes the URL publicly open, so tear it down the same day. The stock{' '}
            <code>zero-api</code> image bakes <code>NODE_ENV=production</code> and crash-loops
            without <code>KEY_ENC_SECRET</code>; <code>Dockerfile.demo</code> leaves it unset.
          </p>
        </Card>
        <Card title="The SPA is compiled against one API URL">
          <p>
            <code>VITE_API_BASE_URL</code> is a Vite build-time constant baked into the bundle (
            <code>web/src/apiBase.js</code>). There is no runtime config, so changing the API origin
            means rebuilding and redeploying the SPA.
          </p>
        </Card>
        <Card title="CORS has built-in wildcards">
          <p>
            Outside production all origins are allowed. In production only localhost,{' '}
            <code>zer0.io</code>, <code>*.vercel.app</code>, <code>*.up.railway.app</code>, plus{' '}
            <code>ALLOWED_ORIGINS</code> and friends. A <code>run.app</code>,{' '}
            <code>fly.dev</code>, or CloudFront origin is <strong>not</strong> allowed by default.
            Recording endpoints use a separate allowlist (<code>RECORDING_ORIGINS</code>).
          </p>
        </Card>
        <Card title="POST /runs returns 202 and keeps working">
          <p>
            The pipeline continues after the response, which breaks platforms that freeze the
            container. Cloud Run needs <code>--no-cpu-throttling</code> or the run stalls at{' '}
            <code>queued</code>. Container Apps needs <code>--min-replicas 1</code> for the demo
            window. Fly needs <code>auto_stop_machines = &apos;off&apos;</code>.
          </p>
        </Card>
      </CardGrid>

      <Note tone="info">
        <strong>Executor sizing.</strong> <code>services/executor/browser.js</code> launches Chromium
        with <code>--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage</code>, so a large{' '}
        <code>/dev/shm</code> is not required (Compose&apos;s <code>shm_size: 1gb</code> is
        belt-and-braces). Chromium writes temp files to memory instead — budget{' '}
        <strong>≥2 GB RAM, 4 GB comfortable</strong>. Headed mode is impossible without{' '}
        <code>DISPLAY</code> and silently falls back to headless.
      </Note>

      <h3>Demo checklist · 15 minutes before you present</h3>
      <CodeBlock lang="bash" label="Warm up and rehearse">
{`# 1. Warm the container (cold start pulls a 1.6 GB image)
curl -s "$API_URL/health"            # → {"ok":true,...,"storage":"memory"}
curl -s "$API_URL/health/detailed"   # → uptime, memory, activeRuns

# 2. Confirm auth is off, so the UI works
curl -s "$API_URL/runs"              # → [] or a JSON list, NOT 401

# 3. Do one throwaway run now, so the first live one is not the first ever
curl -s -X POST "$API_URL/runs" -H 'Content-Type: application/json' \\
  -d '{"ottUrl":"https://example.com","testCaseInputMode":"auto"}'

# 4. Keep the instance warm until you start
while true; do curl -s "$API_URL/health" >/dev/null; sleep 60; done`}
      </CodeBlock>

      <Pipeline>
        <PipelineStage id="01" title="Health is green">
          Both <code>/health</code> and <code>/health/detailed</code> return <code>ok: true</code>.{' '}
          <code>storage: &quot;memory&quot;</code> is the expected answer — it confirms no Postgres is
          attached.
        </PipelineStage>
        <PipelineStage id="02" title="Auth is not in the way">
          <code>GET /runs</code> must not return 401. If it does, <code>NODE_ENV</code> is{' '}
          <code>production</code> somewhere.
        </PipelineStage>
        <PipelineStage id="03" title="One warm-up run is done">
          Completed end to end, and you have already looked at its Manager report so you know what
          you are pointing at.
        </PipelineStage>
        <PipelineStage id="04" title="SPA loads clean">
          No <code>Failed to fetch</code> in the browser console — that means{' '}
          <code>VITE_API_BASE_URL</code> was baked correctly.
        </PipelineStage>
        <PipelineStage id="05" title="Target URL pre-tested">
          Pick a small, fast, public site. A heavy SPA makes the crawl look slow.
        </PipelineStage>
        <PipelineStage id="06" title="Tabs open">
          SPA dashboard · <code>/health/detailed</code> · <code>/api-docs</code> (Swagger UI) · the
          cloud console log view.
        </PipelineStage>
        <PipelineStage id="07" title="Keep-warm running">
          The loop above, or <code>min-instances</code> / <code>min-replicas</code> temporarily at 1.
        </PipelineStage>
        <PipelineStage id="08" title="Teardown command known">
          Not looked up at 6pm. It is §9 of your cloud&apos;s guide.
        </PipelineStage>
      </Pipeline>

      <p className="prose">
        Timing: a URL-only autonomous run at <code>ZERO_ANALYZER_MAX_PAGES=3</code> and{' '}
        <code>EXECUTION_MODE=minimal</code> typically finishes in a few minutes.{' '}
        <code>requestExecution</code> waits up to <code>ZERO_EXEC_TIMEOUT_MS</code> (default 300000 =
        5 min) for the executor. Stream progress with <code>GET /runs/:id/stream</code> rather than
        polling — it also keeps the instance alive.
      </p>

      <h3>Cost-safety checklist</h3>
      <p className="prose">
        Do these <strong>before</strong> the first deploy, not after the bill. None of AWS, GCP, or
        Azure hard-stops spending by default — budgets only notify, so the technical caps are what
        actually bound the bill. Two partial exceptions: Cloud Run honors Cloud Billing spend caps by
        pausing the service, and Railway offers an opt-in hard cap.
      </p>
      <ProvidersTable
        headers={['Control', 'Why it matters']}
        rows={[
          ['Budget alert at $5, thresholds 50 / 90 / 100 %', 'Earliest possible warning; §10 of each guide'],
          [
            'Scale ceiling of 1',
            '--max-instances=1 (Cloud Run) · --max-replicas 1 (Container Apps) · one machine (Fly) · one instance (EC2). A runaway autoscaler is the only way this gets expensive',
          ],
          ['ZERO_LLM=off', 'Otherwise each run can spend up to $0.50'],
          ['No managed Redis or Postgres created', 'Confirm /health says storage: "memory"'],
          [
            'No Terraform applied',
            'infra/aws and infra/gcp provision production adapters including ElastiCache and Memorystore. The demo tier applies neither',
          ],
          ['Teardown tested once on a throwaway deploy', 'So you are not reading docs under pressure'],
          ['Calendar reminder the same evening', 'Run teardown'],
          [
            'Artifacts downloaded before teardown',
            'Run metadata lives in memory plus dist/artifacts/<runId>/run.json on ephemeral storage',
          ],
        ]}
      />

      <CodeBlock lang="bash" label="Teardown one-liners">
{`# GCP — delete the service, then the whole project
gcloud run services delete zero-demo --region=us-central1 --quiet
gcloud projects delete "$PROJECT_ID"

# Fly.io — true $0
fly apps destroy <app-name>

# AWS — stop (keeps ~$2.40/mo EBS) or terminate ($0)
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
aws ec2 terminate-instances --instance-ids "$INSTANCE_ID"

# Azure — removes the app, the registry, and the environment in one call
az group delete --name zero-demo-rg --yes --no-wait`}
      </CodeBlock>

      <h3>What the demo tier gives up</h3>
      <ProvidersTable
        caption="Be honest about this if it comes up during the demo."
        headers={['Dropped', 'Consequence', 'Restore with']}
        rows={[
          [
            'Postgres',
            'Runs vanish on restart; no locator learning across runs',
            'DATABASE_URL → free Neon/Supabase tier or managed Postgres',
          ],
          [
            'Redis',
            'Cannot split into separate API / orchestrator / executor services',
            'REDIS_URL → managed cache, then the four images from the Compose tab',
          ],
          [
            'Managed object store',
            'Artifacts live on ephemeral container storage',
            'ZERO_CLOUD=aws|gcp|azure plus a bucket (infra/)',
          ],
          [
            'Auth',
            'The API is publicly open for the demo window',
            'NODE_ENV=production + KEY_ENC_SECRET + ZERO_API_KEYS, driven via curl',
          ],
          ['Multiple instances', 'One run at a time', 'The production topology — see Production tab'],
        ]}
      />

      <Note tone="danger">
        This tier is for demos only. The API is publicly reachable with auth off, artifacts are not
        durable, and there is no WAF, TLS termination you control, or tenant isolation beyond the
        default local tenant. Tear it down when the demo ends — see{' '}
        <a href="#deploy-prod">Deployment → Production</a> for the hardened rollout.
      </Note>
    </>
  );
}

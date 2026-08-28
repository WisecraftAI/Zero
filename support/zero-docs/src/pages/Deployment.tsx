import { useMemo } from 'react';
import { SubTabs, type SubTabDef } from '@/components/layout/SubTabs';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';
import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useHashTab } from '@/hooks/useHashTab';
import { DeployCloud } from './deployment/Cloud';
import { DeployCost } from './deployment/Cost';
import { DeployDemo } from './deployment/Demo';
import { DeployMinio } from './deployment/Minio';

const DEPLOY_TABS = [
  { id: 'deploy-local',   label: 'Local dev',      tag: 'npm' },
  { id: 'deploy-compose', label: 'Docker Compose', tag: 'full stack' },
  { id: 'deploy-hybrid',  label: 'Hybrid',         tag: 'infra in Docker' },
  { id: 'deploy-minio',   label: 'MinIO',          tag: 'profile s3' },
  { id: 'deploy-demo',    label: 'Demo deploy',    tag: 'cheapest cloud' },
  { id: 'deploy-cloud',   label: 'Cloud',          tag: 'providers' },
  { id: 'deploy-cost',    label: 'Cost',           tag: 'estimates' },
  { id: 'deploy-prod',    label: 'Production',     tag: 'hardening' },
] as const satisfies readonly SubTabDef[];

function Local() {
  return (
    <>
      <h3>Local dev · one machine, no Docker</h3>
      <p className="sub">
        Fastest inner loop. The API alone with <code>npm start</code>, or the whole split stack
        co-located with <code>npm run start:all</code>. UI via Vite (<code>npm run client</code>) or
        Compose nginx.
      </p>

      <Diagram ariaLabel="local dev commands">
{`cp .env.example .env          # optional: Postgres / secrets
npm install
npx playwright install chromium
npm run build                  # Vite client → dist/web/
npm start                      # API only  → http://localhost:3001
npm run client                 # Vite UI   → http://localhost:5173
# or full pipeline on the host:
npm run start:all              # API + orchestrator + executor`}
      </Diagram>

      <Pipeline>
        <PipelineStage id="01" title="Configure env (optional)">
          Copy <code>.env.example</code> to <code>.env</code>. Without a DB, runs persist to
          in-memory Maps plus <code>dist/artifacts/&lt;runId&gt;/run.json</code>. Set{' '}
          <code>DATABASE_URL</code> to enable Postgres (ten tables —{' '}
          <a href="#tech-schema">schema</a>).
        </PipelineStage>
        <PipelineStage id="02" title="Install dependencies">
          <code>npm install</code> resolves the workspaces (<code>services/*</code>,{' '}
          <code>packages/*</code>, <code>web</code>). One lockfile at the root.
        </PipelineStage>
        <PipelineStage id="03" title="Install Chromium">
          <code>npx playwright install chromium</code> — needed only for the executor path (real
          execution and the URL analyzer).
        </PipelineStage>
        <PipelineStage id="04" title="Build the UI">
          <code>npm run build</code> runs <code>vite build</code> for <code>@zero/web</code> into{' '}
          <code>dist/web/</code>. The API does not serve the SPA — use <code>npm run client</code>{' '}
          (Vite :5173) or Compose <code>zero-web</code> nginx (:3000).
        </PipelineStage>
        <PipelineStage id="05" title="Start the runtime">
          <code>npm start</code> boots the HTTP API only on <code>:3001</code> (no Chromium). For the
          full pipeline locally use <code>npm run start:all</code>, which launches the API,
          orchestrator, and executor together.
        </PipelineStage>
        <PipelineStage id="06" title="Verify">
          <code>curl http://localhost:3001/health</code> for the API. Open the UI at{' '}
          <code>http://localhost:5173</code> (<code>npm run client</code>) or{' '}
          <code>http://localhost:3000</code> under Compose. Smoke: <code>npm run test:smoke</code>.
        </PipelineStage>
      </Pipeline>

      <Note tone="info">
        <code>npm start</code> is API-only by design — it can never launch a browser. Workers run in
        their own processes (<code>npm run orchestrator</code>, <code>npm run execution</code>) or
        together via <code>npm run start:all</code>.
      </Note>
    </>
  );
}

function Compose() {
  return (
    <>
      <h3>Docker Compose · full split stack on one host</h3>
      <p className="sub">
        Four workspace-scoped app images (<code>zero-web</code>, <code>zero-api</code>,{' '}
        <code>zero-orchestrator</code>, <code>zero-executor</code>) plus Postgres and Redis.
        Chromium lives only in the executor image. MinIO is opt-in via{' '}
        <code>--profile s3</code>.
      </p>

      <Diagram ariaLabel="compose commands">
{`docker compose up --build          # build + start default stack
# Web UI     http://localhost:3000/health
# API        http://localhost:3001/health
# Docs       http://localhost:5174
# Workflow   http://localhost:5175/status

# Optional S3 adapter drill (not used when ZERO_CLOUD=local):
docker compose --profile s3 up -d minio minio-init
# MinIO console  http://localhost:9001  (zerominio / zerominio123)

docker compose down                # stop, keep volumes
docker compose down -v             # stop + wipe pgdata / miniodata / artifacts`}
      </Diagram>

      <Pipeline>
        <PipelineStage id="01" title="Prerequisites">
          Docker Engine + Compose v2. Free ports 3000 / 3001 / 5174 / 5175 / 5432 / 6379, or
          override with <code>WEB_PORT</code>, <code>API_PORT</code>, <code>POSTGRES_PORT</code>, etc.
        </PipelineStage>
        <PipelineStage id="02" title="Build + start">
          <code>docker compose up --build</code> builds four app images: nginx SPA (
          <code>web/Dockerfile</code>), API (root <code>Dockerfile</code>, no Chromium),
          orchestrator, and executor (Playwright base). Starts Postgres + Redis. Default{' '}
          <code>ZERO_CLOUD=local</code> stores blobs on the shared artifacts volume.
        </PipelineStage>
        <PipelineStage id="03" title="Shared state">
          App services share the <code>app-artifacts</code> volume at{' '}
          <code>/app/dist/artifacts</code> and the same <code>REDIS_URL</code> queue, so the API can
          hand runs to the orchestrator and the orchestrator to the executor.
        </PipelineStage>
        <PipelineStage id="04" title="Health checks">
          <code>curl localhost:3000/health</code> (nginx) · <code>curl localhost:3001/health</code>{' '}
          (API) · <code>curl localhost:5175/status</code> (workflow probes the bind-mounted repo).
        </PipelineStage>
        <PipelineStage id="05" title="Iterate or tear down">
          Rebuild one service with <code>docker compose up --build api</code>. Stop with{' '}
          <code>docker compose down</code> (volumes retained) or <code>-v</code> to wipe.
        </PipelineStage>
      </Pipeline>

      <Note tone="warn">
        Compose defaults to <code>NODE_ENV=development</code> so it boots without production secrets.
        Do not expose this stack publicly — see the Production tab for the hardening steps.
      </Note>
    </>
  );
}

function Hybrid() {
  return (
    <>
      <h3>Hybrid · infra in Docker, app on the host</h3>
      <p className="sub">
        The fastest way to iterate on Node while still using real Postgres and Redis. No app image
        rebuilds. Add MinIO only when drilling the S3 adapter.
      </p>

      <Diagram ariaLabel="hybrid commands">
{`docker compose up -d postgres redis

export DATABASE_URL=postgres://zero:zero@localhost:5432/zero
export REDIS_URL=redis://localhost:6379
# optional S3 drill:
# docker compose --profile s3 up -d minio minio-init

npm install
npm run build
npm run start:all                  # API + orchestrator + executor on the host
npm run client                     # Vite UI → :5173`}
      </Diagram>

      <Pipeline>
        <PipelineStage id="01" title="Start infra only">
          <code>docker compose up -d postgres redis</code>. If host <code>:5432</code> is busy,{' '}
          <code>POSTGRES_PORT=15432 docker compose up -d postgres</code> and point{' '}
          <code>DATABASE_URL</code> at that port.
        </PipelineStage>
        <PipelineStage id="02" title="Point the host app at it">
          Export <code>DATABASE_URL</code> and <code>REDIS_URL</code> for the in-network services.
          Add MinIO <code>S3_*</code> vars only when testing the object store with{' '}
          <code>--profile s3</code>.
        </PipelineStage>
        <PipelineStage id="03" title="Build + run on the host">
          <code>npm install</code>, <code>npm run build</code>, then <code>npm run start:all</code>.
          Code edits reload without touching Docker images.
        </PipelineStage>
      </Pipeline>
    </>
  );
}

function Production() {
  return (
    <>
      <h3>Production · cloud provider + real secrets</h3>
      <p className="sub">
        Same four images, hardened. Auth is forced on, secrets are required, and infrastructure uses
        a managed cloud provider — see the <strong>Cloud</strong> tab for provider wiring and env
        matrix.
      </p>

      <Pipeline>
        <PipelineStage id="01" title="Provision infrastructure">
          Apply Terraform or your IaC for the chosen provider (object store, queue, secrets, cache,
          Postgres). All five adapters ship today. <StatusBadge status="done" />
        </PipelineStage>
        <PipelineStage id="02" title="Set required secrets">
          <code>NODE_ENV=production</code> (boot fails without encryption secret), encryption
          secret, and API keys (or JWT / OIDC issuer). Set <code>ZERO_CLOUD</code> to{' '}
          <code>aws</code>, <code>gcp</code>, <code>azure</code>, or <code>vercel</code>.
        </PipelineStage>
        <PipelineStage id="03" title="Build + push images">
          Build <code>zero-web</code>, <code>zero-api</code>, <code>zero-orchestrator</code>, and{' '}
          <code>zero-executor</code> (Playwright base) and push to your registry. Keep Playwright
          out of the API image.
        </PipelineStage>
        <PipelineStage id="04" title="Deploy the tiers">
          Serve the SPA (CDN or nginx), run the API behind TLS, the orchestrator as a long-lived
          worker, and the executor as an autoscaled job pool keyed on queue depth. Give the
          executor <code>shm_size ≥ 1gb</code> for Chromium.
        </PipelineStage>
        <PipelineStage id="05" title="Run migrations">
          Point <code>DATABASE_URL</code> at managed Postgres; tables initialize via{' '}
          <code>@zero/db</code> <code>initAllTables</code> + <code>runPendingMigrations</code> on
          boot (ER: <a href="#tech-schema">schema</a>). A standalone <code>migrate</code> CLI is{' '}
          <StatusBadge status="not-done" />.
        </PipelineStage>
        <PipelineStage id="06" title="Smoke + observe">
          Hit <code>/health</code> and <code>/health/detailed</code> on the API origin (
          <code>:3001</code>), start one run, confirm artifacts land in the object store.
          Dashboards for <code>queue_lag</code> / <code>executor_slots_used</code> and a runbook +
          SLOs are <StatusBadge status="not-done" /> (see Ship Checklist).
        </PipelineStage>
      </Pipeline>

      <Note tone="danger">
        Production must not run on Compose defaults. Verify <code>ZERO_AUTH</code> is on,{' '}
        <code>X-User-Email</code> is not treated as identity, recording CORS is an explicit
        allowlist, and <code>/artifacts</code> is never statically served.
      </Note>
    </>
  );
}

export function DeploymentPage() {
  const tabIds = useMemo(() => [...DEPLOY_TABS.map((t) => t.id), 'v3-connect'], []);
  const [rawTab, setTab] = useHashTab(tabIds, 'deploy-local');
  const tab = rawTab === 'v3-connect' ? 'deploy-cloud' : rawTab;

  return (
    <>
      <section className="section" id="deploy-intro">
        <h2>Deployment · step by step</h2>
        <p className="sub">
          Each path is broken into single, ordered steps: local dev, Docker Compose, hybrid infra,
        the cheapest cloud demo, provider wiring, cost estimates, and a hardened production rollout.
        Status badges mark what is done vs still target.
        </p>
        <SubTabs tabs={DEPLOY_TABS} active={tab} onSelect={setTab} ariaLabel="Deployment paths" />

        <div id={`subpanel-${tab}`} role="tabpanel" aria-labelledby={`subtab-${tab}`}>
          {tab === 'deploy-local'   && <Local />}
          {tab === 'deploy-compose' && <Compose />}
          {tab === 'deploy-hybrid'  && <Hybrid />}
          {tab === 'deploy-minio'   && <DeployMinio />}
          {tab === 'deploy-demo'    && <DeployDemo />}
          {tab === 'deploy-cloud'   && <DeployCloud />}
          {tab === 'deploy-cost'    && <DeployCost />}
          {tab === 'deploy-prod'    && <Production />}
        </div>
      </section>
    </>
  );
}

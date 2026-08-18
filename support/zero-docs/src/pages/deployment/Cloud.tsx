import { Diagram } from '@/components/ui/Diagram';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function DeployCloud() {
  return (
    <>
      <h3>Cloud · one contract, five wirings</h3>
      <p className="sub">
        Every provider swap is one environment variable plus adapter wiring. Application services
        never import a vendor SDK — they talk to four primitives only: object store, queue, secrets,
        and cache.
      </p>

      <Diagram ariaLabel="Provider selection at boot">
{`                    ZERO_CLOUD at boot
                            │
           ┌────────────────┼────────────────┬──────────────┐
           ▼                ▼                ▼              ▼
         local             aws              gcp           azure · vercel
    MinIO · in-proc    S3 · SQS · SM    GCS · Pub/Sub    Blob · SB · R2 …
           │                │                │              │
           └──────────────── same four interfaces ────────┘
                  Object store · Queue · Secrets · Cache`}
      </Diagram>

      <h3>Adapter contracts</h3>
      <p className="prose">
        Four provider-agnostic interfaces so tiers can swap clouds without code changes. Shipped
        adapters: <StatusBadge status="done" /> local · <StatusBadge status="done" /> aws ·{' '}
        <StatusBadge status="done" /> gcp · <StatusBadge status="done" /> azure ·{' '}
        <StatusBadge status="done" /> vercel, all covered by the GATE-9 conformance suite.
      </p>
      <ProvidersTable
        caption="What each interface owns — no vendor types leak past the adapter layer."
        headers={['Interface', 'Responsibility']}
        rows={[
          [
            'Object store',
            'Presigned upload/download URLs, put/get/remove blobs (TC files, screenshots, reports).',
          ],
          [
            'Queue',
            'Publish and subscribe on topics (runs.requested, execution.requested, execution.completed).',
          ],
          ['Secrets', 'Fetch and store runtime credentials (LLM keys, login passwords).'],
          ['Cache', 'Key/value get/set plus pub/sub for run state and SSE fan-out.'],
        ]}
      />

      <h3>Managed service per capability</h3>
      <ProvidersTable
        headers={['Capability', 'AWS', 'GCP', 'Azure', 'Vercel-hybrid']}
        rows={[
          ['Edge · WAF',     'CloudFront + WAF',     'Cloud CDN + Armor',     'Front Door + WAF',      'Vercel Edge'],
          ['API runtime',    'ECS Fargate · Lambda', 'Cloud Run',             'Container Apps',        'Vercel Functions'],
          ['Orchestrator',   'ECS service · EKS',    'Cloud Run jobs · GKE',  'Container Apps jobs',   'Fly.io · Railway'],
          ['Execution farm', 'Fargate + Step Fns',   'Cloud Run jobs',        'Container Apps jobs',   'Browserless · Browserbase'],
          ['Event bus',      'SQS · EventBridge',    'Pub/Sub',               'Service Bus',           'Upstash Kafka · QStash'],
          ['Object store',   'S3',                   'GCS',                   'Blob Storage',          'R2 · S3'],
          ['Relational',     'RDS · Aurora Postgres','Cloud SQL Postgres',    'Flexible Server',       'Neon · Supabase'],
          ['Cache',          'ElastiCache Redis',    'Memorystore',           'Cache for Redis',       'Upstash Redis'],
          ['Secrets',        'Secrets Manager',      'Secret Manager',        'Key Vault',             'Vercel env · Doppler'],
          ['Auth',           'Cognito',              'Identity Platform',     'Entra External ID',     'Clerk · Auth.js'],
          ['Telemetry',      'CloudWatch · X-Ray',   'Cloud Ops',             'Monitor · App Insights','Grafana Cloud · Honeycomb'],
        ]}
      />

      <h3>Environment matrix</h3>
      <ProvidersTable
        headers={['Variable', 'local', 'aws', 'gcp', 'azure', 'vercel']}
        rows={[
          ['ZERO_CLOUD',       'local',         'aws',                       'gcp',                     'azure',                    'vercel'],
          ['DATABASE_URL',     'postgres…docker','RDS/Aurora URL',           'Cloud SQL socket',        'Flexible Server URL',      'Neon/Supabase URL'],
          ['Object store',     'local disk + /cloud/local (default); MinIO :9000 when ZERO_CLOUD=aws + S3_ENDPOINT', 'S3 bucket + region',        'GCS bucket + project',    'Storage account',          'R2 bucket + endpoint'],
          ['Queue',            'in-process',    'SQS runs + exec URLs',      'Pub/Sub topics',          'Service Bus queues',       'QStash URL + token'],
          ['Cache · pub/sub',  'in-memory',     'ElastiCache Redis URL',     'Memorystore Redis URL',   'Azure Cache Redis URL',    'Upstash Redis URL'],
          ['Secrets',          '.env file',     'Secrets Manager prefix',    'Secret Manager project',  'Key Vault URL',            'Vercel env / Doppler'],
          ['Identity',         '—',             'IAM role (IRSA / task)',    'Workload Identity',       'Managed Identity',         'Static tokens'],
          ['Cost floor / mo',  '$0',            '~$60 (RDS t4g.micro + NAT)', '~$50 (Cloud SQL f1-micro)', '~$55 (Flexible burstable)', '~$25 (Neon + Upstash free)'],
        ]}
      />

      <Note tone="info">
        <strong>MinIO in Compose</strong> is an optional S3 stand-in — not the default blob store. See{' '}
        <a href="#deploy-minio">Deployment → MinIO</a> for console access, credentials, and how to
        enable <code>ZERO_CLOUD=aws</code> + <code>S3_ENDPOINT</code>.
      </Note>

      <Note tone="danger">
        <strong>Never bake static keys into images.</strong> Prefer IRSA (AWS), Workload Identity
        (GCP), or Managed Identity (Azure). Static keys are only acceptable for local / Vercel and
        should rotate through the secrets adapter, not baked into container env.
      </Note>

      <h3>Bootstrap · what the operator does per cloud</h3>
      <CardGrid columns="auto">
        <Card title="AWS">
          <p>
            VPC, managed Postgres, object bucket with lifecycle, queues (runs, exec, DLQ), Redis
            cache, secrets store, container registry, Fargate services for API and orchestrator,
            Fargate tasks for executor with shared memory for Chromium. One IAM role per service.
          </p>
        </Card>
        <Card title="GCP">
          <p>
            Cloud SQL Postgres, object storage, Pub/Sub with subscriptions, Memorystore, Secret
            Manager, Artifact Registry, Cloud Run for API, Cloud Run Jobs for orchestrator and
            executor. Workload Identity binds each service account.
          </p>
        </Card>
        <Card title="Azure">
          <p>
            Flexible Postgres, Blob Storage, Service Bus, Cache for Redis, Key Vault, container
            registry, Container Apps for API and orchestrator, Container Apps Job for executor.
            Managed Identity per app.
          </p>
        </Card>
        <Card title="Vercel-hybrid">
          <p>
            Serverless API, Neon/Supabase Postgres, Cloudflare R2, Upstash Redis + QStash for
            queue, Browserless / Browserbase for executor. Cheapest path for under 100 runs/day;
            ceiling is executor throughput.
          </p>
        </Card>
      </CardGrid>
    </>
  );
}

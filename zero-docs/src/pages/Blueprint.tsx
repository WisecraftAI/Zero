import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';
import { Diagram } from '@/components/ui/Diagram';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MILESTONES } from '@/data/migration';

export function BlueprintPage() {
  return (
    <>
      <section className="section" id="why-change">
        <h2>Why the shape has to change</h2>
        <p className="sub">Today&apos;s runtime hits five walls before it can go multi-tenant on any cloud.</p>
        <CardGrid columns="auto">
          <Card title="Serverless ≠ Playwright">
            <p>Vercel functions can&apos;t host long-running Chromium. Execution must move to a durable worker host.</p>
          </Card>
          <Card title="State in Maps">
            <p><code>runs</code>, <code>runSecrets</code>, <code>recordingSessions</code>, <code>selectorMemory</code> — still in-process for some paths. Zero horizontal scale.</p>
          </Card>
          <Card title="One image holds three tiers">
            <p>M1–M4 landed as modules. They still deploy together. API, orchestrator, and executor cannot scale apart.</p>
          </Card>
          <Card title="Local queue">
            <p><code>ZERO_CLOUD=local</code> is in-process pub/sub. A second container will not see messages.</p>
          </Card>
          <Card title="Vendor-shaped code">
            <p>To move between AWS / GCP / Azure the domain must stop knowing which SDK it talks to. That contract is <code>@zero/cloud</code>. Azure / Vercel adapters are still missing.</p>
          </Card>
        </CardGrid>
      </section>

      <section className="section" id="tiers">
        <h2>Three tiers with one contract</h2>
        <p className="sub">Split ZER0 into stateless intake, orchestration workers, and ephemeral execution — everything else hides behind adapters.</p>
        <Diagram ariaLabel="Three-tier split: API, Orchestrator, Execution">
{`  Tier              Runtime                       Owns
  ────────────────────────────────────────────────────────────────
  edge + api        stateless containers /         auth, run intake,
                    serverless functions           status stream, signed URLs

  orchestration     long-lived workers             BA · Manual · Automation ·
                                                   Manager · Delivery agents,
                                                   LLM calls, DAG state

  execution         ephemeral job containers       Playwright chromium runs,
                                                   screenshots, element logs`}
        </Diagram>
        <Note tone="info">
          <strong>Contract:</strong> every tier only talks to four provider-agnostic primitives —
          <code>queue</code>, <code>object store</code>, <code>relational DB</code>, and{' '}
          <code>KV / secrets</code>. Cloud SDKs live only in Cloud adapters — folder{' '}
          <code>packages/cloud/</code> · npm <code>@zero/cloud</code> · skill{' '}
          <code>/zero-cloud</code>. Never in agents.
        </Note>
      </section>

      <section className="section" id="blueprint">
        <h2>Target architecture</h2>
        <p className="sub">One picture, cloud-agnostic. Provider names appear only in the adapter tier.</p>
        <Diagram ariaLabel="Target multi-cloud architecture for ZER0">
{`                    ┌──────────────────────────────────────┐
                    │  Edge · CDN · WAF                     │
                    │  CloudFront · Cloud CDN · Front Door   │
                    └──────────────────┬───────────────────┘
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  API Gateway  (auth, rate limit)      │
                    └───────┬──────────────────────────┬───┘
                            │                          │
                            ▼                          ▼
                 ┌─────────────────────┐   ┌────────────────────┐
                 │  API service        │   │  Auth · OIDC       │
                 │  Node · intake      │   │  Cognito · Firebase│
                 │  status · SSE       │   │  Entra · Clerk     │
                 └────┬────────┬───────┘   └────────────────────┘
                      │        │
        signed URL    │        │  publish
   (browser uploads)  ▼        ▼
        ┌─────────────────┐  ┌──────────────────────────────┐
        │ Object store    │  │ Event bus · queues            │
        │ S3 · GCS · Blob │  │ runs.requested · execution.* │
        └────────▲────────┘  └────────┬─────────┬───────────┘
                 │                    ▼         │
                 │              ┌─────────────┐ │  fan-out per TC
                 │              │ Orchestrator│ │
                 │              │ BA · Manual │ │
                 │              │ Automation  │ │
                 │              │ Manager     │ │
                 │              └──┬───┬───┬──┘ │
                 │       ┌─────────┘   │   └────┼───────┐
                 │       ▼             ▼        ▼       ▼
                 │  ┌─────────┐   ┌─────────┐  ┌──────────────┐
                 │  │ LLM     │   │ Postgres│  │ Execution    │
                 │  │ OpenAI  │   │ RDS ·   │  │ farm         │
                 │  │ Bedrock │   │ Cloud SQL│ │ Playwright   │
                 │  │ Vertex  │   └────┬────┘  └───────┬──────┘
                 │  └─────────┘        │               │
                 └─────────────────────┘  screenshots + traces
                    ┌─────────────────┐
                    │ Redis · KV      │◀───── run state · SSE
                    └─────────────────┘`}
        </Diagram>
      </section>

      <section className="section" id="sequence">
        <h2>Sequence · start-to-report</h2>
        <p className="sub">
          Numbered flow for a single run from <code>architectureV2.html</code>. Every hop crosses a
          queue or storage boundary — nothing lives in memory across steps. This is the contract
          the V3 repos must honour.
        </p>
        <Diagram ariaLabel="End-to-end run sequence">
{` 1  Client   →  API GW → API           POST /api/runs (metadata only)
 2  API      →  Object store            presign PUT for tcFile / recordingFile
 3  API      →  Client                  201 { runId, uploadUrls }
 4  Client   →  Object store            PUT files directly (bypass API)
 5  API      →  Postgres                INSERT qa_runs (status = queued)
 6  API      →  Event bus               publish runs.requested { runId }
 7  API      →  Client                  open SSE /api/runs/:id/stream

 8  Bus      →  Orchestrator            deliver runs.requested
 9  Orch     →  Postgres                SELECT run
10  Orch     →  Object store            GET inputs
11  Orch     →  Secrets manager         fetch LLM + login secrets
12  Orch     →  LLM                     BA agent prompt
13  LLM      →  Orch                    requirements
14  Orch     →  Postgres                persist artifacts.requirements
15  Orch     →  Redis pub/sub           state → ba:done  →  API relays to SSE

16  Orch     →  LLM                     Manual QA + Automation QA prompts
17  LLM      →  Orch                    TCs + selector plan
18  Orch     →  Postgres                merge with element_locators by host
19  Orch     →  Event bus               publish execution.requested (per batch)

20  loop per TC batch (fan-out)
21    Bus    →  Execution worker        deliver execution.requested
22    Job    →  Secrets manager         pull runtime login secret
23    Job    →  Object store            download recording (if any)
24    Job    →  Playwright chromium     isolated container run
25    Job    →  Object store            PUT screenshots + traces
26    Job    →  Postgres                upsert element_locators (learned)
27    Job    →  Event bus               publish execution.completed
28  end

29  Bus      →  Orchestrator            aggregate execution.completed
30  Orch     →  Postgres                write executionReport
31  Orch     →  LLM                     Manager + Delivery prompts
32  Orch     →  Postgres                qa_runs.status = completed
33  Orch     →  Redis pub/sub           state → completed → SSE
34  Client   →  API                     GET /api/runs/:id/download
35  API      →  Object store            presign GET (report + screenshots)
36  API      →  Client                  302 signed URL`}
        </Diagram>
        <Note tone="warn">
          Today steps 1–6, 8, 19–27 work <em>inside one process</em> when{' '}
          <code>ZERO_CLOUD=local</code>. The hop boundaries exist as function calls, not as
          separate repos. S5 turns the orchestrator hop into a real process boundary.
        </Note>
      </section>

      <section className="section" id="providers">
        <h2>Same code · four provider wirings</h2>
        <p className="sub">The adapters in Cloud adapters (<code>@zero/cloud</code>, folder <code>packages/cloud/</code>) are the only things that change.</p>
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
        <p className="prose" style={{ marginTop: '1rem' }}>
          Shipped adapters: <StatusBadge status="done" /> local · <StatusBadge status="done" /> aws
          · <StatusBadge status="done" /> gcp · <StatusBadge status="not-done" /> azure ·{' '}
          <StatusBadge status="not-done" /> vercel.
        </p>
      </section>

      <section className="section" id="adapters">
        <h2>Cloud adapter contracts</h2>
        <p className="sub">Tight interfaces so the domain code never imports a vendor SDK.</p>
        <CodeBlock lang="ts" label="packages/cloud/index.d.ts · npm @zero/cloud">
{`export interface ObjectStore {
  presignPut(key: string, ttlSec?: number): Promise<string>;
  presignGet(key: string, ttlSec?: number): Promise<string>;
  put(key: string, body: Buffer | Readable, meta?: object): Promise<void>;
  get(key: string): Promise<Readable>;
  remove(key: string): Promise<void>;
}

export interface Queue<T> {
  publish(topic: string, msg: T, opts?: { dedupId?: string }): Promise<void>;
  subscribe(topic: string, handler: (msg: T) => Promise<void>): Unsubscribe;
}

export interface Secrets {
  get(name: string): Promise<string>;
  put(name: string, value: string): Promise<void>;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, val: T, ttlSec?: number): Promise<void>;
  publish(channel: string, msg: unknown): Promise<void>;
  subscribe(channel: string, cb: (msg: unknown) => void): Unsubscribe;
}

// wired once at boot from process.env.ZERO_CLOUD
//   = "local" | "aws" | "gcp" | "azure" | "vercel"`}
        </CodeBlock>
      </section>

      <section className="section" id="milestones">
        <h2>Rollout milestones · capability track</h2>
        <p className="sub">
          M1–M7 from <code>architectureV2.html</code>, scored against{' '}
          <code>agent-workflow/progress.json</code> and the live tree. These landed{' '}
          <em>inside</em> the monolith process. The packaging track (S3–S6) is further down this
          tab.
        </p>
        <Pipeline>
          {MILESTONES.map((m) => (
            <PipelineStage key={m.id} id={m.id} title={m.name} status={m.status}>
              {m.note}
            </PipelineStage>
          ))}
        </Pipeline>
        <Note tone="info">
          Acceptance floor M1–M4 is <StatusBadge status="done" />. M5 and M7 are{' '}
          <StatusBadge status="partial" /> (no OIDC UI; no Azure/Vercel). Do not re-implement M1–M4
          — they already live in <code>apps/</code> and <code>packages/</code>. Next: S5 extract
          the orchestrator image.
        </Note>
      </section>
    </>
  );
}

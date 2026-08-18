import { Note } from '@/components/ui/Note';
import { Diagram } from '@/components/ui/Diagram';
import { SequenceTable } from '@/components/ui/SequenceTable';
import { formatStepRanges, SEQ_IN_PROCESS_TODAY } from '@/data/sequence';

export function BlueprintPage() {
  return (
    <>
      <section className="section" id="tiers">
        <h2>Three tiers with one contract</h2>
        <p className="sub">Stateless intake, orchestration workers, and ephemeral execution — everything else hides behind adapters.</p>
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
          queue, object store, relational DB, and KV / secrets. Vendor SDKs stay in the cloud adapter
          layer only — never in agents.
        </Note>
        <Note tone="info">
          <strong>Why this shape:</strong> serverless can&apos;t host long-running Chromium,
          in-process Maps can&apos;t survive a restart or a second replica, and code that imports a
          vendor SDK can&apos;t move clouds. Those three constraints produced the tiers above and
          the adapter contract. Per-provider wiring:{' '}
          <a href="#deploy-cloud">Deployment → Cloud</a>.
        </Note>
      </section>

      <section className="section" id="blueprint">
        <h2>Deployment picture · cloud-agnostic</h2>
        <p className="sub">
          One picture. Provider names appear only in the adapter tier; see{' '}
          <a href="#deploy-cloud">Deployment → Cloud</a> for per-provider wiring.
        </p>
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
          One run, 36 numbered hops, four phases. The rule that shapes all of it: no two services
          hand work to each other in memory. Every hop crosses Postgres, the object store, the
          event bus, Redis, or the secrets manager, so any service can restart or scale out without
          losing the run.
        </p>
        <SequenceTable />
        <Note tone="info">
          <strong>Read it as four questions.</strong> Who accepted the work and made it durable
          (A) · who decided what to test (B) · who actually drove a browser (C) · who assembled
          the answer and handed it back (D). Kill any single service mid-run and the next phase
          can still rebuild its context from Postgres and the object store.
        </Note>
        <Note tone="warn">
          <strong>Today:</strong> under the default <code>ZERO_CLOUD=local</code>, steps{' '}
          {formatStepRanges(SEQ_IN_PROCESS_TODAY)} execute <em>inside one process</em> — the
          boundaries are function calls through <code>@zero/cloud</code>, not network hops. The
          orchestrator hop is a real process boundary, and switching <code>ZERO_CLOUD</code> to{' '}
          <code>aws</code>, <code>gcp</code>, <code>azure</code>, or <code>vercel</code> makes the
          rest real without touching agent code.
        </Note>
      </section>
    </>
  );
}

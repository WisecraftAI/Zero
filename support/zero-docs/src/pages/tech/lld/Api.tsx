import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import { Mermaid } from '@/components/ui/Mermaid';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { Note } from '@/components/ui/Note';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
import { API_CREATE_SEQUENCE_MERMAID } from '@/data/diagrams';
import styles from './Lld.module.scss';

export function LldApi() {
  return (
    <>
      <h3 className={styles.subhead}>HTTP API · Express intake</h3>
      <RepoIdentity id="api" />
      <p className={styles.purpose}>
        Terminate HTTP, validate, persist metadata, presign uploads, publish to the queue, stream
        state. Chromium is not in this package. Routes are already split.
      </p>

      <Honesty
        worksTitle="on disk now (services/api/)"
        stubTitle="remaining API debt"
        works={[
          { label: 'Route modules', detail: <>under <code>services/api/src/routes/</code> (runs, recordings, locators, settings, cms, keys, health, spa)</> },
          { label: 'No playwright dependency', detail: <>removed from <code>@zero/api</code>; <code>server.js</code> does not call <code>chromium.launch</code></> },
          { label: 'helmet, rate-limit, cors, morgan', detail: <>via <code>services/api/middleware.js</code></> },
          { label: 'Swagger UI', detail: <>at <code>/api-docs</code> — real OpenAPI spec</> },
          { label: 'Winston', detail: <>structured logs → <code>dist/logs/</code></> },
          { label: 'Multer', detail: 'multipart upload' },
          { label: 'PDF via pdfkit, XLSX via xlsx', detail: 'artifacts render correctly' },
          { label: 'Postgres (M1)', detail: <>upserts <code>qa_runs</code> / <code>qa_assets</code> via <code>@zero/db</code></> },
        ]}
        stub={[
          { label: 'No dedicated services/api/Dockerfile', detail: 'root Dockerfile is the API image (node:20, no Chromium)' },
          { label: 'Large composition file', detail: <><code>server.js</code> still owns intake persistence and route wiring, but no worker code</> },
          { label: 'Multipart still accepted', detail: 'legacy POST /api/runs streams files; JSON + uploads[] is the M2 path' },
          { label: 'Local auth default off', detail: <>set <code>ZERO_AUTH=on</code> + <code>ZERO_API_KEYS</code> to require verified identity</> },
          { label: 'SSE unused by UI', detail: <>endpoint exists at <code>/api/runs/:id/stream</code>; Web UI still polls</> },
        ]}
      />

      <h3>Module map</h3>
      <p className={styles.purpose}>On disk now: <code>services/api/server.js</code> composition root plus <code>src/routes/</code>. Chromium is not launched here.</p>
      <Diagram ariaLabel="api module map">
{`services/api/
├─ Dockerfile                    node:20-alpine, ~180 MB, non-root
└─ src/
   ├─ server.js                  ~80 lines: config → wireDeps → app.listen
   ├─ config.js                  zod.parse(process.env), frozen export
   ├─ deps.js                    build cloud bundle, db pool, logger, once
   ├─ http/
   │  ├─ middleware.js           requestId · helmet · cors · rateLimit · logger
   │  ├─ errorHandler.js         maps typed errors → { code, message, requestId }
   │  ├─ auth.js                 OIDC verifier (jose) · attaches req.user
   │  └─ validate.js             zod schema → 400 with field errors
   ├─ routes/
   │  ├─ runs.js                 POST · GET · GET /:id · download · rerun-failed
   │  ├─ stream.js               GET /:id/stream (SSE, subscribes cache)
   │  ├─ locators.js             GET · POST /element-log
   │  ├─ recordings.js           create · put · list · delete
   │  ├─ cms.js                  capture-cms-screenshot(-bulk)
   │  ├─ provider-keys.js        list · put · delete   now actually used by orch
   │  ├─ agent-settings.js       CRUD                  now actually used by orch
   │  └─ health.js               /health · /ready
   └─ sse/
      └─ hub.js                  cache.subscribe(state.<runId>) → SSE fan-out`}
      </Diagram>

      <h3>Data touched</h3>
      <ProvidersTable
        headers={['Store', 'Key / table', 'Operations']}
        rows={[
          ['Postgres',     <><code>qa_runs</code></>,           'INSERT (queued), SELECT, UPDATE status'],
          ['Postgres',     <><code>qa_assets</code></>,          'INSERT (metadata + object key)'],
          ['Postgres',     <><code>element_locators</code></>,   'SELECT by host (locator lookup)'],
          ['Postgres',     <><code>provider_keys</code></>,      'SELECT / INSERT (encrypted at rest)'],
          ['Object store', <><code>runs/&lt;id&gt;/inputs/*</code></>, 'presignPut'],
          ['Object store', <><code>runs/&lt;id&gt;/reports/*</code></>,'presignGet (302 signed url on download)'],
          ['Queue',        <><code>runs.requested</code></>,     'publish { runId, tenantId, traceparent }'],
          ['Cache',        <><code>state.&lt;runId&gt;</code></>,     'subscribe (SSE)'],
        ]}
      />

      <h3>Key sequence · POST /runs</h3>
      <Mermaid ariaLabel="api create-run sequence" chart={API_CREATE_SEQUENCE_MERMAID} />

      <Note tone="info">
        <strong>Outbox pattern:</strong> INSERT <code>qa_runs</code> + INSERT{' '}
        <code>outbox_events</code> in the same transaction. A background poller publishes and
        marks published. Guarantees "if we accepted the run, the queue has it" — no distributed
        transactions.
      </Note>

      <h3>Config &amp; failure</h3>
      <ul className={styles.list}>
        <li>
          <strong>Config:</strong> <code>PORT · DATABASE_URL · ZERO_CLOUD · OIDC_ISSUER · OIDC_AUDIENCE · KEY_ENC_SECRET · MAX_UPLOAD_BYTES · RATE_LIMIT_PER_MIN</code>.
        </li>
        <li><strong>Refuse to boot:</strong> when <code>KEY_ENC_SECRET</code> is the dev default in <code>NODE_ENV=production</code>.</li>
        <li><strong>Queue down:</strong> 503 to client; do <em>not</em> leave a row without an outbox event.</li>
        <li><strong>DB down:</strong> <code>/ready</code> red; LB drains; liveness stays green.</li>
      </ul>
    </>
  );
}

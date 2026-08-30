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
        state. Chromium is not in this package. S7 dropped the <code>/api</code> prefix — routes are
        native on <code>:3001</code>.
      </p>

      <Honesty
        worksTitle="on disk now (services/api/)"
        stubTitle="remaining API debt"
        works={[
          { label: 'Route modules', detail: <>under <code>services/api/src/routes/</code> (runs, recordings, locators, settings, cms, keys, health)</> },
          { label: 'No playwright dependency', detail: <>removed from <code>@zero/api</code>; <code>server.js</code> does not call <code>chromium.launch</code></> },
          { label: 'No SPA in API image', detail: <>S7: nginx <code>zero-web</code> serves <code>dist/web/</code>; API is HTTP-only</> },
          { label: 'helmet, rate-limit, cors, morgan', detail: <>via <code>services/api/middleware.js</code></> },
          { label: 'Swagger UI', detail: <>at <code>/api-docs</code> — OpenAPI name, not a path prefix</> },
          { label: 'Winston', detail: <>structured logs → <code>dist/logs/</code></> },
          { label: 'Multer + JSON uploads[]', detail: 'legacy multipart still accepted; M2 presign path preferred' },
          { label: 'SSE', detail: <> <code>GET /runs/:id/stream</code> in <code>runs.js</code>; UI uses EventSource</> },
          { label: 'Themed PDF report', detail: <>pdfkit in <code>src/reports/</code>; <code>releaseGate</code> bands pass rate at 95 / 85; <code>?theme=</code> and <code>?paper=light</code></> },
          { label: 'Postgres (M1)', detail: <>upserts <code>qa_runs</code> / <code>qa_assets</code> via <code>@zero/db</code></> },
        ]}
        stub={[
          { label: 'Composition root still large', detail: <><code>server.js</code> owns intake persistence and route wiring</> },
          { label: 'No transactional outbox', detail: 'publish happens after persist; no outbox_events table' },
          { label: 'Local auth default off', detail: <>set <code>ZERO_AUTH=on</code> + <code>ZERO_API_KEYS</code> to require verified identity</> },
          { label: 'enableSecurity not parsed', detail: 'UI checkbox exists; runs.js only maps enableAccessibility / enablePerformance' },
          { label: 'No /ready endpoint', detail: <>liveness is <code>/health</code> · detailed is <code>/health/detailed</code></> },
        ]}
      />

      <h3>Module map</h3>
      <p className={styles.purpose}>
        On disk now: <code>services/api/server.js</code> composition root plus{' '}
        <code>src/routes/</code> and <code>src/reports/</code>. Chromium is not launched here.
      </p>
      <Diagram ariaLabel="api module map">
{`services/api/
├─ server.js                     composition root · app.listen(PORT||3001)
├─ middleware.js                 requestId · helmet · cors · rateLimit · logger
├─ auth.js                       API key / JWT · attaches req.user
├─ swagger.js                    /api-docs
├─ logger.js · encryption.js · apiKeyManager.js
└─ src/
   ├─ reports/                   pdfTheme · runPdfReport (releaseGate) · pdfKit
   └─ routes/
      ├─ runs.js                 POST · GET · GET /:id · stream · download · commit · stop · rerun-failed
      ├─ locators.js             GET · POST /element-log
      ├─ recordings.js           create · put · list · delete
      ├─ cms.js                  capture-cms-screenshot(-bulk)
      ├─ keys.js                 provider-keys
      ├─ settings.js             agent-settings
      └─ health.js               /health · /health/detailed

# cloud routes mount from @zero/cloud:
# GET|PUT /cloud/local`}
      </Diagram>

      <h3>Data touched</h3>
      <ProvidersTable
        headers={['Store', 'Key / table', 'Operations']}
        rows={[
          ['Postgres',     <><code>qa_runs</code></>,           'INSERT (queued), SELECT, UPDATE status'],
          ['Postgres',     <><code>qa_assets</code></>,          'INSERT (metadata + object key)'],
          ['Postgres',     <><code>element_locators</code></>,   'SELECT by host (locator lookup)'],
          ['Postgres',     <><code>provider_keys</code></>,      'SELECT / INSERT (encrypted at rest)'],
          ['Postgres',     <><code>agent_memory</code></>,       'read/write is orchestrator; API does not mutate'],
          ['Object store', <><code>runs/&lt;id&gt;/inputs/*</code></>, 'presignPut'],
          ['Object store', <><code>runs/&lt;id&gt;/reports/*</code></>,'presignGet (signed url on download)'],
          ['Queue',        <><code>runs.requested</code></>,     'publish { runId, tenantId, traceparent }'],
          ['Cache',        <><code>state.&lt;runId&gt;</code></>,     'subscribe (SSE)'],
        ]}
      />

      <h3>Key sequence · POST /runs</h3>
      <Mermaid ariaLabel="api create-run sequence" chart={API_CREATE_SEQUENCE_MERMAID} />

      <Note tone="warn">
        <strong>Outbox is target, not shipped:</strong> today the API upserts <code>qa_runs</code>{' '}
        then publishes <code>runs.requested</code>. A transactional{' '}
        <code>outbox_events</code> table + poller is still a gap — a crash between persist and
        publish can leave a queued row without a message.
      </Note>

      <h3>Config &amp; failure</h3>
      <ul className={styles.list}>
        <li>
          <strong>Config:</strong> <code>PORT · DATABASE_URL · ZERO_CLOUD · ZERO_AUTH · ZERO_API_KEYS · KEY_ENC_SECRET · MAX_UPLOAD_BYTES · RATE_LIMIT_PER_MIN</code>.
        </li>
        <li><strong>Refuse to boot:</strong> when <code>KEY_ENC_SECRET</code> is missing in <code>NODE_ENV=production</code>.</li>
        <li><strong>Queue down:</strong> publish may fail after the row exists — no outbox retry yet.</li>
        <li><strong>DB down:</strong> falls back to memory + <code>dist/artifacts/</code>; <code>/health/detailed</code> reports reachability.</li>
      </ul>
    </>
  );
}

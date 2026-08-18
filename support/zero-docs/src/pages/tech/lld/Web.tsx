import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import { Mermaid } from '@/components/ui/Mermaid';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
import { WEB_START_SEQUENCE_MERMAID } from '@/data/diagrams';
import styles from './Lld.module.scss';

export function LldWeb() {
  return (
    <>
      <h3 className={styles.subhead}>Web UI · React 18 + Vite</h3>
      <RepoIdentity id="web" />
      <p className={styles.purpose}>
        Presentation and form validation. Never holds business rules, never proxies artifact
        bytes, never sees a secret.
      </p>

      <Honesty
        worksTitle="works today (web/src/)"
        stubTitle="UI present · backend not wired"
        works={[
          { label: 'DashboardView', detail: <>lists past runs from <code>/api/runs</code></> },
          { label: 'NewRunView', detail: <>multipart submit to <code>/api/runs</code></> },
          { label: 'RunDetailView', detail: <>polls <code>/api/runs/:id</code></> },
          { label: 'PipelineFlow / PipelineStatus', detail: <>renders <code>stageKeys</code></> },
          { label: 'CmsScreenshotCapture', detail: 'Stream-tab bulk capture flow' },
          { label: 'ApiKeysView / AgentsView', detail: 'saves keys + settings; @zero/orchestrator/llm reads them when present' },
          { label: 'Vite dev proxy → :3000', detail: <>builds to <code>dist/web/</code></> },
        ]}
        stub={[
          { label: 'No SSE in the client', detail: <>endpoint exists; UI still polls <code>/api/runs/:id</code></> },
          { label: 'No login screen', detail: 'M5 API keys / JWT work; no OIDC UI' },
          { label: 'IntegrationsView', detail: 'placeholder; no backend' },
          { label: 'data/ hooks', detail: 'useRunStream / useUpload not created — still fetch in views' },
          { label: 'nginx image', detail: <>folder <code>web/</code> exists (S2); nginx image is S5</> },
        ]}
      />

      <h3>Module map</h3>
      <Diagram ariaLabel="web module map">
{`web/
├─ nginx.conf                 /       → index.html (SPA)
│                             /api/*  → api:3000 (proxy_pass)
│                             /health → 200
├─ vite.config.js             build → dist/ · dev proxy :3000
└─ src/
   ├─ main.jsx                bootstraps <App/>
   ├─ App.jsx                 router
   ├─ layouts/AppShell.jsx    Topbar · Sidebar · outlet
   ├─ data/                   new in V3 — one hook per endpoint
   │  ├─ useRuns.ts           GET /api/runs (react-query)
   │  ├─ useRun.ts            GET /api/runs/:id
   │  ├─ useRunStream.ts      EventSource /api/runs/:id/stream
   │  ├─ useLocators.ts       GET /api/locators
   │  └─ useUpload.ts         PUT presigned URL + progress
   ├─ components/             stateless view atoms
   └─ views/                  one folder per route, .css colocated`}
      </Diagram>

      <h3>Interface consumed</h3>
      <ul className={styles.list}>
        <li><code>POST /api/runs</code> → <code>{'{ runId, uploads: [{ field, url, key }] }'}</code>. Browser <code>PUT</code>s each file directly.</li>
        <li><code>GET /api/runs</code>, <code>GET /api/runs/:id</code>, <code>GET /api/runs/:id/download</code></li>
        <li><code>GET /api/runs/:id/stream</code> — SSE events: <code>state</code>, <code>artifact</code>, <code>done</code>, <code>error</code></li>
        <li><code>GET /api/locators?host=</code>, <code>POST /api/element-log</code>, <code>/api/provider-keys</code>, <code>/api/agent-settings</code></li>
      </ul>

      <h3>Key sequence · start a run</h3>
      <Mermaid ariaLabel="web sequence for new run" chart={WEB_START_SEQUENCE_MERMAID} />

      <h3>Config &amp; failure</h3>
      <ul className={styles.list}>
        <li><strong>Config:</strong> <code>VITE_API_BASE</code> (empty = same origin via nginx).</li>
        <li><strong>Uploads:</strong> exponential backoff, give up after 3; per-file inline error.</li>
        <li><strong>SSE:</strong> auto-reconnect with jittered backoff; degrade to 3 s polling after 2 fails.</li>
        <li><strong>Auth:</strong> refresh on 401; redirect to login on 403.</li>
      </ul>
    </>
  );
}

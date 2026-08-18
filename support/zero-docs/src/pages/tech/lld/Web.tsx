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
        bytes, never sees a secret. Under S7 the SPA and API are separate origins.
      </p>

      <Honesty
        worksTitle="works today (web/src/)"
        stubTitle="UI present · backend not wired"
        works={[
          { label: 'DashboardView', detail: <>lists past runs from <code>/runs</code></> },
          { label: 'NewRunView / RunForm', detail: <>multipart or JSON submit to <code>/runs</code></> },
          { label: 'RunDetailView + useRunStream', detail: <>SSE <code>/runs/:id/stream</code>; 3s poll fallback after failures</> },
          { label: 'PipelineFlow / PipelineStatus', detail: <>renders <code>stageKeys</code></> },
          { label: 'CmsScreenshotCapture', detail: 'Stream-tab bulk capture flow' },
          { label: 'ApiKeysView / AgentsView', detail: 'saves keys + settings; @zero/orchestrator/llm reads them when present' },
          { label: 'apiBase.js', detail: <>absolute URLs via <code>VITE_API_BASE_URL</code> (default <code>:3001</code>)</> },
        ]}
        stub={[
          { label: 'No login screen', detail: 'M5 API keys / JWT work; no OIDC UI' },
          { label: 'IntegrationsView', detail: 'placeholder; no backend' },
          { label: 'enableSecurity checkbox', detail: 'UI sends the field; API intake does not parse it yet (a11y/perf do)' },
          { label: 'TypeScript hooks', detail: 'data layer is .js (useRunStream.js), not react-query .ts' },
        ]}
      />

      <h3>Module map</h3>
      <Diagram ariaLabel="web module map">
{`web/
├─ nginx.conf                 listen 3000 · static SPA only (no /api proxy)
│                             /health → 200
│                             /assets/* → long-cache · SPA fallback → index.html
├─ Dockerfile                 build Vite with VITE_API_BASE_URL → nginx image
├─ vite.config.js             build → dist/web/ · no API proxy (cross-origin fetch)
├─ src/
│  ├─ main.jsx                bootstraps <App/>
│  ├─ App.jsx                 router + useRunStream wiring
│  ├─ apiBase.js              VITE_API_BASE_URL → http://localhost:3001
│  ├─ layouts/AppShell.jsx    Topbar · Sidebar · outlet
│  ├─ data/
│  │  ├─ useRunStream.js      EventSource /runs/:id/stream + poll fallback
│  │  └─ runStream.js         SSE helpers
│  ├─ components/             RunForm · Pipeline* · TabContent …
│  └─ views/                  Dashboard · NewRun · RunDetail · Keys · Agents`}
      </Diagram>

      <h3>Interface consumed</h3>
      <ul className={styles.list}>
        <li><code>POST /runs</code> → <code>{'{ runId, uploads: [{ field, url, key }] }'}</code> (202). Browser <code>PUT</code>s each file directly.</li>
        <li><code>GET /runs</code>, <code>GET /runs/:id</code>, <code>GET /runs/:id/download</code></li>
        <li><code>GET /runs/:id/stream</code> — SSE events: <code>state</code>, <code>artifact</code>, <code>done</code>, <code>error</code></li>
        <li><code>GET /locators?host=</code>, <code>POST /element-log</code>, <code>/provider-keys</code>, <code>/agent-settings</code></li>
      </ul>

      <h3>Key sequence · start a run</h3>
      <Mermaid ariaLabel="web sequence for new run" chart={WEB_START_SEQUENCE_MERMAID} />

      <h3>Config &amp; failure</h3>
      <ul className={styles.list}>
        <li><strong>Config:</strong> <code>VITE_API_BASE_URL</code> (baked at build; Compose default <code>http://localhost:3001</code>).</li>
        <li><strong>Uploads:</strong> exponential backoff, give up after 3; per-file inline error.</li>
        <li><strong>SSE:</strong> EventSource primary; degrade to 3 s polling after 2 fails (<code>useRunStream.js</code>).</li>
        <li><strong>Auth:</strong> API key / JWT headers when <code>ZERO_AUTH=on</code>; no browser login screen yet.</li>
      </ul>
    </>
  );
}

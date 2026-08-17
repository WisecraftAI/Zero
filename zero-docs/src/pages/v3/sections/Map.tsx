import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { Note } from '@/components/ui/Note';

export function MoveMap() {
  return (
    <section className="section" id="v3-map">
      <h2>Where code lives now · what S5 still extracts</h2>
      <p className="sub">
        S4 moved Chromium into the Playwright executor image. Remaining work is giving the
        Orchestrator worker its own image.
      </p>

      <ProvidersTable
        caption="Folder, npm package, and Cursor skill are three names for one workspace."
        headers={['On disk now', 'Workspace', 'npm package', 'Cursor skill', 'Still to extract']}
        rows={[
          [<><code key="api-now">apps/api/src/routes/</code></>, 'HTTP API', <code key="api-pkg">@zero/api</code>, '/zero-api', 'no Chromium (done)'],
          [<><code key="orch-now">apps/orchestrator/processRun.js</code></>, 'Orchestrator worker', <code key="orch-pkg">@zero/orchestrator</code>, '/zero-orchestrator', 'own image · dag.js'],
          ['BA · Manual · Automation · Manager · Delivery', 'Orchestrator worker', <code key="orch-agents">@zero/orchestrator</code>, '/zero-orchestrator', 'apps/orchestrator/src/agents/'],
          [<><code key="exec-now">apps/executor/main.js</code></>, 'Playwright executor', <code key="exec-pkg">@zero/executor</code>, '/zero-executor', 'own image (done)'],
          ['a11y / perf / security passes', 'Playwright executor', <code key="exec-pass">@zero/executor</code>, '/zero-executor', 'apps/executor/src/passes/'],
          [<><code key="dom-now">packages/domain/index.js</code></>, 'Domain contracts', <code key="dom-pkg">@zero/domain</code>, '/zero-domain', 'zod schemas'],
          [<><code key="loc-now">packages/locators/</code></>, 'Locator registry', <code key="loc-pkg">@zero/locators</code>, '/zero-locators', 'persist learned selectors'],
          [<><code key="bld-now">packages/builders/</code></>, 'Script builders', <code key="bld-pkg">@zero/builders</code>, '/zero-builders', 'snapshot suite'],
          [<><code key="an-now">packages/analyzer/</code></>, 'URL analyzer', <code key="an-pkg">@zero/analyzer</code>, '/zero-analyzer', 'stop launching from HTTP API'],
          [<><code key="db-now">packages/db/index.js</code></>, 'Postgres helpers', <code key="db-pkg">@zero/db</code>, '/zero-db', 'migrations/ + migrate CLI'],
          [<><code key="cld-now">packages/cloud/</code></>, 'Cloud adapters', <code key="cld-pkg">@zero/cloud</code>, '/zero-cloud', 'Azure / Vercel · GATE-9'],
          [<><code key="web-now">web/src/</code></>, 'Web UI', <code key="web-pkg">@zero/web</code>, '/zero-web', 'nginx image · SSE hook'],
          [<><code key="art-now">artifacts/&lt;runId&gt;/</code></>, '—', '—', '—', <>object store bucket <code key="art-bkt">zero-artifacts</code></>],
        ]}
      />

      <Note tone="warn">
        <strong>Do not split images and refactor behavior in the same commit.</strong> S4 gave
        Playwright its own image. S5 extracts the orchestrator process — keep Chromium out of the
        HTTP API.
      </Note>
    </section>
  );
}

import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { Note } from '@/components/ui/Note';

export function MoveMap() {
  return (
    <section className="section" id="v3-map">
      <h2>Where today&apos;s code moves</h2>
      <p className="sub">Every current file has exactly one destination. Nothing is rewritten in the move.</p>

      <ProvidersTable
        headers={['Today', 'V3 destination', 'Runs in']}
        rows={[
          [<><code>46 app.get/post handlers</code></>,     'apps/api/src/routes/*',        'api'],
          [<><code>processRun</code> + stage walk</>,      'apps/orchestrator/src/dag.js', 'orchestrator'],
          ['BA · Manual · Automation agents',              'apps/orchestrator/src/agents/', 'orchestrator'],
          ['Manager · Delivery + pdfkit',                  'apps/orchestrator/src/agents/', 'orchestrator'],
          [<><code>chromium.launch()</code> + retries</>,  'apps/executor/src/worker.js',  'executor'],
          ['a11y / perf / security passes',                'apps/executor/src/passes/',    'executor'],
          [<><code>stageKeys, appProfiles</code></>,       'packages/domain',              'shared'],
          [<><code>lib/locatorRegistry</code></>,          'packages/locators',            'shared'],
          [<><code>lib/scriptBuilder + javaSelenium…</code></>, 'packages/builders',       'shared'],
          [<><code>lib/urlAnalyzer(Pro)</code></>,         'packages/analyzer',            'orchestrator'],
          [<><code>lib/db.js</code></>,                    'packages/db + migrations/',    'shared'],
          [<><code>lib/cloud/*</code></>,                  'packages/cloud (contract unchanged)', 'shared'],
          [<><code>lib/middleware, logger, swagger</code></>, 'apps/api/src/http/',        'api'],
          [<><code>client/</code></>,                      'web/',                         'nginx'],
          [<><code>artifacts/&lt;runId&gt;/</code></>,        <>object store bucket <code>zero-artifacts</code></>, '—'],
          [<>in-memory <code>runs</code> Map</>,             <>Postgres <code>qa_runs</code> + Redis</>, '—'],
          [<><code>runSecrets</code> Map</>,                  'secrets adapter (never on disk)', '—'],
        ]}
      />

      <Note tone="danger">
        <strong>Do not move and refactor in the same commit.</strong> Move files, fix imports,
        prove the stack boots, then change behavior. With zero test suite today, a simultaneous
        move-and-rewrite has nothing to catch regressions.
      </Note>
    </section>
  );
}

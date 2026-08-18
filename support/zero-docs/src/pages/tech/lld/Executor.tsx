import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import { Mermaid } from '@/components/ui/Mermaid';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
import { EXEC_BATCH_SEQUENCE_MERMAID } from '@/data/diagrams';
import styles from './Lld.module.scss';

export function LldExecutor() {
  return (
    <>
      <h3 className={styles.subhead}>Playwright executor · ephemeral job</h3>
      <RepoIdentity id="executor" />
      <p className={styles.purpose}>
        One browser context per job. Uploads screenshots + traces. Upserts learned selectors.
        Nothing else.
      </p>

      <Honesty
        worksTitle="on disk now (services/executor/)"
        stubTitle="the single biggest scale risk"
        works={[
          { label: <><code>playwright.chromium.launch</code></>, detail: <>with <code>--no-sandbox --disable-dev-shm-usage</code> in <code>services/executor/</code></> },
          { label: 'Own Playwright image', detail: <>compose <code>executor</code> · <code>services/executor/Dockerfile</code> · <code>shm_size: 1gb</code> · base v1.58.2</> },
          { label: 'Standalone worker', detail: <><code>main.js</code> consumes <code>execution.requested</code> without requiring the HTTP API</> },
          { label: 'Minimal mode', detail: 'URL load + body wait + screenshot (reliable)' },
          { label: 'discovered_flows / full', detail: 'crawl-derived multi-step flows; full keyword/selector nav (brittle)' },
          { label: 'a11y / perf / security / analyzer', detail: 'same worker, job.kind on the queue' },
          { label: 'Locator upsert', detail: 'writes element_locators when Postgres is configured' },
        ]}
        stub={[
          { label: 'Local compatibility launcher', detail: <><code>npm run start:all</code> deliberately co-locates services; <code>npm start</code> is API-only</> },
          { label: 'Flat module layout', detail: 'jobs live in jobs.js / browser.js — not yet split into src/passes/' },
          { label: 'Memory hot path when DB off', detail: 'process Map for learned selectors; Postgres upsert when DATABASE_URL is set' },
        ]}
      />

      <h3>Module map</h3>
      <p className={styles.purpose}>
        On disk now: flat layout — <code>services/executor/Dockerfile</code>, <code>main.js</code>{' '}
        (no HTTP), <code>worker.js</code>, <code>jobs.js</code>, <code>browser.js</code>,{' '}
        <code>cmsCapture.js</code>.
      </p>
      <Diagram ariaLabel="executor module map">
{`services/executor/
├─ Dockerfile                    mcr.../playwright:v1.58.2-jammy · pwuser
├─ main.js                       boot · queue.subscribe('execution.requested')
├─ worker.js                     concurrency / attempt caps
├─ jobs.js                       run kinds: execution · a11y · perf · security · analyzer
├─ browser.js                    launch flags, per-job context factory
└─ cmsCapture.js                 CMS Stream screenshot helpers`}
      </Diagram>

      <h3>Key sequence · one TC batch</h3>
      <Mermaid ariaLabel="executor per-batch sequence" chart={EXEC_BATCH_SEQUENCE_MERMAID} />

      <h3>Timeouts, isolation, sizing</h3>
      <ul className={styles.list}>
        <li><strong>Per-step timeout:</strong> <code>page.setDefaultTimeout(30000)</code>.</li>
        <li><strong>Per-job budget:</strong> <code>5 min</code>. Exceeded → screenshot, mark failed, close context.</li>
        <li><strong>Queue visibility:</strong> 6 min (job budget + slack). Prevents redelivery mid-run.</li>
        <li><strong>Retry:</strong> queue redrives once on crash; DLQ on second failure.</li>
        <li><strong>Isolation:</strong> new <code>browserContext</code> per job — no cookie / storage leak across tenants.</li>
        <li><strong>Node sizing:</strong> 1 vCPU + 2 GB RAM + 1 GB <code>/dev/shm</code> per concurrent job.</li>
      </ul>
    </>
  );
}

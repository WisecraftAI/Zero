import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
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
        worksTitle="on disk now (apps/executor/)"
        stubTitle="the single biggest scale risk"
        works={[
          { label: <><code>playwright.chromium.launch</code></>, detail: <>with <code>--no-sandbox --disable-dev-shm-usage</code> in <code>apps/executor/</code></> },
          { label: 'Own Playwright image', detail: <>compose <code>executor</code> · <code>apps/executor/Dockerfile</code> · <code>shm_size: 1gb</code></> },
          { label: 'Standalone worker', detail: <><code>main.js</code> consumes <code>execution.requested</code> without requiring the HTTP API</> },
          { label: 'Minimal mode', detail: 'URL load + body wait + screenshot (reliable)' },
          { label: 'Full mode', detail: 'keyword/selector navigation (brittle)' },
          { label: 'a11y / perf / security / analyzer', detail: 'same worker, job.kind on the queue' },
        ]}
        stub={[
          { label: 'npm start still co-locates Chromium', detail: 'in-process worker unless SKIP_EXECUTION_WORKER=1 (compose sets this)' },
          { label: 'Optional passes not split into src/passes/', detail: 'still functions inside jobs.js' },
          { label: 'Selectors still memory-first', detail: 'DB upsert exists; process Map is still the hot path' },
        ]}
      />

      <h3>Module map</h3>
      <p className={styles.purpose}>On disk now: <code>apps/executor/Dockerfile</code>, <code>main.js</code> (no HTTP), <code>jobs.js</code>, <code>worker.js</code>.</p>
      <Diagram ariaLabel="executor module map">
{`apps/executor/
├─ Dockerfile                    mcr.../playwright:v1.52-jammy · pwuser · shm 1g
└─ src/
   ├─ worker.js                  queue.subscribe('execution.requested', runJob)
   ├─ config.js                  MAX_CONCURRENT_JOBS · timeouts
   ├─ semaphore.js               await-based slot manager
   ├─ runJob.js                  new context → play steps → upload → publish completed
   ├─ browser.js                 launch flags, per-job context factory
   ├─ steps/
   │  ├─ navigate.js · click.js · type.js · waitFor.js · screenshot.js
   │  └─ trace.js                start/stop tracing per step
   ├─ passes/
   │  ├─ accessibility.js        @axe-core/playwright
   │  ├─ performance.js          coverage + web vitals
   │  └─ security.js             headers · cookies · content heuristics
   └─ locators/
      └─ upsert.js               batch INSERT ON CONFLICT into element_locators`}
      </Diagram>

      <h3>Key sequence · one TC batch</h3>
      <Diagram ariaLabel="executor per-batch sequence">
{` queue         runJob         semaphore       secrets    chromium   objectStore
   │             │               │               │           │            │
   │─ exec.req ─▶│               │               │           │            │
   │             │─ acquire ────▶│               │           │            │
   │             │  ◀── slot      │              │           │            │
   │             │─ pull login secret ─────────▶ │           │            │
   │             │  ◀── secret                   │           │            │
   │             │─ launchCtx ─────────────────────────────▶ │            │
   │             │─ loop TCs: play, screenshot, put ────────────────────▶ │
   │             │─ learned selectors upsert                              │
   │             │─ closeCtx                                              │
   │             │─ release ────▶│                                        │
   │             │─ publish execution.completed`}
      </Diagram>

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

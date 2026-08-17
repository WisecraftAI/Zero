import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import styles from './Lld.module.scss';

export function LldExecutor() {
  return (
    <>
      <h3 className={styles.subhead}>executor · ephemeral Playwright job</h3>
      <p className={styles.purpose}>
        One browser context per job. Uploads screenshots + traces. Upserts learned selectors.
        Nothing else.
      </p>

      <Honesty
        worksTitle="works today (server.js inline)"
        stubTitle="the single biggest scale risk"
        works={[
          { label: <><code>playwright.chromium.launch</code></>, detail: <>with <code>--no-sandbox --disable-dev-shm-usage</code></> },
          { label: 'Minimal mode', detail: 'URL load + body wait + screenshot (reliable)' },
          { label: 'Full mode', detail: 'keyword/selector navigation (brittle)' },
          { label: 'Screenshots per step', detail: <>→ <code>artifacts/&lt;runId&gt;/</code></> },
          { label: 'Learned selectors', detail: <>collected in <code>selectorMemory</code> Map</> },
          { label: 'a11y / perf / security passes', detail: 'run in-process' },
        ]}
        stub={[
          { label: 'Local worker is co-located', detail: 'execution.requested is in-process until a shared queue (M7)' },
          { label: 'Optional passes still inline', detail: 'a11y / perf / security still launch Chromium from the orchestrator' },
          { label: 'Local disk', detail: 'artifacts on filesystem, not shareable across replicas' },
          { label: 'Selectors lost on restart', detail: 'Map only' },
          { label: 'Serverless-hostile', detail: 'Vercel functions kill long browser work' },
          { label: 'No trace upload', detail: 'Playwright traces stay local' },
        ]}
      />

      <h3>Module map</h3>
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

import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import styles from './Lld.module.scss';

export function LldLibs() {
  return (
    <>
      <h3 className={styles.subhead}>
        shared libraries · domain · db · locators · builders · analyzer
      </h3>
      <p className={styles.purpose}>
        Pure code shared by <code>apps/*</code>. Zero HTTP, zero browsers, zero SDKs. If it
        imports Express or Playwright, it&apos;s in the wrong package.
      </p>

      <h3>packages/domain</h3>
      <p className={styles.purpose}>Contracts, enums, zod schemas. The lingua franca between apps.</p>
      <Honesty
        works={[
          { label: <><code>stageKeys</code></>,   detail: <>in <code>server.js</code></> },
          { label: <><code>appProfiles</code></>, detail: 'Gray · TVNZ+ · Aha · Hotstar · PrimeVideo · Generic' },
          { label: 'Ad-hoc shapes',               detail: 'for run, artifact, TC' },
        ]}
        stubTitle="V3 adds"
        stub={[
          { label: 'zod schemas', detail: <><code>RunInput</code> · <code>RunState</code> · <code>Artifact</code> · <code>TestCase</code> · <code>ExecutionBatch</code></> },
          { label: <><code>errors.js</code></>, detail: <>ValidationError · NotFound · Conflict · InternalError</> },
          { label: <><code>ids.js</code></>,    detail: <>runId · batchId · tenantId constructors + validators</> },
        ]}
      />

      <h3>packages/db</h3>
      <p className={styles.purpose}>Postgres pool + versioned migrations. The one place that knows table names.</p>
      <Honesty
        works={[
          { label: 'Schema constants', detail: <>for <code>qa_runs · qa_assets · element_locators · element_logs · projects · stored_scripts · recordings · provider_keys · agent_settings</code></> },
          { label: 'pg pool + initAllTables',  detail: 'runs when DATABASE_URL / PGHOST is set' },
          { label: 'upsertRun / replaceAssets', detail: 'M1 persist path; passwords stripped' },
        ]}
        stubTitle="V3 still needs"
        stub={[
          { label: 'Adds', detail: <><code>outbox_events</code> (M3)</> },
          { label: <><code>migrations/</code></>, detail: 'SQL files, versioned, forward + reversible' },
          { label: 'migrate CLI', detail: 'up · down · status · create (used by compose migrate service)' },
        ]}
      />

      <h3>packages/locators</h3>
      <p className={styles.purpose}>Locator merge and element-key normalizer. Consumed by orchestrator (build) and executor (upsert learned).</p>
      <Honesty
        works={[
          { label: <><code>lib/locatorRegistry.js</code></>, detail: 'profile → memory → DB merge' },
          { label: <><code>lib/elementLogger.js</code></>,    detail: 'element key normalizer' },
          { label: <><code>lib/ecommerceSelectors.js</code></>, detail: 'selector library' },
        ]}
        stubTitle="V3 tightens"
        stub={[
          { label: 'DB merge stops being a dead branch' },
          { label: 'Learned selectors persisted', detail: <>per <code>(tenant, host, key)</code> not process memory</> },
          { label: 'Confidence score decay', detail: 'on repeated misses' },
        ]}
      />

      <h3>packages/builders</h3>
      <p className={styles.purpose}>Emits Playwright spec + Java/Selenium class as text. Pure — same input, same output. Snapshot tested.</p>
      <Honesty
        works={[
          { label: <><code>lib/scriptBuilder.js</code></>,       detail: 'Playwright spec text' },
          { label: <><code>lib/javaSeleniumBuilder.js</code></>, detail: 'JUnit Java class text' },
        ]}
        stubTitle="V3 adds"
        stub={[
          { label: 'Snapshot tests', detail: 'on canonical TC inputs (prevent silent regressions)' },
          { label: 'Emitters accept a ctx', detail: 'no globals' },
          { label: 'Optional emitters', detail: 'Kotlin / TypeScript-Playwright' },
        ]}
      />

      <h3>packages/analyzer</h3>
      <p className={styles.purpose}>
        Crawlers used only by orchestrator during BA stage. Uses its own Chromium via Playwright —
        <em> a copy separate from executor&apos;s</em>.
      </p>
      <Honesty
        works={[
          { label: <><code>lib/urlAnalyzer.js</code></>,    detail: '1,069 lines · lightweight heuristics' },
          { label: <><code>lib/urlAnalyzerPro.js</code></>, detail: '2,258 lines · deep Playwright crawl' },
        ]}
        stubTitle="V3 tradeoffs"
        stub={[
          { label: 'Analyzer needs Chromium', detail: 'orchestrator becomes a heavier image, OR' },
          { label: 'Split analyzer', detail: <>own worker on <code>analysis.requested</code> — cleaner but +1 service</> },
          { label: 'Recommendation', detail: 'keep analyzer in orchestrator until traffic proves the split' },
        ]}
      />

      <h3>Cross-package rules</h3>
      <Diagram ariaLabel="cross-package rules">
{`GATE-2  no package imports from apps/*
GATE-3  only packages/cloud/{aws,gcp,azure} import vendor SDKs
—       zero I/O at import time (no connections, no processes, no env reads)
—       workspace: * pinning; breaking change bumps major before merge`}
      </Diagram>
    </>
  );
}

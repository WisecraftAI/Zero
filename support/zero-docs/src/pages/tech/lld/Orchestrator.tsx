import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import { Mermaid } from '@/components/ui/Mermaid';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
import { ORCH_SEQUENCE_MERMAID } from '@/data/diagrams';
import styles from './Lld.module.scss';

export function LldOrchestrator() {
  return (
    <>
      <h3 className={styles.subhead}>Orchestrator worker · stage DAG</h3>
      <RepoIdentity id="orchestrator" />
      <p className={styles.purpose}>
        Consume <code>runs.requested</code>, walk <code>stageKeys</code>, call agents (real LLM),
        persist artifacts, fan out to executor, aggregate, publish reports.
      </p>

      <Honesty
        worksTitle="on disk now (services/orchestrator/)"
        stubTitle="remaining worker debt"
        works={[
          { label: <><code>processRun</code></>, detail: <>walks <code>stageKeys</code> in a standalone worker process</> },
          { label: 'Own image', detail: <>workspace-scoped Node image with no Playwright dependency</> },
          { label: 'Template + LLM agents', detail: 'BA, Manual, Automation, Manager call @zero/orchestrator/llm when a key exists; templates otherwise' },
          { label: 'Locator merge', detail: 'profile → memory → Postgres when DATABASE_URL is set (@zero/locators)' },
          { label: 'Domain inference', detail: <><code>inferDomain.js</code> after Web Analyzer when confidence is low</> },
          { label: 'Script builders', detail: '@zero/builders emit Playwright spec + Java class text' },
          { label: 'URL analyzer', detail: <><code>@zero/analyzer</code> crawls and fills BRD gaps</> },
          { label: 'PDF Manager report', detail: 'pdfkit renders a real document' },
        ]}
        stub={[
          { label: 'No resume-from-crash', detail: 'no stage_progress walker; restarts can lose in-flight runs' },
          { label: 'Large pipeline module', detail: 'agent templates still share pipeline.js rather than one module per agent' },
          { label: 'No cancel API', detail: 'no PATCH /runs/:id/cancel route yet' },
        ]}
      />

      <h3>Module map</h3>
      <p className={styles.purpose}>
        On disk now: flat layout under <code>services/orchestrator/</code> —{' '}
        <code>worker.js</code>, <code>processRun.js</code>, <code>pipeline.js</code>,{' '}
        <code>inferDomain.js</code>, and <code>llm/</code>.
      </p>
      <Diagram ariaLabel="orchestrator module map">
{`services/orchestrator/
├─ Dockerfile                    Node image, no browser
├─ worker.js                     boot · queue.subscribe('runs.requested')
├─ processRun.js                 walk stageKeys · persist · fan-out execution
├─ pipeline.js                   BA · Manual · Automation · Manager · Delivery · optional passes
├─ applyLlm.js                   merge LLM output onto template base
├─ inferDomain.js                optional LLM domain when crawl confidence is low
├─ encryption.js                 decrypt provider keys for llm/
├─ index.js                      package exports
└─ llm/
   └─ index.js                   OpenAI · Claude · Gemini facade + caps (ZERO_LLM_*)`}
      </Diagram>

      <h3>Key sequence · processRun</h3>
      <Mermaid ariaLabel="orchestrator processRun sequence" chart={ORCH_SEQUENCE_MERMAID} />

      <h3>Interface</h3>
      <ul className={styles.list}>
        <li><strong>Subscribes:</strong> <code>runs.requested {'{ runId, tenantId, traceparent }'}</code>, <code>execution.completed {'{ runId, batchId, results[] }'}</code></li>
        <li><strong>Publishes:</strong> <code>execution.requested {'{ runId, batchId, tcs[], selectors, mode }'}</code></li>
        <li><strong>Cache pub/sub:</strong> <code>state.&lt;runId&gt;</code> — every stage transition; consumed by api SSE</li>
      </ul>

      <h3>Idempotency, retry, resume</h3>
      <ul className={styles.list}>
        <li><strong>Persist model:</strong> stage outputs live in <code>qa_runs.stages_json</code> (JSONB) plus artifact files — not a separate <code>(run_id, stage)</code> table.</li>
        <li><strong>Stage progress:</strong> a crash-resume walker that skips completed stages is still a gap (Honesty above).</li>
        <li><strong>Retry:</strong> queue redrives on unhandled throw; attempt caps via cloud adapter config.</li>
        <li><strong>Cancel:</strong> not implemented — no cancel route on the API today.</li>
      </ul>
    </>
  );
}

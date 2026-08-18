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
          { label: 'Locator merge', detail: 'profile → memory via @zero/locators (DB path exists but off)' },
          { label: 'Script builders', detail: '@zero/builders emit Playwright spec + Java class text' },
          { label: 'URL analyzer', detail: <><code>@zero/analyzer</code> crawls and fills BRD gaps</> },
          { label: 'PDF Manager report', detail: 'pdfkit renders a real document' },
        ]}
        stub={[
          { label: 'No resume-from-crash', detail: 'no stage_progress walker; restarts can lose in-flight runs' },
          { label: 'Large pipeline module', detail: 'agent templates still share pipeline.js rather than one module per agent' },
        ]}
      />

      <h3>Module map</h3>
      <p className={styles.purpose}>On disk now: <code>services/orchestrator/Dockerfile</code>, standalone <code>worker.js</code>, <code>processRun.js</code>, pipeline, and LLM facade.</p>
      <Diagram ariaLabel="orchestrator module map">
{`services/orchestrator/
├─ Dockerfile                    node:20-alpine, no browser
└─ src/
   ├─ worker.js                  boot · queue.subscribe('runs.requested', onMessage)
   ├─ config.js                  zod-validated env
   ├─ dag.js                     walk stageKeys · resume from run.state.stageProgress
   ├─ ctx.js                     builds { db, objectStore, secrets, llm, logger, tenantId }
   ├─ llm/
   │  ├─ index.js                facade: llm.chat(prompt, opts)
   │  ├─ openai.js               real client via secrets
   │  ├─ anthropic.js            "
   │  ├─ vertex.js               "
   │  └─ template.js             deterministic fallback (today's behavior)
   ├─ prompts/                   versioned per agent · ba@v3.md
   └─ agents/
      ├─ webAnalyzer.js
      ├─ ba.js                   requirements from URL + notes + Figma + TCs
      ├─ manualQa.js
      ├─ automationQa.js         emits Playwright spec + Java class
      ├─ execution.js            batches TCs → publish execution.requested; awaits completed
      ├─ accessibility.js
      ├─ performance.js
      ├─ security.js
      ├─ manager.js              pdfkit report
      └─ delivery.js             stakeholder JSON`}
      </Diagram>

      <h3>Key sequence · processRun</h3>
      <Mermaid ariaLabel="orchestrator processRun sequence" chart={ORCH_SEQUENCE_MERMAID} />

      <h3>Interface</h3>
      <ul className={styles.list}>
        <li><strong>Subscribes:</strong> <code>runs.requested {'{ runId, tenantId, traceparent }'}</code>, <code>execution.completed {'{ runId, batchId, results[] }'}</code></li>
        <li><strong>Publishes:</strong> <code>execution.requested {'{ runId, batchId, tcs[], selectors, mode }'}</code>, <code>reports.completed {'{ runId, urls }'}</code></li>
        <li><strong>Cache pub/sub:</strong> <code>state.&lt;runId&gt;</code> — every stage transition; consumed by api SSE</li>
      </ul>

      <h3>Idempotency, retry, resume</h3>
      <ul className={styles.list}>
        <li><strong>Idempotent writes:</strong> <code>INSERT ... ON CONFLICT (run_id, stage) DO UPDATE</code> — safe under at-least-once delivery.</li>
        <li><strong>Stage progress:</strong> <code>qa_runs.stages_json</code> holds the per-stage map today. A crash-resume walker that skips completed stages is still a gap (Honesty above).</li>
        <li><strong>Retry:</strong> queue redrives on unhandled throw; DLQ after N (default 3).</li>
        <li><strong>Cancel:</strong> <code>PATCH /api/runs/:id/cancel</code> sets <code>cancel_requested</code>; walker checks between stages and aborts cleanly.</li>
      </ul>
    </>
  );
}

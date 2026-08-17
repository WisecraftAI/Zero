import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import styles from './Lld.module.scss';

export function LldOrchestrator() {
  return (
    <>
      <h3 className={styles.subhead}>orchestrator · stage DAG worker</h3>
      <p className={styles.purpose}>
        Consume <code>runs.requested</code>, walk <code>stageKeys</code>, call agents (real LLM),
        persist artifacts, fan out to executor, aggregate, publish reports.
      </p>

      <Honesty
        worksTitle="works today (server.js · lib/)"
        stubTitle="advertised · not actually happening"
        works={[
          { label: <><code>processRun</code></>, detail: <>walks <code>stageKeys</code> in order</> },
          { label: 'Template agents', detail: 'BA, Manual QA, Automation QA, Manager, Delivery produce artifacts deterministically' },
          { label: 'Locator merge', detail: 'profile → memory (DB path exists but off)' },
          { label: 'Script builders', detail: 'Playwright spec + Java class text emit correctly' },
          { label: 'URL analyzer', detail: <><code>lib/urlAnalyzerPro</code> crawls and fills BRD gaps</> },
          { label: 'PDF Manager report', detail: 'pdfkit renders a real document' },
        ]}
        stub={[
          { label: 'No LLM calls', detail: <><code>apiKeyManager</code> stores keys; agents never call OpenAI / Anthropic / Vertex / Bedrock</> },
          { label: 'Agent settings ignored', detail: <><code>/api/agent-settings</code> writes; agents don't read</> },
          { label: 'Local queue is in-process', detail: 'split API/worker needs a shared queue (M7); crash mid-run still needs resume (stage_progress)' },
          { label: 'No resume-from-crash', detail: 'restarts start from scratch or lose the run' },
          { label: 'No retry semantics', detail: 'one exception per stage kills the whole run' },
          { label: 'No fan-out', detail: <>TCs execute serially inside <code>processRun</code></> },
        ]}
      />

      <h3>Module map</h3>
      <Diagram ariaLabel="orchestrator module map">
{`apps/orchestrator/
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

      <h3>Interface</h3>
      <ul className={styles.list}>
        <li><strong>Subscribes:</strong> <code>runs.requested {'{ runId, tenantId, traceparent }'}</code>, <code>execution.completed {'{ runId, batchId, results[] }'}</code></li>
        <li><strong>Publishes:</strong> <code>execution.requested {'{ runId, batchId, tcs[], selectors, mode }'}</code>, <code>reports.completed {'{ runId, urls }'}</code></li>
        <li><strong>Cache pub/sub:</strong> <code>state.&lt;runId&gt;</code> — every stage transition; consumed by api SSE</li>
      </ul>

      <h3>Idempotency, retry, resume</h3>
      <ul className={styles.list}>
        <li><strong>Idempotent writes:</strong> <code>INSERT ... ON CONFLICT (run_id, stage) DO UPDATE</code> — safe under at-least-once delivery.</li>
        <li><strong>Stage progress:</strong> <code>qa_runs.stage_progress JSONB</code> = <code>{'{ stageKey: { status, completedAt } }'}</code>. On restart, walker skips completed stages.</li>
        <li><strong>Retry:</strong> queue redrives on unhandled throw; DLQ after N (default 3).</li>
        <li><strong>Cancel:</strong> <code>PATCH /api/runs/:id/cancel</code> sets <code>cancel_requested</code>; walker checks between stages and aborts cleanly.</li>
      </ul>
    </>
  );
}

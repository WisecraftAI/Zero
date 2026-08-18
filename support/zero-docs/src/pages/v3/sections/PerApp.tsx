import { Diagram } from '@/components/ui/Diagram';

export function PerApp() {
  return (
    <section className="section" id="v3-per-app">
      <h2>SAD · per-app diagrams</h2>
      <p className="sub">
        High-level shape per workspace. Deployable LLD is on{' '}
        <a href="#tech-stack">Tech Stack</a>; shared package docs on{' '}
        <a href="#packages">Packages</a>.
      </p>

      <h3>Web UI · folder web/ · npm @zero/web · skill /zero-web</h3>
      <Diagram ariaLabel="web tier">
{`browser → nginx:3000 (static SPA only) → React 18 app
                                             │
                                             ├─ apiBase.js (VITE_API_BASE_URL)
                                             ├─ useRunStream (EventSource + poll fallback)
                                             ▼
                                       api:3001 (fetch + SSE)`}
      </Diagram>

      <h3>HTTP API · folder services/api/ · npm @zero/api · skill /zero-api</h3>
      <Diagram ariaLabel="api tier">
{`requestId → helmet → cors → rateLimit → auth → route
                                              │
                ┌─────────────────────────────┼─────────────────┐
                ▼                             ▼                 ▼
          src/routes/                   Cache.subscribe    Queue.publish(runs.requested)
          runs · locators · health · …        │
                ▼
          @zero/db · @zero/cloud (presign)`}
      </Diagram>

      <h3>Orchestrator worker · folder services/orchestrator/ · npm @zero/orchestrator · skill /zero-orchestrator</h3>
      <Diagram ariaLabel="orchestrator tier">
{`Queue.subscribe('runs.requested')
      │
      ▼
   processRun.js + pipeline.js → for stage of stageKeys:
                              agent(stage) → LLM / templates
                              persist artifact
                              cache.publish(state)
                              (execution stage) → Queue.publish('execution.requested')`}
      </Diagram>

      <h3>Playwright executor · folder services/executor/ · npm @zero/executor · skill /zero-executor</h3>
      <Diagram ariaLabel="executor tier">
{`Queue.subscribe('execution.requested')
      │
      ▼
   semaphore(MAX_CONCURRENT_JOBS)
   secrets.get(login)          — never logged
   chromium.launchContext()    --no-sandbox --disable-dev-shm-usage
   for step in tc.steps: play(step); trace(step)
   objectStore.put(shots/…)
   db.upsert(element_locators)
   Queue.publish('execution.completed')`}
      </Diagram>
    </section>
  );
}

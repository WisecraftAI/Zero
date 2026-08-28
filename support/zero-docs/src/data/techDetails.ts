import type { ArchSpec } from '@/components/ui/ArchDiagram';

/**
 * Curated, hand-written detail for each workspace. This is the half of the Tech
 * tab that a generator cannot know: intent, design rationale, the wire-level
 * contract, and the human/agent playbook for changing it. Disk facts (tree, LOC,
 * deps) and the milestone roadmap come from `npm run docs` (src/data/generated.ts).
 */

export type ContractKind = 'http' | 'sse' | 'queue' | 'event' | 'db' | 'blob' | 'call' | 'fn' | 'data';

export interface ContractItem {
  kind: ContractKind;
  /** The endpoint, event name, or function signature. */
  label: string;
  /** One plain sentence on what it is for. */
  detail: string;
}

export interface TechDetail {
  /** One paragraph: what this workspace is and why it exists. */
  mission: string;
  /** How it is built — the design decisions behind the pattern tags. */
  design: readonly string[];
  /** The architecture infographic for this workspace in context. */
  diagram: ArchSpec;
  /** What comes in (requests, events, function calls). */
  inbound: readonly ContractItem[];
  /** What it emits (calls, events, writes). */
  outbound: readonly ContractItem[];
  /** How a person codes here. */
  humanSteps: readonly string[];
  /** The exact loop an agent should follow. */
  agentSteps: readonly string[];
}

const AGENT_TAIL = (skill: string, prompt: string): readonly string[] => {
  const persona = `support/agent-workflow/agents/${skill.replace(/^\/zero-/, '')}-coder.md`;
  return [
    `Load the persona ${persona} and say ${skill} (which reads ${prompt}).`,
    'Run `npm run docs`, then open this tab to read the current structure, contract, and roadmap.',
    'Run `npm run workflow:status`; only implement the earliest unfinished milestone for this workspace.',
    'Make the change, then `npm run workflow:verify` before marking `progress.json` done.',
  ];
};

export const TECH_DETAILS: Record<string, TechDetail> = {
  web: {
    mission:
      'The browser UI. A React 18 + Vite single-page app that lets a QA lead start a run, watch it progress, and download reports. It is pure presentation: it validates forms, calls the HTTP API, and renders run state. It never holds business rules, never sees a provider secret, and never touches artifact bytes — large files are PUT straight to presigned object-store URLs.',
    design: [
      'Container / presentational split — route views in `src/views` own data-fetching; `src/components` stay stateless and reusable.',
      'Pathname router — `web/src/lib/routes.js` maps `/`, `/runs`, `/runs/new`, `/runs/:id` (History API, not hash).',
      'One data hook per endpoint (target `src/data/`): `useRuns`, `useRun`, `useRunStream` (EventSource), `useUpload`. No `fetch()` buried inside presentational components.',
      'Colocated styles — each view ships its own CSS/SCSS module.',
      'Graceful degradation — SSE falls back to polling after two failed reconnects; uploads retry with backoff.',
    ],
    diagram: {
      title: 'Web UI in context',
      caption: 'The SPA initiates every call; bytes bypass the API via presigned URLs.',
      tiers: [
        { id: 'client', label: 'Client', nodes: [{ label: 'Browser SPA', sub: 'React 18 + Vite', role: 'client', focus: true }] },
        {
          id: 'api',
          label: 'HTTP API',
          into: { label: 'REST + SSE', wire: 'http' },
          nodes: [{ label: 'services/api', sub: 'auth · presign · stream', role: 'api' }],
        },
        {
          id: 'store',
          label: 'Object store',
          into: { label: 'presigned PUT / GET', wire: 'blob' },
          nodes: [{ label: 'tcFile · recording · report', sub: '@zero/cloud', role: 'store' }],
        },
      ],
    },
    inbound: [],
    outbound: [
      { kind: 'http', label: 'POST /runs', detail: 'Start a run; gets back { runId, uploads[] } then PUTs each file to its presigned URL. (S7 dropped the /api prefix.)' },
      { kind: 'http', label: 'GET /runs · GET /runs/:id', detail: 'List past runs and poll one run’s status and assets.' },
      { kind: 'sse', label: 'GET /runs/:id/stream', detail: 'Live stage ticks — state · artifact · done · error (EventSource primary; 3s poll fallback after SSE failures).' },
      { kind: 'http', label: 'GET /runs/:id/download', detail: 'Fetch the generated report bundle or a signed download URL.' },
      { kind: 'http', label: '/provider-keys · /agent-settings', detail: 'Save encrypted provider keys and per-agent model choices.' },
      { kind: 'blob', label: 'PUT <presigned url>', detail: 'Upload tcFile / recordingFile directly to the object store — bytes never transit the API.' },
    ],
    humanSteps: [
      'Run `npm run client` for the Vite dev server on :5173; fetches use `VITE_API_BASE_URL` (default `http://localhost:3001`) since S7.',
      'Edit only `web/src/**` (and brand assets under `web/public/`): add a route view under `src/views`, keep paths in `src/lib/routes.js`.',
      'Rebuild the served bundle with `npm run build` → `dist/web/` (nginx `zero-web` serves it; the API does not).',
      'Never import `playwright`, `pg`, cloud SDKs, or `@zero/cloud`; never store passwords in localStorage.',
    ],
    agentSteps: AGENT_TAIL('/zero-web', 'support/agent-workflow/prompts/repos/web.md'),
  },

  api: {
    mission:
      'The only front door. A stateless Express service that authenticates the caller, validates input, persists run metadata, hands back presigned upload URLs, publishes `runs.requested`, and streams progress over SSE. It never launches Chromium and never walks the pipeline itself.',
    design: [
      'Ports & adapters — routes are thin; real work sits behind `@zero/*` packages.',
      'Middleware pipeline — helmet, cors, compression, morgan, rate-limit, auth, then validation.',
      'Publish-after-persist — upsert the run row, then publish `runs.requested`, return 202 (transactional outbox is still target).',
      'Config-once — env is read and validated at boot; `server.js` is the composition root wiring `src/routes/*`.',
    ],
    diagram: {
      title: 'HTTP API in context',
      caption: 'Authenticate → persist → presign → publish. No Chromium, no DAG here.',
      tiers: [
        { id: 'client', label: 'Client', nodes: [{ label: 'Web UI / API client', role: 'client' }] },
        {
          id: 'edge',
          label: 'API edge',
          into: { label: 'HTTP + x-api-key / JWT', wire: 'http' },
          nodes: [
            { label: 'Middleware', sub: 'helmet · cors · rate-limit · auth', role: 'edge' },
            { label: 'Routes', sub: 'services/api/src/routes/*', role: 'api', focus: true },
          ],
        },
        {
          id: 'queue',
          label: 'Async',
          into: { label: 'publish runs.requested', wire: 'queue' },
          nodes: [{ label: 'Queue', sub: '@zero/cloud', role: 'async' }],
        },
        {
          id: 'store',
          label: 'Data plane',
          into: { label: 'persist + presign', wire: 'db' },
          nodes: [
            { label: 'qa_runs / qa_assets', sub: '@zero/db', role: 'store' },
            { label: 'Object store', sub: 'presigned URLs', role: 'store' },
          ],
        },
      ],
    },
    inbound: [
      { kind: 'http', label: 'POST /runs · POST /runs/:id/commit', detail: 'Multipart start, or JSON { uploads:[...] } → presigned PUTs; commit then starts the pipeline. (S7 dropped the /api prefix.)' },
      { kind: 'http', label: 'GET /runs · /:id · /:id/assets · /:id/download', detail: 'Read run state, assets, and downloads.' },
      { kind: 'sse', label: 'GET /runs/:id/stream', detail: 'Server-sent stage events relayed from cache / Redis.' },
      { kind: 'http', label: 'POST /runs/:id/stop · POST /runs/:id/rerun-failed', detail: 'Cooperative stop flag; re-queue failed checks.' },
      { kind: 'http', label: '/provider-keys · /agent-settings · /locators · /element-log', detail: 'Settings and locator surface; recording endpoints under /recordings.' },
    ],
    outbound: [
      { kind: 'queue', label: 'publish runs.requested', detail: 'Hand the run to the orchestrator and return 202 immediately.' },
      { kind: 'db', label: 'upsert qa_runs / qa_assets', detail: 'Via @zero/db when DATABASE_URL is set; file + memory fallback otherwise.' },
      { kind: 'blob', label: 'presign PUT / GET', detail: 'Via @zero/cloud object store; /artifacts is never statically served.' },
    ],
    humanSteps: [
      'Add a route module under `services/api/src/routes/` and register it in the composition root.',
      'Put shared logic behind an `@zero/*` package, not inside the route handler.',
      'Never `require("playwright")` or boot a worker here — the API image cannot resolve Chromium.',
      '`npm start` runs the API only; `npm run start:all` co-locates workers for local end-to-end.',
    ],
    agentSteps: AGENT_TAIL('/zero-api', 'support/agent-workflow/prompts/repos/api.md'),
  },

  orchestrator: {
    mission:
      'The brain. A long-lived worker that consumes `runs.requested` and walks the DAG in `stageKeys`: Web Analyzer → BA → Manual QA → Automation QA → Execution → optional a11y/perf/security → Manager → Delivery. Each agent stage calls an LLM through `@zero/orchestrator/llm` when a decrypted key exists, otherwise runs deterministic templates. It fans out `execution.requested` and waits for `execution.completed`.',
    design: [
      'DAG walker — `processRun` walks `stageKeys` in order; agent templates still share `pipeline.js`.',
      'Host-scoped agentic memory — `agentMemory.js` recalls BA/Manual/Automation/Manager/execution observations for the same host; classification keys are never stored (Q5).',
      'LLM facade + template fallback — `llm/` is split (`index`, `providers`, `enrichment`, `prompts`, `utils`); a missing, capped, or failing key degrades to templates, never an error.',
      'Idempotent writes keyed by (runId, stage) so a retry re-runs cleanly.',
    ],
    diagram: {
      title: 'Orchestrator in context',
      caption: 'Consume a run → walk stages (LLM or template) → fan out execution → persist.',
      tiers: [
        { id: 'in', label: 'Async in', nodes: [{ label: 'runs.requested', sub: 'from the API', role: 'async' }] },
        {
          id: 'orch',
          label: 'Orchestrator',
          into: { label: 'consume', wire: 'event' },
          nodes: [
            { label: 'processRun (DAG)', sub: 'stageKeys walk', role: 'worker', focus: true },
            { label: 'LLM facade', sub: 'OpenAI · Claude · Gemini', role: 'external' },
          ],
        },
        {
          id: 'exec',
          label: 'Execution',
          into: { label: 'execution.requested / .completed', wire: 'queue' },
          nodes: [{ label: 'services/executor', sub: 'Playwright jobs', role: 'worker' }],
        },
        {
          id: 'store',
          label: 'Data plane',
          into: { label: 'artifacts + state', wire: 'db' },
          nodes: [
            { label: 'Object store', sub: 'reports · screenshots', role: 'store' },
            { label: 'qa_runs', sub: '@zero/db', role: 'store' },
            { label: 'agent_memory', sub: 'host-scoped recall', role: 'store' },
          ],
        },
      ],
    },
    inbound: [
      { kind: 'queue', label: 'consume runs.requested', detail: 'Concurrency capped by ZERO_ORCH_CONCURRENCY (default 2).' },
      { kind: 'event', label: 'execution.completed', detail: 'Result of each Playwright batch, awaited before the run advances.' },
    ],
    outbound: [
      { kind: 'queue', label: 'publish execution.requested', detail: 'Fan out per test-case batch with retries and caps.' },
      { kind: 'call', label: '@zero/orchestrator/llm', detail: 'Enrich BA / Manual / Automation / Manager; template fallback on error, cap, or ZERO_LLM=off.' },
      { kind: 'blob', label: 'write artifacts', detail: 'Reports and screenshots to the object store.' },
      { kind: 'db', label: 'recall + upsert agent_memory', detail: 'Per tenant+host+agent JSON; passwords and taxonomy keys stripped.' },
      { kind: 'event', label: 'publish state.<runId>', detail: 'Stage ticks relayed to the API’s SSE stream.' },
    ],
    humanSteps: [
      'Edit the DAG in `services/orchestrator/processRun.js`; add or change one stage/agent file.',
      'Talk to models only through `@zero/orchestrator/llm`; keep the template path working; persist observations via `agentMemory.js` without classification keys.',
      'Publish `execution.requested` for browser work — never `chromium.launch()` here.',
      'Standalone: `npm run orchestrator`; full local loop: `npm run start:all`.',
    ],
    agentSteps: AGENT_TAIL('/zero-orchestrator', 'support/agent-workflow/prompts/repos/orchestrator.md'),
  },

  executor: {
    mission:
      'The hands. An ephemeral Playwright job worker. On `execution.requested` it opens one browser context per batch, drives the steps, captures screenshots and traces to the object store, upserts learned locators, and publishes `execution.completed`. Chromium exists only here — no other image can resolve Playwright. There is no HTTP server.',
    design: [
      'Worker / job — pull a batch, do it, exit clean; container-ready.',
      'Semaphore — concurrency capped by ZERO_EXEC_CONCURRENCY; retries via ZERO_EXEC_ATTEMPTS.',
      'Command per step — each action is a small step file.',
      'finally-close — the browser context is always closed, even on failure.',
    ],
    diagram: {
      title: 'Playwright executor in context',
      caption: 'The only place Chromium runs. One context per batch, then completed.',
      tiers: [
        { id: 'in', label: 'Async in', nodes: [{ label: 'execution.requested', sub: 'from orchestrator', role: 'async' }] },
        {
          id: 'exec',
          label: 'Executor',
          into: { label: 'consume', wire: 'event' },
          nodes: [{ label: 'Playwright job', sub: 'Chromium · one context / batch', role: 'worker', focus: true }],
        },
        {
          id: 'store',
          label: 'Data plane',
          into: { label: 'screenshots + traces', wire: 'blob' },
          nodes: [
            { label: 'Object store', sub: 'dist/artifacts', role: 'store' },
            { label: 'element_locators', sub: 'via @zero/locators', role: 'store' },
          ],
        },
        {
          id: 'out',
          label: 'Async out',
          into: { label: 'execution.completed', wire: 'event' },
          nodes: [{ label: 'back to orchestrator', role: 'async' }],
        },
      ],
    },
    inbound: [
      { kind: 'queue', label: 'consume execution.requested', detail: 'One browser context per batch; retries on queue failure.' },
    ],
    outbound: [
      { kind: 'event', label: 'publish execution.completed', detail: 'Signals the orchestrator the batch is done.' },
      { kind: 'blob', label: 'upload screenshots / traces', detail: 'To the object store; never served statically.' },
      { kind: 'db', label: 'upsert element_locators', detail: 'Learned selectors persisted through @zero/locators.' },
    ],
    humanSteps: [
      'Keep all Chromium usage inside `services/executor/`; add step files, not an HTTP route.',
      'Never add an Express server or import route code here.',
      'Tune caps with ZERO_EXEC_CONCURRENCY / ZERO_EXEC_ATTEMPTS; always close the context.',
      'Standalone: `npm run execution`; full local loop: `npm run start:all`.',
    ],
    agentSteps: AGENT_TAIL('/zero-executor', 'support/agent-workflow/prompts/repos/executor.md'),
  },

  cloud: {
    mission:
      'The plug. The single place that imports a vendor SDK. It exposes four contracts — ObjectStore, Queue, Secrets, Cache — and picks an implementation from `ZERO_CLOUD` (local | aws | gcp | azure | vercel). A GATE-9 conformance suite runs the same tests against every provider, so swapping clouds is a config change, not a code change.',
    design: [
      'Adapter — one adapter per capability per provider.',
      'Abstract factory — `ZERO_CLOUD` selects the implementation at boot.',
      'Conformance suite — the same contract tests run against every provider (GATE-9).',
      'Lazy-required SDKs — vendor SDKs are required on demand, never added as runtime deps.',
    ],
    diagram: {
      title: '@zero/cloud in context',
      caption: 'Callers depend on interfaces; ZERO_CLOUD chooses the vendor.',
      tiers: [
        {
          id: 'callers',
          label: 'Callers',
          nodes: [
            { label: 'HTTP API', role: 'api' },
            { label: 'Orchestrator', role: 'worker' },
            { label: 'Executor', role: 'worker' },
          ],
        },
        {
          id: 'facade',
          label: 'Facade',
          into: { label: 'ObjectStore · Queue · Secrets · Cache', wire: 'call' },
          nodes: [{ label: '@zero/cloud', sub: 'lib/provider · adapters', role: 'shared', focus: true }],
        },
        {
          id: 'providers',
          label: 'Providers',
          into: { label: 'ZERO_CLOUD switch', wire: 'call' },
          nodes: [
            { label: 'local', sub: 'FS + HMAC URLs', role: 'external' },
            { label: 'aws', sub: 'S3 · SQS · Secrets', role: 'external' },
            { label: 'gcp', sub: 'GCS · Pub/Sub', role: 'external' },
            { label: 'azure · vercel', sub: 'lazy SDKs', role: 'external' },
          ],
        },
      ],
    },
    inbound: [
      { kind: 'fn', label: 'getObjectStore() · getQueue() · getSecrets() · getCache()', detail: 'One factory per capability, switched by ZERO_CLOUD.' },
    ],
    outbound: [
      { kind: 'blob', label: 'S3 / GCS / MinIO / local FS', detail: 'Object bytes and presigned URLs.' },
      { kind: 'queue', label: 'SQS / Pub/Sub / Redis list', detail: 'runs.requested and execution.requested transport.' },
      { kind: 'call', label: 'Secrets Manager / Secret Manager / env', detail: 'Decrypted provider keys and app secrets.' },
    ],
    humanSteps: [
      'Add a provider folder under `packages/cloud/<name>` implementing the four interfaces.',
      'Keep vendor SDKs lazy-required; do not add them to runtime dependencies.',
      'Make the GATE-9 conformance suite pass for the new provider before wiring it in.',
      'This is the only workspace allowed to import a cloud SDK.',
    ],
    agentSteps: AGENT_TAIL('/zero-cloud', 'support/agent-workflow/prompts/repos/cloud.md'),
  },

  domain: {
    mission:
      'The shared kernel. Pure contracts every other workspace imports: `stageKeys` (pipeline order), `appProfiles` (channel presets — Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic), the execution protocol, id constructors, and typed errors. No I/O, no side effects.',
    design: [
      'Value objects — small immutable shapes with no behaviour dependencies.',
      'Schema-at-the-boundary — zod schemas validate data as it crosses in (target).',
      'Shared kernel — changing it ripples everywhere, so it stays minimal and stable.',
    ],
    diagram: {
      title: '@zero/domain in context',
      caption: 'Imported by everyone; imports nothing with side effects.',
      tiers: [
        {
          id: 'consumers',
          label: 'Consumers',
          nodes: [
            { label: 'HTTP API', role: 'api' },
            { label: 'Orchestrator', role: 'worker' },
            { label: 'Executor', role: 'worker' },
            { label: 'Builders', role: 'shared' },
          ],
        },
        {
          id: 'domain',
          label: 'Shared kernel',
          into: { label: 'import (pure)', wire: 'call' },
          nodes: [{ label: '@zero/domain', sub: 'lib/stages · profiles · outputRoots · execution', role: 'shared', focus: true }],
        },
      ],
    },
    inbound: [
      { kind: 'fn', label: 'import { stageKeys, appProfiles, ... }', detail: 'Pipeline order, channel presets, id constructors, typed errors.' },
    ],
    outbound: [],
    humanSteps: [
      'Add a contract under `packages/domain/lib/` — no `require` of pg, cloud, or playwright.',
      'Keep root files as thin re-exports (`index.js`, `execution.js`, `outputRoots.js`).',
      'Update consumers when a contract changes; a domain change is a breaking change everywhere.',
      'Keep it dependency-light: this is the shared kernel, not a utility dumping ground.',
    ],
    agentSteps: AGENT_TAIL('/zero-domain', 'support/agent-workflow/prompts/repos/domain.md'),
  },

  db: {
    mission:
      'The record-keeper. The only workspace that knows DDL. A Postgres pool, table names, and the run store: `qa_runs`, `qa_assets`, `element_locators`, `projects`, `provider_keys`, `agent_settings`, `agent_memory`, and friends. When `DATABASE_URL` / `PGHOST` is set it upserts; otherwise callers fall back to an in-memory Map plus `dist/artifacts/<runId>/run.json`.',
    design: [
      'Repository — callers use a small run-store API, never raw SQL.',
      'Tables via `initAllTables` + `runPendingMigrations()` on boot (`packages/db/migrations/`); a standalone migrate CLI is still future work.',
      'Fallback by design — no DB configured means file + memory, not an error.',
    ],
    diagram: {
      title: '@zero/db in context',
      caption: 'The single owner of DDL; degrades to file + memory when unset.',
      tiers: [
        {
          id: 'callers',
          label: 'Callers',
          nodes: [
            { label: 'HTTP API', role: 'api' },
            { label: 'Orchestrator', role: 'worker' },
            { label: 'Executor', role: 'worker' },
          ],
        },
        {
          id: 'db',
          label: 'Persistence',
          into: { label: 'run store API', wire: 'call' },
          nodes: [{ label: '@zero/db', sub: 'lib/schema · runs · runStore', role: 'shared', focus: true }],
        },
        {
          id: 'pg',
          label: 'Postgres',
          into: { label: 'SQL', wire: 'db' },
          nodes: [{ label: '10 tables · qa_runs hub', sub: 'only qa_assets has a real FK', role: 'store' }],
        },
      ],
    },
    inbound: [
      { kind: 'fn', label: 'upsertRun() · getRunById() · listRunRows()', detail: 'qa_runs. listRunRows is tenant-filtered when tenantId is passed.' },
      { kind: 'fn', label: 'replaceAssets() · listAssetsByRunId()', detail: 'qa_assets — delete + reinsert generated files for a run.' },
      { kind: 'fn', label: 'upsertLocator() · getLocatorsByHost() · insertElementLog()', detail: 'element_locators / element_logs.' },
      { kind: 'fn', label: 'upsertAgentMemory() · getAgentMemoryByHost()', detail: 'agent_memory — host-scoped blobs; classification keys must not be stored.' },
      { kind: 'fn', label: 'initAllTables()', detail: 'CREATE TABLE IF NOT EXISTS for all ten tables when Postgres is configured.' },
    ],
    outbound: [
      { kind: 'db', label: 'SQL → Postgres', detail: 'Upsert / select; runStore still writes dist/artifacts/<id>/run.json when the pool is down.' },
    ],
    humanSteps: [
      'Change DDL only in `packages/db/lib/schema/`; wire through `lib/index.js`.',
      'Keep login passwords out of the DB and artifacts — secrets go through the secrets adapter.',
      'Preserve the file + memory fallback so local dev works with no Postgres.',
    ],
    agentSteps: AGENT_TAIL('/zero-db', 'support/agent-workflow/prompts/repos/db.md'),
  },

  locators: {
    mission:
      'The selector memory. Merges element locators in a fixed order — channel profile → in-process learned → Postgres — and normalizes element keys. Used by the orchestrator (to plan) and the executor (to act and to persist what worked).',
    design: [
      'Chain of responsibility — profile, then memory, then DB; first confident match wins.',
      'Pure merge — resolution has no side effects; persistence happens only at the edges.',
      'Normalized keys — one canonical element key so learning accumulates.',
    ],
    diagram: {
      title: '@zero/locators in context',
      caption: 'Merge profile → memory → DB; persist what the run learned.',
      tiers: [
        {
          id: 'callers',
          label: 'Callers',
          nodes: [
            { label: 'Orchestrator', role: 'worker' },
            { label: 'Executor', role: 'worker' },
          ],
        },
        {
          id: 'merge',
          label: 'Merge',
          into: { label: 'resolve / normalize', wire: 'call' },
          nodes: [{ label: '@zero/locators', sub: 'lib/merge · elements · ecommerce', role: 'shared', focus: true }],
        },
        {
          id: 'store',
          label: 'Persistence',
          into: { label: 'read / upsert', wire: 'db' },
          nodes: [{ label: 'element_locators', sub: 'via @zero/db', role: 'store' }],
        },
      ],
    },
    inbound: [
      { kind: 'fn', label: 'resolveLocators(host, key)', detail: 'Merge profile, learned, and DB candidates in order.' },
      { kind: 'fn', label: 'normalizeElementKey()', detail: 'Canonical key so learned selectors accumulate.' },
    ],
    outbound: [
      { kind: 'db', label: 'read / upsert element_locators', detail: 'Through @zero/db when Postgres is configured.' },
    ],
    humanSteps: [
      'Keep the merge order profile → memory → DB; add a source at the right link in the chain.',
      'Resolution stays pure — persist only through @zero/db at the edges.',
      'Normalize new element keys so learning does not fragment.',
    ],
    agentSteps: AGENT_TAIL('/zero-locators', 'support/agent-workflow/prompts/repos/locators.md'),
  },

  builders: {
    mission:
      'The code generators. Pure functions that emit a Playwright spec and a Java/Selenium class as text from the same run input — same input, same output, snapshot-friendly. This is how a ZERO run becomes reusable scripts you can run in an external project.',
    design: [
      'Builder — assemble script text step by step from run data.',
      'Template method — one skeleton per target (Playwright, Java/Selenium); steps fill the blanks.',
      'Pure functions — no I/O, so output is snapshot-testable.',
    ],
    diagram: {
      title: '@zero/builders in context',
      caption: 'Run data in, script text out — deterministic and testable.',
      tiers: [
        { id: 'caller', label: 'Caller', nodes: [{ label: 'Orchestrator', sub: 'Automation QA stage', role: 'worker' }] },
        {
          id: 'build',
          label: 'Emit',
          into: { label: 'call (pure)', wire: 'call' },
          nodes: [{ label: '@zero/builders', sub: 'lib/playwright · lib/selenium', role: 'shared', focus: true }],
        },
        {
          id: 'out',
          label: 'Artifacts',
          into: { label: 'text', wire: 'data' },
          nodes: [{ label: 'Playwright spec + Java class', sub: 'stored as artifacts', role: 'store' }],
        },
      ],
    },
    inbound: [
      { kind: 'fn', label: 'buildPlaywrightSpec(run) · buildJavaSelenium(run)', detail: 'Emit each script as a text string.' },
    ],
    outbound: [
      { kind: 'data', label: 'emit .spec / .java text', detail: 'Returned to the orchestrator and written to the object store.' },
    ],
    humanSteps: [
      'Keep builders pure — no network, no filesystem; take run data, return a string.',
      'Add emitters under `packages/builders/lib/playwright` or `lib/selenium`; keep root subpaths as re-exports.',
      'Same input must always yield the same output.',
    ],
    agentSteps: AGENT_TAIL('/zero-builders', 'support/agent-workflow/prompts/repos/builders.md'),
  },

  analyzer: {
    mission:
      'The scout. An optional Playwright crawl that seeds the BA stage when notes are short and no test-case file was uploaded. Two facades — light (`urlAnalyzer.js`) and pro (`urlAnalyzerPro.js`, the package default) — sit on a shared `lib/` of strategies, crawl, flows, generate, and format. Its Chromium is resolved through the executor image, not the HTTP API.',
    design: [
      'Strategy — a light crawl vs a pro crawl chosen from run inputs.',
      'Isolated Chromium — separate from the executor’s job runner.',
      'Signals — anti-bot / WAF / SPA-root detection in `lib/crawl/signals.js` feed the pro strategy.',
      'Optional — skipped entirely when a TC file or long notes already exist.',
    ],
    diagram: {
      title: '@zero/analyzer in context',
      caption: 'Optional crawl that feeds BA when inputs are thin.',
      tiers: [
        { id: 'caller', label: 'Caller', nodes: [{ label: 'Orchestrator', sub: 'Web Analyzer stage', role: 'worker' }] },
        {
          id: 'analyze',
          label: 'Crawl',
          into: { label: 'analyze(url)', wire: 'call' },
          nodes: [{ label: '@zero/analyzer', sub: 'Pro default · light fallback', role: 'shared', focus: true }],
        },
        {
          id: 'site',
          label: 'Target',
          into: { label: 'headless navigate', wire: 'http' },
          nodes: [{ label: 'OTT site', sub: 'crawled pages', role: 'external' }],
        },
        {
          id: 'ba',
          label: 'Downstream',
          into: { label: 'BRD insights', wire: 'data' },
          nodes: [{ label: 'BA stage', sub: 'requirements seed', role: 'worker' }],
        },
      ],
    },
    inbound: [
      { kind: 'fn', label: 'analyzeUrlPro(page, url, opts)', detail: 'Default package entry. Deep Playwright crawl → BRD, TCs, flows, anti-bot signals.' },
      { kind: 'fn', label: 'analyzeUrl(page, url, opts)', detail: 'Light strategy — smaller category set, legacy result shape.' },
      { kind: 'fn', label: 'generateBRD() · generateTestCases() · formatForBAAgent()', detail: 'Turn crawl output into BA-ready text.' },
    ],
    outbound: [
      { kind: 'http', label: 'navigate target OTT URL', detail: 'Headless crawl of the site under test.' },
      { kind: 'data', label: 'return BRD insights', detail: 'Structured findings that seed the BA stage.' },
    ],
    humanSteps: [
      'Add or tune crawl pieces under `packages/analyzer/lib/` (strategies, crawl, flows, generate); keep light and pro separate.',
      'Leave the root facades thin — `urlAnalyzer.js` and `urlAnalyzerPro.js` only re-export.',
      'Resolve Chromium via the executor image, not the API.',
      'Stay optional — never make a run depend on the analyzer succeeding.',
    ],
    agentSteps: AGENT_TAIL('/zero-analyzer', 'support/agent-workflow/prompts/repos/analyzer.md'),
  },
};

import type { MigStatus } from './migration';

export type RepoKind = 'app' | 'web' | 'package';

export interface RepoDef {
  id: string;
  /** Human workspace name. Say this in prose. */
  name: string;
  kind: RepoKind;
  /** npm package — import this in code. */
  pkg: string;
  /** Folder — open this on disk. */
  path: string;
  /** Where to edit now (same as path after S2, more specific for the API root). */
  today: string;
  purpose: string;
  patterns: readonly string[];
  /** Cursor skill — say this to the agent. */
  skill: string;
  prompt: string;
  status: MigStatus;
  statusNote: string;
}

/** Three names for one workspace. They are not three repos. */
export const REPO_NAME_KINDS = [
  {
    id: 'folder',
    label: 'Folder',
    meaning: 'Path on disk. Open this in the editor.',
    exampleKey: 'path' as const,
  },
  {
    id: 'npm',
    label: 'npm package',
    meaning: 'Import name in code and in package.json.',
    exampleKey: 'pkg' as const,
  },
  {
    id: 'skill',
    label: 'Cursor skill',
    meaning: 'Slash command that loads the coding prompt. Say this to the agent.',
    exampleKey: 'skill' as const,
  },
];

/** One annotated line for the folder tree: workspace · npm package · Cursor skill. */
export function repoTreeLabel(r: RepoDef): string {
  return `${r.name}  ·  npm package ${r.pkg}  ·  Cursor skill ${r.skill}`;
}

/**
 * The ten workspaces on disk: services/*, packages/*, web/. Each runtime service
 * has its own image; npm run start:all is the explicit local co-location path.
 *
 * Each workspace has three names: Folder, npm package, Cursor skill.
 */
export const REPOS: readonly RepoDef[] = [
  {
    id: 'api',
    name: 'HTTP API',
    kind: 'app',
    pkg: '@zero/api',
    path: 'services/api/',
    today: 'services/api/server.js',
    purpose: 'Stateless HTTP intake. Auth, validate, persist metadata, presign uploads, publish runs.requested, stream SSE. Never launches Chromium.',
    patterns: ['Ports & adapters', 'Middleware pipeline', 'Publish-after-persist (no outbox yet)', 'Env-driven config'],
    skill: '/zero-api',
    prompt: 'support/agent-workflow/prompts/repos/api.md',
    status: 'done',
    statusNote: 'HTTP-only runtime on :3001. Route paths dropped the /api prefix in S7 (native /runs, /cloud/local, /provider-keys). No orchestrator/executor dependency or worker boot code; Playwright is not resolvable in this image; the SPA no longer ships in this image either.',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator worker',
    kind: 'app',
    pkg: '@zero/orchestrator',
    path: 'services/orchestrator/',
    today: 'services/orchestrator/',
    purpose: 'Long-lived DAG worker. Consumes runs.requested, walks stageKeys, calls LLM/templates, fans out execution.requested, writes artifacts.',
    patterns: ['DAG walker', 'Strategy (one agent file)', 'LLM facade + template fallback', 'Idempotent (runId, stage) writes'],
    skill: '/zero-orchestrator',
    prompt: 'support/agent-workflow/prompts/repos/orchestrator.md',
    status: 'done',
    statusNote: 'Standalone workspace-scoped image (S5). Redis list queue is shared across containers. Resume-from-crash remains future work.',
  },
  {
    id: 'executor',
    name: 'Playwright executor',
    kind: 'app',
    pkg: '@zero/executor',
    path: 'services/executor/',
    today: 'services/executor/',
    purpose: 'Ephemeral Playwright job. One browser context per batch. Uploads screenshots. Upserts learned locators. No HTTP server.',
    patterns: ['Worker / job', 'Semaphore (concurrency cap)', 'Command (step files)', 'finally-close context'],
    skill: '/zero-executor',
    prompt: 'support/agent-workflow/prompts/repos/executor.md',
    status: 'done',
    statusNote: 'Own workspace-scoped Playwright image (S4). API and orchestrator images cannot resolve Playwright.',
  },
  {
    id: 'web',
    name: 'Web UI',
    kind: 'web',
    pkg: '@zero/web',
    path: 'web/',
    today: 'web/src/',
    purpose: 'Presentation only. Forms, run status, downloads. Never holds business rules, secrets, or artifact bytes.',
    patterns: ['Container / presentational views', 'Data hooks (react-query / EventSource)', 'Colocated styles', 'No domain I/O'],
    skill: '/zero-web',
    prompt: 'support/agent-workflow/prompts/repos/web.md',
    status: 'done',
    statusNote: 'Own workspace-scoped nginx image on :3000 (S7). Cross-origin API via VITE_API_BASE_URL (default http://localhost:3001). Run detail uses EventSource on /runs/:id/stream with 3s poll fallback after two SSE failures. OIDC login screen remains M5 follow-up.',
  },
  {
    id: 'cloud',
    name: 'Cloud adapters',
    kind: 'package',
    pkg: '@zero/cloud',
    path: 'packages/cloud/',
    today: 'packages/cloud/',
    purpose: 'The only place that imports vendor SDKs. ObjectStore · Queue · Secrets · Cache, switched by ZERO_CLOUD.',
    patterns: ['Adapter', 'Abstract factory (ZERO_CLOUD switch)', 'Conformance suite per provider'],
    skill: '/zero-cloud',
    prompt: 'support/agent-workflow/prompts/repos/cloud.md',
    status: 'done',
    statusNote: 'Provider folders + lib/{provider,index} loader. Jest: test/cloud.*.js + GATE-9 conformance (S6).',
  },
  {
    id: 'domain',
    name: 'Domain contracts',
    kind: 'package',
    pkg: '@zero/domain',
    path: 'packages/domain/',
    today: 'packages/domain/',
    purpose: 'Shared contracts: stageKeys, appProfiles, zod schemas, typed errors, id constructors. No I/O.',
    patterns: ['Value objects', 'Schema-at-the-boundary', 'Shared kernel'],
    skill: '/zero-domain',
    prompt: 'support/agent-workflow/prompts/repos/domain.md',
    status: 'done',
    statusNote: 'lib/{stages,profiles,outputRoots,execution,schemas} with thin root re-exports. Jest: test/domain.test.js. Pure validateRunInput today; zod boundary schemas remain a V3 follow-up.',
  },
  {
    id: 'db',
    name: 'Postgres helpers',
    kind: 'package',
    pkg: '@zero/db',
    path: 'packages/db/',
    today: 'packages/db/',
    purpose: 'Postgres pool, table names, versioned migrations. The one place that knows DDL.',
    patterns: ['Repository', 'Forward + reversible migrations'],
    skill: '/zero-db',
    prompt: 'support/agent-workflow/prompts/repos/db.md',
    status: 'done',
    statusNote: 'lib/{schema,runs,assets,elements,projects,providers,runStore} with thin index re-export. migrations/001_initial.sql + runPendingMigrations. Jest: test/db.config.test.js, test/db.persist.test.js.',
  },
  {
    id: 'locators',
    name: 'Locator registry',
    kind: 'package',
    pkg: '@zero/locators',
    path: 'packages/locators/',
    today: 'packages/locators/',
    purpose: 'Locator merge (profile → memory → DB) and element-key normalizer. Used by orchestrator and executor.',
    patterns: ['Chain of responsibility (merge order)', 'Pure merge + persist at edges'],
    skill: '/zero-locators',
    prompt: 'support/agent-workflow/prompts/repos/locators.md',
    status: 'done',
    statusNote: 'lib/{merge,elements,ecommerce,shared} with subpath re-exports. Jest: test/locators.test.js. Learned selectors persist to Postgres first when a pool is available.',
  },
  {
    id: 'builders',
    name: 'Script builders',
    kind: 'package',
    pkg: '@zero/builders',
    path: 'packages/builders/',
    today: 'packages/builders/',
    purpose: 'Emit Playwright spec + Java/Selenium class as text. Same input, same output. Snapshot tested.',
    patterns: ['Builder', 'Template method', 'Pure functions'],
    skill: '/zero-builders',
    prompt: 'support/agent-workflow/prompts/repos/builders.md',
    status: 'done',
    statusNote: 'lib/{playwright,selenium,shared} with unified index + subpath re-exports. Jest: test/builders.test.js.',
  },
  {
    id: 'analyzer',
    name: 'URL analyzer',
    kind: 'package',
    pkg: '@zero/analyzer',
    path: 'packages/analyzer/',
    today: 'packages/analyzer/',
    purpose: 'Optional Playwright crawl that seeds BA when notes are short and no TC file is uploaded.',
    patterns: ['Strategy (light vs pro crawl)', 'Isolated Chromium from executor'],
    skill: '/zero-analyzer',
    prompt: 'support/agent-workflow/prompts/repos/analyzer.md',
    status: 'done',
    statusNote: 'Light and pro facades plus lib/{strategies,crawl,flows,generate,format,classify}. Chromium resolves only in @zero/executor; orchestrator fans out webAnalyzer jobs.',
  },
] as const;
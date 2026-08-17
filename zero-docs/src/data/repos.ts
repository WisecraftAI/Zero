import type { MigStatus } from './migration';

export type RepoKind = 'app' | 'web' | 'package';

export const REPO_KIND_LABEL: Record<RepoKind, string> = {
  app: 'Deployable app',
  web: 'Web bundle',
  package: 'Shared package',
};

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
 * Target workspaces. S2 created apps/*, packages/*, and web/. S5 still
 * split processes and images; until then npm start is one Node process.
 *
 * Each workspace has three names: Folder, npm package, Cursor skill.
 */
export const REPOS: readonly RepoDef[] = [
  {
    id: 'api',
    name: 'HTTP API',
    kind: 'app',
    pkg: '@zero/api',
    path: 'apps/api/',
    today: 'apps/api/server.js',
    purpose: 'Stateless HTTP intake. Auth, validate, persist metadata, presign uploads, publish runs.requested, stream SSE. Never launches Chromium.',
    patterns: ['Ports & adapters', 'Middleware pipeline', 'Transactional outbox', 'Config-once (zod env)'],
    skill: '/zero-api',
    prompt: 'agent-workflow/prompts/repos/api.md',
    status: 'partial',
    statusNote: 'Routes, auth, SSE, and presign live in @zero/api. Playwright is not a dependency. Still the composition root for the orchestrator until S5.',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator worker',
    kind: 'app',
    pkg: '@zero/orchestrator',
    path: 'apps/orchestrator/',
    today: 'apps/orchestrator/',
    purpose: 'Long-lived DAG worker. Consumes runs.requested, walks stageKeys, calls LLM/templates, fans out execution.requested, writes artifacts.',
    patterns: ['DAG walker', 'Strategy (one agent file)', 'LLM facade + template fallback', 'Idempotent (runId, stage) writes'],
    skill: '/zero-orchestrator',
    prompt: 'agent-workflow/prompts/repos/orchestrator.md',
    status: 'partial',
    statusNote: 'Workspace exists. In-process consumer in the API process. Own image is S5. Redis list queue is shared across containers when REDIS_URL is set.',
  },
  {
    id: 'executor',
    name: 'Playwright executor',
    kind: 'app',
    pkg: '@zero/executor',
    path: 'apps/executor/',
    today: 'apps/executor/',
    purpose: 'Ephemeral Playwright job. One browser context per batch. Uploads screenshots. Upserts learned locators. No HTTP server.',
    patterns: ['Worker / job', 'Semaphore (concurrency cap)', 'Command (step files)', 'finally-close context'],
    skill: '/zero-executor',
    prompt: 'agent-workflow/prompts/repos/executor.md',
    status: 'partial',
    statusNote: 'Own Playwright image in compose (apps/executor/Dockerfile). npm start still co-locates Chromium unless SKIP_EXECUTION_WORKER=1.',
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
    prompt: 'agent-workflow/prompts/repos/web.md',
    status: 'partial',
    statusNote: 'React 18 SPA works. Still polls; no SSE hook; no login screen; builds into public/.',
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
    prompt: 'agent-workflow/prompts/repos/cloud.md',
    status: 'partial',
    statusNote: 'local + aws + gcp adapters live in @zero/cloud. Azure / Vercel missing.',
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
    prompt: 'agent-workflow/prompts/repos/domain.md',
    status: 'partial',
    statusNote: 'stageKeys and appProfiles extracted. No zod schemas yet.',
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
    prompt: 'agent-workflow/prompts/repos/db.md',
    status: 'partial',
    statusNote: '@zero/db inits tables when DATABASE_URL is set. No migrations/ folder or migrate CLI.',
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
    prompt: 'agent-workflow/prompts/repos/locators.md',
    status: 'partial',
    statusNote: 'Merge works in @zero/locators. Learned selectors still process-memory first.',
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
    prompt: 'agent-workflow/prompts/repos/builders.md',
    status: 'partial',
    statusNote: 'Emitters work in @zero/builders. No snapshot suite yet.',
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
    prompt: 'agent-workflow/prompts/repos/analyzer.md',
    status: 'partial',
    statusNote: 'Crawlers work in @zero/analyzer. Still launched from the API process.',
  },
] as const;

export function reposOfKind(kind: RepoKind): readonly RepoDef[] {
  return REPOS.filter((r) => r.kind === kind);
}

export type MigStatus = 'done' | 'partial' | 'not-done';

export const STATUS_LABEL: Record<MigStatus, string> = {
  done: 'done',
  partial: 'partial',
  'not-done': 'not done',
};

/** Capability milestones M1–M7 — deployed across the split runtime. */
export const MILESTONES = [
  {
    id: 'M1',
    name: 'Durable store',
    status: 'done' as const,
    note: 'Postgres when DATABASE_URL / PGHOST is set (@zero/db). Maps still shadow some tables.',
  },
  {
    id: 'M2',
    name: 'Object store + signed URLs',
    status: 'done' as const,
    note: '@zero/cloud local HMAC URLs. artifacts/ static serving removed.',
  },
  {
    id: 'M3',
    name: 'Queue + orchestrator',
    status: 'done' as const,
    note: 'runs.requested + standalone @zero/orchestrator. Redis-backed in Compose.',
  },
  {
    id: 'M4',
    name: 'Execution farm',
    status: 'done' as const,
    note: 'execution.requested + @zero/executor. Playwright is absent from API and orchestrator images.',
  },
  {
    id: 'M5',
    name: 'Auth + ACL',
    status: 'partial' as const,
    note: 'Verified API keys / JWT + tenant scope. No OIDC login screen. ZERO_AUTH=off locally.',
  },
  {
    id: 'M6',
    name: 'LLM wiring',
    status: 'done' as const,
    note: '@zero/orchestrator/llm calls OpenAI / Claude / Gemini when a key exists; templates on miss.',
  },
  {
    id: 'M7',
    name: 'Multi-cloud adapters',
    status: 'done' as const,
    note: '@zero/cloud local|aws|gcp|azure|vercel. Default ZERO_CLOUD=local; vendor SDKs lazy-required.',
  },
] as const;

/** Packaging steps S0–S7 — the V3 repo split. All done. */
export const PACKAGING = [
  {
    id: 'S0',
    name: 'Containerize the monolith',
    status: 'done' as const,
    note: 'One Dockerfile + compose (Postgres / Redis / MinIO).',
  },
  {
    id: 'S1',
    name: 'Smoke tests',
    status: 'done' as const,
    note: 'Jest health + pipeline + Postgres persist/reload.',
  },
  {
    id: 'S2',
    name: 'Turn on workspaces',
    status: 'done' as const,
    note: 'Root is workspaces-only. Code lives in services/*, packages/*, web/.',
  },
  {
    id: 'S3',
    name: 'Split routes from stages',
    status: 'done' as const,
    note: 'Routes in services/api/src/routes/. processRun lives in @zero/orchestrator.',
  },
  {
    id: 'S4',
    name: 'Extract executor image',
    status: 'done' as const,
    note: 'Workspace-scoped executor image owns Playwright. API/orchestrator do not depend on @zero/executor.',
  },
  {
    id: 'S5',
    name: 'Extract orchestrator image',
    status: 'done' as const,
    note: 'Standalone orchestrator image; HTTP API contains no DAG or worker boot code.',
  },
  {
    id: 'S6',
    name: 'packages/cloud + infra',
    status: 'done' as const,
    note: '@zero/cloud azure + vercel adapters + GATE-9 conformance. Default remains local.',
  },
  {
    id: 'S7',
    name: 'Web image split + /api prefix drop',
    status: 'done' as const,
    note: 'SPA in zero-web nginx :3000; API on :3001 without /api prefix.',
  },
] as const;

/** Product milestones Q1–Q5 — autonomous any-URL QA. Q5 is the open one. */
export const PRODUCT = [
  {
    id: 'Q1',
    name: 'Deep crawl (multi-page)',
    status: 'done' as const,
    note: 'crawlLinkedPages in @zero/analyzer; crawledPages on webAnalysis.',
  },
  {
    id: 'Q2',
    name: 'Domain-driven major functional cases',
    status: 'done' as const,
    note: 'majorFunctionalCases.js; URL-only auto test generation.',
  },
  {
    id: 'Q3',
    name: 'Execute discovered flows',
    status: 'done' as const,
    note: 'discovered_flows execution mode; multi-step Playwright on critical flows.',
  },
  {
    id: 'Q4',
    name: 'AI domain inference gate',
    status: 'done' as const,
    note: 'domainInference LLM when websiteTypeConfidence < 0.5 or GENERIC.',
  },
  {
    id: 'Q5',
    name: 'Trustworthy site understanding and test-plan quality',
    status: 'not-done' as const,
    note: 'Reopened. Fixture benchmarks, one canonical classification contract, and behavioural release gates must prove better URL-only test plans.',
  },
] as const;

/** UX milestones U1–U2 — operator console. Parallel to Q5. */
export const UX = [
  {
    id: 'U1',
    name: 'Professional operator UI/UX',
    status: 'done' as const,
    note: 'Token-driven accessible SPA shell and daily flows. Spec: milestones/U1-professional-ui-ux.md.',
  },
  {
    id: 'U2',
    name: 'Ultra-low-friction canvas',
    status: 'done' as const,
    note: 'Single-canvas New Run, hover rail, progressive disclosure. Spec: milestones/U2-low-friction-canvas.md.',
  },
] as const;

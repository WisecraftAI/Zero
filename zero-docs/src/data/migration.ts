export type MigStatus = 'done' | 'partial' | 'not-done';

export const STATUS_LABEL: Record<MigStatus, string> = {
  done: 'done',
  partial: 'partial',
  'not-done': 'not done',
};

/** Capability milestones M1–M7 — landed inside today's one-process boot (`apps/api/server.js`). */
export const MILESTONES = [
  { id: 'M1', name: 'Durable store',          status: 'done' as const,     note: 'Postgres when DATABASE_URL / PGHOST is set (@zero/db). Maps still shadow some tables.' },
  { id: 'M2', name: 'Object store + signed URLs', status: 'done' as const, note: '@zero/cloud local HMAC URLs. artifacts/ static serving removed.' },
  { id: 'M3', name: 'Queue + orchestrator',   status: 'done' as const,     note: 'runs.requested + @zero/orchestrator. Default queue is still in-process.' },
  { id: 'M4', name: 'Execution farm',         status: 'done' as const,     note: 'execution.requested + @zero/executor. Default npm start still co-locates Chromium.' },
  { id: 'M5', name: 'Auth + ACL',             status: 'partial' as const,  note: 'Verified API keys / JWT + tenant scope. No OIDC login screen. ZERO_AUTH=off locally.' },
  { id: 'M6', name: 'LLM wiring',             status: 'done' as const,     note: '@zero/orchestrator/llm calls OpenAI / Claude / Gemini when a key exists; templates on miss.' },
  { id: 'M7', name: 'Multi-cloud adapters',   status: 'done' as const,     note: '@zero/cloud local|aws|gcp|azure|vercel. Default ZERO_CLOUD=local; vendor SDKs lazy-required.' },
] as const;

/** Packaging steps S0–S6 — the remaining V3 repo split. */
export const PACKAGING = [
  { id: 'S0', name: 'Containerize the monolith', status: 'done' as const,     note: 'One Dockerfile + compose (Postgres / Redis / MinIO).' },
  { id: 'S1', name: 'Smoke tests',               status: 'done' as const,     note: 'Jest health + pipeline + Postgres persist/reload.' },
  { id: 'S2', name: 'Turn on workspaces',        status: 'done' as const,     note: 'Root is workspaces-only. Code lives in apps/*, packages/*, web/. Still one process.' },
  { id: 'S3', name: 'Split routes from stages',  status: 'done' as const,     note: 'Routes in apps/api/src/routes/. processRun lives in @zero/orchestrator.' },
  { id: 'S4', name: 'Extract executor image',    status: 'done' as const,     note: 'apps/executor/Dockerfile + compose executor. @zero/api has no playwright. npm start still co-locates Chromium; compose skips the in-process worker.' },
  { id: 'S5', name: 'Extract orchestrator image',status: 'done' as const,     note: 'apps/orchestrator/Dockerfile + compose orchestrator. API_ONLY on app; worker does not boot the HTTP API.' },
  { id: 'S6', name: 'packages/cloud + infra',    status: 'done' as const,     note: '@zero/cloud azure + vercel adapters + GATE-9 conformance. Default remains local.' },
] as const;

/**
 * The start-to-report run contract from `web/public/architectureV2.html`.
 *
 * Single source for every view of the 36 hops: the Blueprint phase table and
 * the V3 "which workspace owns this hop" table both derive from `SEQUENCE`.
 * Keep step numbers aligned with the blueprint page — they are quoted in
 * `support/zero-docs/docs/v2/ARCHITECTURE.md` and in agent prompts.
 */

/** The infrastructure primitive a hop crosses. `control` marks loop bounds. */
export type SeqBoundary =
  | 'http'
  | 'object store'
  | 'postgres'
  | 'event bus'
  | 'redis'
  | 'secrets'
  | 'llm'
  | 'chromium'
  | 'control';

export interface SeqStep {
  n: number;
  /** Empty for `control` rows, which mark the fan-out loop. */
  from: string;
  to: string;
  op: string;
  crosses: SeqBoundary;
  /** npm package name of the owning workspace — matches `REPOS[].pkg`. */
  owner: string;
  /** Why the hop exists at all. Plain English, no jargon. */
  why: string;
}

export interface SeqPhase {
  id: 'A' | 'B' | 'C' | 'D';
  title: string;
  range: string;
  goal: string;
  steps: readonly SeqStep[];
}

export const SEQUENCE: readonly SeqPhase[] = [
  {
    id: 'A',
    title: 'Intake',
    range: 'steps 1–7',
    goal: 'The API accepts metadata, hands back signed upload URLs, records the run as queued, and announces it. File bytes never pass through the API process.',
    steps: [
      { n: 1, from: 'Client', to: 'API GW → API', op: 'POST /api/runs — metadata only', crosses: 'http', owner: '@zero/api', why: 'Only the small form fields travel here: URL, notes, options. No file bytes yet.' },
      { n: 2, from: 'API', to: 'Object store', op: 'presign PUT for tcFile / recordingFile', crosses: 'object store', owner: '@zero/cloud', why: 'The API asks storage for a temporary write ticket instead of buffering uploads itself.' },
      { n: 3, from: 'API', to: 'Client', op: '201 { runId, uploadUrls }', crosses: 'http', owner: '@zero/api', why: 'The browser now knows the run id and exactly where to put each file.' },
      { n: 4, from: 'Client', to: 'Object store', op: 'PUT files directly — bypasses the API', crosses: 'object store', owner: '@zero/web', why: 'A 40 MB CSV goes browser → bucket, so API memory does not scale with upload size.' },
      { n: 5, from: 'API', to: 'Postgres', op: 'INSERT qa_runs (status = queued)', crosses: 'postgres', owner: '@zero/db', why: 'The run becomes durable here. Restart the API now and the work is still queued.' },
      { n: 6, from: 'API', to: 'Event bus', op: 'publish runs.requested { runId }', crosses: 'event bus', owner: '@zero/cloud', why: 'A message, not a function call — any orchestrator replica can pick the run up.' },
      { n: 7, from: 'API', to: 'Client', op: 'open SSE /api/runs/:id/stream', crosses: 'http', owner: '@zero/api', why: 'One long-lived channel, so the UI sees stage progress without polling.' },
    ],
  },
  {
    id: 'B',
    title: 'Plan',
    range: 'steps 8–19',
    goal: 'The orchestrator rebuilds every input from durable storage — the message carried only a run id — then runs BA, Manual QA, and Automation QA. No browser starts in this phase.',
    steps: [
      { n: 8, from: 'Bus', to: 'Orchestrator', op: 'deliver runs.requested', crosses: 'event bus', owner: '@zero/orchestrator', why: 'The worker is woken by the queue; it was holding nothing in memory beforehand.' },
      { n: 9, from: 'Orch', to: 'Postgres', op: 'SELECT run', crosses: 'postgres', owner: '@zero/db', why: 'The message carried only an id, so the full run is re-read from the source of truth.' },
      { n: 10, from: 'Orch', to: 'Object store', op: 'GET inputs uploaded at step 4', crosses: 'object store', owner: '@zero/cloud', why: 'Fetch the files the browser uploaded, wherever they physically live.' },
      { n: 11, from: 'Orch', to: 'Secrets manager', op: 'fetch LLM + login secrets', crosses: 'secrets', owner: '@zero/cloud', why: 'Credentials are pulled at the moment of use, never stored on the run record.' },
      { n: 12, from: 'Orch', to: 'LLM', op: 'BA agent prompt', crosses: 'llm', owner: '@zero/orchestrator', why: 'Turns the URL, notes, and Figma link into structured requirements.' },
      { n: 13, from: 'LLM', to: 'Orch', op: 'requirements', crosses: 'llm', owner: '@zero/orchestrator', why: 'The model answers. Templates stay the base when no provider key is configured.' },
      { n: 14, from: 'Orch', to: 'Postgres', op: 'persist artifacts.requirements', crosses: 'postgres', owner: '@zero/db', why: 'Written down immediately, so a crash after this point never re-pays for the BA call.' },
      { n: 15, from: 'Orch', to: 'Redis pub/sub', op: 'state ba:done — API relays to SSE', crosses: 'redis', owner: '@zero/cloud', why: 'The orchestrator has no socket to the browser. Redis carries progress to whichever API replica holds the stream.' },
      { n: 16, from: 'Orch', to: 'LLM', op: 'Manual QA + Automation QA prompts', crosses: 'llm', owner: '@zero/orchestrator', why: 'Requirements become test cases plus a selector plan.' },
      { n: 17, from: 'LLM', to: 'Orch', op: 'test cases + selector plan', crosses: 'llm', owner: '@zero/orchestrator', why: 'What to test, and how to find each element on the page.' },
      { n: 18, from: 'Orch', to: 'Postgres', op: 'merge with element_locators by host', crosses: 'postgres', owner: '@zero/locators', why: 'Selectors that worked on earlier runs of the same host beat freshly guessed ones.' },
      { n: 19, from: 'Orch', to: 'Event bus', op: 'publish execution.requested per batch', crosses: 'event bus', owner: '@zero/cloud', why: 'Work is split into batches so many workers can run them at the same time.' },
    ],
  },
  {
    id: 'C',
    title: 'Execute',
    range: 'steps 20–28 · loop per TC batch',
    goal: 'Every batch is a self-contained job — its own secrets, its own inputs, its own Chromium, its own uploads. Batches run in parallel and share nothing.',
    steps: [
      { n: 20, from: '', to: '', op: 'loop per TC batch (fan-out) — steps 21–27 repeat, in parallel', crosses: 'control', owner: '@zero/orchestrator', why: 'Loop marker: everything below runs once per batch.' },
      { n: 21, from: 'Bus', to: 'Execution worker', op: 'deliver execution.requested', crosses: 'event bus', owner: '@zero/executor', why: 'Workers compete for jobs off the queue. Add workers to go faster.' },
      { n: 22, from: 'Job', to: 'Secrets manager', op: 'pull runtime login secret', crosses: 'secrets', owner: '@zero/cloud', why: 'The password reaches the job directly and is never written into the queue message.' },
      { n: 23, from: 'Job', to: 'Object store', op: 'download recording (if any)', crosses: 'object store', owner: '@zero/cloud', why: 'Optional recorded flow for the job to replay.' },
      { n: 24, from: 'Job', to: 'Playwright chromium', op: 'isolated container run', crosses: 'chromium', owner: '@zero/executor', why: 'The only place a real browser runs. A hung Chromium takes down one job, not the API.' },
      { n: 25, from: 'Job', to: 'Object store', op: 'PUT screenshots + traces', crosses: 'object store', owner: '@zero/cloud', why: 'Evidence is uploaded before the container is discarded.' },
      { n: 26, from: 'Job', to: 'Postgres', op: 'upsert element_locators (learned)', crosses: 'postgres', owner: '@zero/locators', why: 'Selectors that actually resolved are saved, so the next run of this host starts smarter.' },
      { n: 27, from: 'Job', to: 'Event bus', op: 'publish execution.completed', crosses: 'event bus', owner: '@zero/cloud', why: 'The job’s only reply channel. It then exits and forgets everything.' },
      { n: 28, from: '', to: '', op: 'end loop', crosses: 'control', owner: '@zero/orchestrator', why: 'End of the per-batch fan-out.' },
    ],
  },
  {
    id: 'D',
    title: 'Report',
    range: 'steps 29–36',
    goal: 'Aggregate the batch results, write the Manager and Delivery reports, mark the run complete — then hand the client a signed URL instead of proxying bytes through the API.',
    steps: [
      { n: 29, from: 'Bus', to: 'Orchestrator', op: 'aggregate execution.completed', crosses: 'event bus', owner: '@zero/orchestrator', why: 'Batch results arrive in any order and are counted until the fan-out is satisfied.' },
      { n: 30, from: 'Orch', to: 'Postgres', op: 'write executionReport', crosses: 'postgres', owner: '@zero/db', why: 'One consolidated execution result for the whole run.' },
      { n: 31, from: 'Orch', to: 'LLM', op: 'Manager + Delivery prompts', crosses: 'llm', owner: '@zero/orchestrator', why: 'Turns raw pass/fail data into the executive review and the stakeholder report.' },
      { n: 32, from: 'Orch', to: 'Postgres', op: 'qa_runs.status = completed', crosses: 'postgres', owner: '@zero/db', why: 'The single authoritative statement that this run is finished.' },
      { n: 33, from: 'Orch', to: 'Redis pub/sub', op: 'state completed → SSE', crosses: 'redis', owner: '@zero/cloud', why: 'The UI flips to done without a reload.' },
      { n: 34, from: 'Client', to: 'API', op: 'GET /api/runs/:id/download', crosses: 'http', owner: '@zero/web', why: 'The user asks for the report bundle.' },
      { n: 35, from: 'API', to: 'Object store', op: 'presign GET (report + screenshots)', crosses: 'object store', owner: '@zero/cloud', why: 'A short-lived read ticket — artifacts are never publicly served.' },
      { n: 36, from: 'API', to: 'Client', op: '302 signed URL', crosses: 'http', owner: '@zero/api', why: 'The browser pulls bytes straight from storage; the API never proxies the payload.' },
    ],
  },
] as const;

export const SEQ_STEPS: readonly SeqStep[] = SEQUENCE.flatMap((p) => p.steps);

/** Hops that still run in one process under the default `ZERO_CLOUD=local`. */
export const SEQ_IN_PROCESS_TODAY: readonly number[] = [
  1, 2, 3, 4, 5, 6, 8, 19, 20, 21, 22, 23, 24, 25, 26, 27,
];

/** Boundary counts, ordered most-crossed first. `control` rows are excluded. */
export function seqBoundaryCounts(): ReadonlyArray<{ boundary: SeqBoundary; count: number }> {
  const counts = new Map<SeqBoundary, number>();
  for (const step of SEQ_STEPS) {
    if (step.crosses === 'control') continue;
    counts.set(step.crosses, (counts.get(step.crosses) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([boundary, count]) => ({ boundary, count }))
    .sort((a, b) => b.count - a.count || a.boundary.localeCompare(b.boundary));
}

/** Step numbers each workspace owns, ordered by first appearance in the flow. */
export function seqStepsByOwner(): ReadonlyArray<{ owner: string; steps: readonly number[] }> {
  const byOwner = new Map<string, number[]>();
  for (const step of SEQ_STEPS) {
    const existing = byOwner.get(step.owner);
    if (existing) existing.push(step.n);
    else byOwner.set(step.owner, [step.n]);
  }
  return [...byOwner.entries()].map(([owner, steps]) => ({ owner, steps }));
}

/** Collapse [1,2,3,7] into "1–3, 7" for compact step-range labels. */
export function formatStepRanges(steps: readonly number[]): string {
  const sorted = [...steps].sort((a, b) => a - b);
  const first = sorted[0];
  if (first === undefined) return '';

  const ranges: string[] = [];
  let start = first;
  let prev = first;

  for (const n of sorted.slice(1)) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = n;
    prev = n;
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges.join(', ');
}

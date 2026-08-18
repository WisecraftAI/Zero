import { Note } from '@/components/ui/Note';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { formatStepRanges, seqStepsByOwner, SEQ_STEPS } from '@/data/sequence';
import { REPOS } from '@/data/repos';

/** Sentence per workspace: what it is responsible for at the hops it owns. */
const OWNER_ROLE: Record<string, string> = {
  '@zero/api': 'Validates and authorizes intake, then answers the client — 201 with upload URLs, the SSE stream, and the signed-download redirect. Holds no run state.',
  '@zero/web': 'Uploads files straight to the object store and asks for the finished bundle. Never sees a secret or an artifact byte through the API.',
  '@zero/cloud': 'Every infrastructure hop: presign, publish, deliver, secrets fetch, blob get/put, Redis publish. The only place a vendor SDK is imported.',
  '@zero/db': 'Owns the qa_runs lifecycle and artifact writes — the queued row, each stage artifact, the execution report, and the terminal completed status.',
  '@zero/orchestrator': 'Walks the DAG: rebuilds context, prompts BA / Manual / Automation / Manager / Delivery, fans out batches, and aggregates the results.',
  '@zero/executor': 'Consumes one batch, drives Chromium in its own container, and exits. The only workspace where Playwright resolves.',
  '@zero/locators': 'Merges profile, memory, and Postgres selectors before execution, then upserts the selectors that actually resolved.',
};

export function Sequence() {
  const byOwner = seqStepsByOwner();
  const rows = byOwner.map(({ owner, steps }) => {
    const repo = REPOS.find((r) => r.pkg === owner);
    return [
      <code key={owner}>{owner}</code>,
      repo?.path ?? '—',
      formatStepRanges(steps),
      String(steps.length),
      OWNER_ROLE[owner] ?? repo?.purpose ?? '',
    ];
  });

  return (
    <section className="section" id="v3-sequence">
      <h2>Sequence · which workspace owns each hop</h2>
      <p className="sub">
        The same {SEQ_STEPS.length}-step start-to-report contract, resolved to owners. The executor
        and orchestrator hops are real process boundaries. Every row is derived from the numbered
        flow — the two views cannot drift apart.
      </p>
      <ProvidersTable
        headers={['npm package', 'Folder', 'Steps owned', 'Hops', 'Responsibility at those hops']}
        rows={rows}
        caption="Ordered by first appearance in the run"
      />
      <Note tone="info">
        Read the numbered list on the{' '}
        <a href="#sequence">Production Blueprint sequence</a> for the operation at each step. This
        section answers one question only: <em>which workspace do I open to change that hop?</em>{' '}
        Note that <code>@zero/cloud</code> owns the most hops by design — centralizing them is
        what makes <code>ZERO_CLOUD</code> switchable.
      </Note>
    </section>
  );
}

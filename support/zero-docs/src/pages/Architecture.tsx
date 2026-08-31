import { JumpNav } from '@/components/layout/JumpNav';
import { Note } from '@/components/ui/Note';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MILESTONES, PACKAGING, PRODUCT, UX } from '@/data/migration';
import { BlueprintPage } from './Blueprint';
import { V3Page } from './v3';

const JUMP = [
  { href: '#tiers', label: 'Tiers' },
  { href: '#sequence', label: 'Sequence', hot: true },
  { href: '#v3-repos', label: 'Workspaces' },
  { href: '#tech-schema', label: 'Schema' },
  { href: '#v3-docker', label: 'Docker' },
  { href: '#v3-smell', label: 'Gates' },
] as const;

/** Both tracks in one strip — the detail lived in the milestone specs, not here. */
function Score() {
  const rows = [
    ...MILESTONES.map((m) => ['capability', m.id, m.name, m.status, m.note] as const),
    ...PACKAGING.map((s) => ['packaging', s.id, s.name, s.status, s.note] as const),
    ...PRODUCT.map((q) => ['product', q.id, q.name, q.status, q.note] as const),
    ...UX.map((u) => ['ux', u.id, u.name, u.status, u.note] as const),
  ];

  return (
    <section className="section" id="arch-score">
      <h2>Milestone score · capability M1–M7 · packaging S0–S7 · product Q1–Q5 · UX U1–U3</h2>
      <p className="sub">
        Scored against <code>support/agent-workflow/progress.json</code> and the live tree.
        Capability and packaging are closed, and so is Q1–Q4. <code>Q5</code> is the open
        product gate (plan on <a href="#next-milestone">Next Milestone</a>). <code>U1</code>–
        <code>U2</code> UX gates are closed; <code>U3</code> (RTK Query store) is open — plan on
        Next Milestone → <a href="#u3-store">U3 Store</a> (spec{' '}
        <code>milestones/U3-redux-store.md</code>). Specs live
        in <code>support/agent-workflow/milestones/</code>.
      </p>
      <ProvidersTable
        caption="Run npm run workflow:status to re-probe all tracks against the current branch."
        headers={['Track', 'ID', 'Name', 'Status', 'What it means today']}
        rows={rows.map(([track, id, name, status, note]) => [
          track,
          <code key={`${id}-id`}>{id}</code>,
          name,
          <StatusBadge key={`${id}-st`} status={status} />,
          note,
        ])}
      />
      <Note tone="info">
        Only <code>M5</code> is <StatusBadge status="partial" /> — API keys and JWT are verified,
        but there is no OIDC login UI. Remaining production work is ops maturity, tracked on{' '}
        <a href="#checklist">Ship Checklist</a>.
      </Note>
    </section>
  );
}

export function ArchitecturePage() {
  return (
    <>
      <section className="section" id="arch-intro">
        <h2>Architecture · AI orchestration system</h2>
        <p className="sub">
          How the agent pipeline is deployed: SPA on nginx <code>:3000</code>, stateless API on{' '}
          <code>:3001</code> (no <code>/api</code> prefix), long-lived orchestrator workers that
          call LLMs and walk the DAG, and ephemeral Playwright executors. Capability M1–M7,
          packaging S0–S7, and product Q1–Q4 are <StatusBadge status="done" />; product{' '}
          <code>Q5</code> is open; UX <code>U1</code>–<code>U2</code> are done;{' '}
          <code>U3</code> (RTK Query store) is <StatusBadge status="not-done" />.
        </p>
        <Note tone="info">
          Markdown twins: <code>docs/v1/ARCHITECTURE.md</code> (what ships) and{' '}
          <code>docs/v2/ARCHITECTURE.md</code> (target + remaining ops/IDE gaps). Per-workspace LLD:{' '}
          <a href="#tech-stack">Tech Stack</a>. Postgres ER:{' '}
          <a href="#tech-schema">Tech → Schema · ER</a> (<code>docs/v1/DATABASE.md</code>). Product
          purpose: <a href="#overview">Overview</a>.
        </Note>
      </section>

      <JumpNav links={JUMP} ariaLabel="Architecture jump" />
      <BlueprintPage />
      <V3Page />
      <Score />
    </>
  );
}

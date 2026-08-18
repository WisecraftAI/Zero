import { JumpNav } from '@/components/layout/JumpNav';
import { Note } from '@/components/ui/Note';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MILESTONES, PACKAGING } from '@/data/migration';
import { BlueprintPage } from './Blueprint';
import { V3Page } from './v3';

const JUMP = [
  { href: '#tiers',      label: 'Tiers' },
  { href: '#sequence',   label: 'Sequence', hot: true },
  { href: '#v3-repos',   label: 'Workspaces' },
  { href: '#tech-schema', label: 'Schema' },
  { href: '#v3-docker',  label: 'Docker' },
  { href: '#v3-smell',   label: 'Gates' },
] as const;

/** Both tracks in one strip — the detail lived in the milestone specs, not here. */
function Score() {
  const rows = [
    ...MILESTONES.map((m) => ['capability', m.id, m.name, m.status, m.note] as const),
    ...PACKAGING.map((s) => ['packaging', s.id, s.name, s.status, s.note] as const),
  ];

  return (
    <section className="section" id="arch-score">
      <h2>Milestone score · capability M1–M7 · packaging S0–S6</h2>
      <p className="sub">
        Scored against <code>support/agent-workflow/progress.json</code> and the live tree. Both
        tracks are complete; this table is the audit trail, not a plan. Specs live in{' '}
        <code>support/agent-workflow/milestones/</code>.
      </p>
      <ProvidersTable
        caption="Run npm run workflow:status to re-probe both tracks against the current branch."
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
        Only <code>M5</code> is <StatusBadge status="partial" /> — API keys and JWT are verified, but
        there is no OIDC login UI. Remaining production work is ops maturity, tracked on{' '}
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
          How the agent pipeline is deployed: stateless API intake, long-lived orchestrator workers
          that call LLMs and walk the DAG, and ephemeral Playwright executors. Capability M1–M7 and
          packaging S0–S6 are <StatusBadge status="done" />.
        </p>
        <Note tone="info">
          For per-workspace LLD, libraries, LOC, design patterns, and generated module trees, use{' '}
          <a href="#tech-stack">Tech Stack</a>. Postgres ER and column catalog:{' '}
          <a href="#tech-schema">Tech → Schema · ER</a> (markdown twin{' '}
          <code>docs/v1/DATABASE.md</code>). For product purpose and how people use ZER0, stay on{' '}
          <a href="#overview">Overview</a>.
        </Note>
      </section>

      <JumpNav links={JUMP} ariaLabel="Architecture jump" />
      <BlueprintPage />
      <V3Page />
      <Score />
    </>
  );
}

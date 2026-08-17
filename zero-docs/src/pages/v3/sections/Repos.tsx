import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  REPO_KIND_LABEL,
  REPOS,
  reposOfKind,
  type RepoDef,
  type RepoKind,
} from '@/data/repos';
import styles from './Repos.module.scss';

const KINDS: readonly RepoKind[] = ['app', 'web', 'package'];

function RepoCards({ kind }: { kind: RepoKind }) {
  const repos = reposOfKind(kind);
  return (
    <div className={styles.kind}>
      <h3>{REPO_KIND_LABEL[kind]}</h3>
      <CardGrid columns={2}>
        {repos.map((r) => (
          <RepoCard key={r.id} repo={r} />
        ))}
      </CardGrid>
    </div>
  );
}

function RepoCard({ repo: r }: { repo: RepoDef }) {
  return (
    <Card
      title={
        <>
          {r.name} <StatusBadge status={r.status} />
        </>
      }
    >
      <p>
        <strong>Folder:</strong> <code>{r.path}</code>
      </p>
      <p>
        <strong>npm package:</strong> <code>{r.pkg}</code>
      </p>
      <p>
        <strong>Cursor skill:</strong> <code>{r.skill}</code>
      </p>
      <p>
        <strong>Prompt file:</strong> <code>{r.prompt}</code>
      </p>
      <p>
        <strong>Edit now:</strong> <code>{r.today}</code>
      </p>
      <p><strong>Job:</strong> {r.purpose}</p>
      <p>
        <strong>Patterns:</strong> {r.patterns.join(' · ')}
      </p>
      <p>{r.statusNote}</p>
    </Card>
  );
}

export function Repos() {
  return (
    <section className="section" id="v3-repos">
      <h2>Target workspaces · workspace, folder, npm package, Cursor skill</h2>
      <p className="sub">
        Ten workspaces. Ask Cursor with the Cursor skill. Import the npm package. Open the folder.
        Read the prompt file before editing.
      </p>

      <ProvidersTable
        caption="One row = one workspace. Folder, npm package, and Cursor skill are three names for that row."
        headers={['Workspace', 'Folder', 'npm package', 'Cursor skill', 'Prompt file', 'Status']}
        rows={REPOS.map((r) => [
          r.name,
          <code key={`${r.id}-path`}>{r.path}</code>,
          <code key={`${r.id}-pkg`}>{r.pkg}</code>,
          <code key={`${r.id}-skill`}>{r.skill}</code>,
          <code key={`${r.id}-prompt`}>{r.prompt.replace('agent-workflow/', '')}</code>,
          <StatusBadge key={`${r.id}-st`} status={r.status} />,
        ])}
      />

      {KINDS.map((kind) => (
        <RepoCards key={kind} kind={kind} />
      ))}

      <Note tone="info">
        Shared rule: apps never import sibling <code>apps/*</code>. Only{' '}
        <code>@zero/cloud</code> may import vendor SDKs. Domain packages have zero Express /
        Playwright / AWS imports.
      </Note>
    </section>
  );
}

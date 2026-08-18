import { Card, CardGrid } from '@/components/ui/Card';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { REPO_NAME_KINDS, REPOS, repoTreeLabel } from '@/data/repos';

function byId(id: string) {
  const repo = REPOS.find((r) => r.id === id);
  if (repo === undefined) {
    throw new Error(`Unknown workspace id: ${id}`);
  }
  return repo;
}

export function Repos() {
  const api = byId('api');
  const orch = byId('orchestrator');
  const exec = byId('executor');
  const web = byId('web');
  const cloud = byId('cloud');
  const domain = byId('domain');
  const locators = byId('locators');
  const builders = byId('builders');
  const analyzer = byId('analyzer');
  const db = byId('db');

  return (
    <section className="section" id="v3-repos">
      <h2>Workspaces · folder, npm package, Cursor skill</h2>
      <p className="sub">
        Ten workspaces on disk. Each has <strong>three names</strong> — they are not three repos.
        Open the folder, import the npm package, say the Cursor skill.
      </p>

      <CardGrid columns={3}>
        {REPO_NAME_KINDS.map((kind) => (
          <Card key={kind.id} title={kind.label}>
            <p>{kind.meaning}</p>
            <p><code>{api[kind.exampleKey]}</code></p>
          </Card>
        ))}
      </CardGrid>

      <Diagram ariaLabel="Monorepo folder tree with workspace, npm package, and Cursor skill">
{`zero/
├─ package.json                  workspaces root · no app code, no runtime deps
├─ docker-compose.yml            full local stack
│
├─ services/                     deployable services (one image each)
│  ├─ api/                       ${repoTreeLabel(api)}
│  │  ├─ server.js               HTTP composition root (no workers)
│  │  └─ src/routes/             runs · recordings · locators · settings · cms · keys · health
│  ├─ orchestrator/              ${repoTreeLabel(orch)}
│  │  └─ worker.js               consumes runs.requested
│  └─ executor/                  ${repoTreeLabel(exec)}
│     └─ main.js                 consumes execution.requested · Chromium only here
│
├─ packages/                     shared libs · import by npm package, never by relative path
│  ├─ cloud/                     ${repoTreeLabel(cloud)}
│  ├─ domain/                    ${repoTreeLabel(domain)}
│  ├─ locators/                  ${repoTreeLabel(locators)}
│  ├─ builders/                  ${repoTreeLabel(builders)}
│  ├─ analyzer/                  ${repoTreeLabel(analyzer)}
│  └─ db/                        ${repoTreeLabel(db)}
│
├─ web/                          ${repoTreeLabel(web)}
│  └─ src/{views, components, layouts}
│
├─ dist/                         regenerable · web/ · artifacts/ · coverage/ · logs/
├─ infra/{aws,gcp,azure}/        terraform per provider (M7)
└─ support/                      agent-workflow · zero-docs · ml-training · samples`}
      </Diagram>

      <ProvidersTable
        caption="One row = one workspace. Remaining is product polish, not packaging work."
        headers={['Workspace', 'Folder', 'npm package', 'Cursor skill', 'Status', 'Remaining']}
        rows={REPOS.map((r) => [
          r.name,
          <code key={`${r.id}-path`}>{r.path}</code>,
          <code key={`${r.id}-pkg`}>{r.pkg}</code>,
          <code key={`${r.id}-skill`}>{r.skill}</code>,
          <StatusBadge key={`${r.id}-st`} status={r.status} />,
          r.statusNote,
        ])}
      />

      <Note tone="info">
        Shared rule: services never import sibling <code>services/*</code>. Only{' '}
        <code>@zero/cloud</code> may import vendor SDKs. Domain packages have zero Express /
        Playwright / AWS imports. Per-workspace libraries, LOC, and design patterns live on{' '}
        <a href="#tech-stack">Tech Stack</a>; prompt files are listed on{' '}
        <a href="#make-real">Make it Real</a>.
      </Note>
    </section>
  );
}

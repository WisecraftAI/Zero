import { Card, CardGrid } from '@/components/ui/Card';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';
import { REPO_NAME_KINDS, REPOS, repoTreeLabel } from '@/data/repos';
import styles from './Layout.module.scss';

function byId(id: string) {
  const repo = REPOS.find((r) => r.id === id);
  if (repo === undefined) {
    throw new Error(`Unknown workspace id: ${id}`);
  }
  return repo;
}

export function Layout() {
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
    <section className="section" id="v3-layout">
      <h2>Target V3 repo layout</h2>
      <p className="sub">
        npm workspaces. Each workspace has <strong>three names</strong> — folder, npm package,
        Cursor skill — not three repos.
      </p>

      <div className={styles.legend}>
        <CardGrid columns={3}>
          {REPO_NAME_KINDS.map((kind) => (
            <Card key={kind.id} title={kind.label}>
              <p>{kind.meaning}</p>
              <p><code>{api[kind.exampleKey]}</code></p>
            </Card>
          ))}
        </CardGrid>
      </div>

      <Diagram ariaLabel="Target V3 monorepo folder tree with workspace, npm package, and Cursor skill">
{`zero/
├─ package.json                  workspaces root · no app code, no runtime deps
├─ docker-compose.yml            full local stack
│
├─ apps/                         deployable services (one image each after S4–S5)
│  ├─ api/                       ${repoTreeLabel(api)}
│  │  ├─ server.js               composition root (wires routes + in-process workers)
│  │  └─ src/routes/             runs · recordings · locators · settings · cms · keys · health
│  ├─ orchestrator/              ${repoTreeLabel(orch)}
│  │  └─ worker.js               consumes runs.requested
│  └─ executor/                  ${repoTreeLabel(exec)}
│     └─ main.js                 consumes execution.requested
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
├─ infra/{aws,gcp,azure}/        terraform per provider (M7)
├─ agent-workflow/               M1–M7 done · packaging S3–S6 · per-workspace prompts
└─ artifacts/                    DELETED — replaced by object store (MinIO local, S3 prod)`}
      </Diagram>

      <Note tone="info">
        Tell an agent the <strong>Cursor skill</strong> (<code>/zero-api</code>). Import the{' '}
        <strong>npm package</strong> (<code>@zero/api</code>). Open the <strong>folder</strong>{' '}
        (<code>apps/api/</code>). The roster under Target workspaces lists all ten.
      </Note>
    </section>
  );
}

import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';

export function Layout() {
  return (
    <section className="section" id="v3-layout">
      <h2>Target V3 repo layout</h2>
      <p className="sub">npm workspaces. Three deployable apps, one web bundle, shared packages, one image per app.</p>

      <Diagram ariaLabel="Target V3 monorepo folder tree">
{`zero/
├─ package.json                  workspaces root · no app code, no runtime deps
├─ docker-compose.yml            full local stack (7 services)
├─ .dockerignore · .env.example
│
├─ apps/                         one deployable service per folder
│  ├─ api/                       stateless intake · never launches Chromium
│  │  ├─ Dockerfile              node:20-alpine · ~180 MB
│  │  └─ src/{server.js, config.js, routes/, http/, sse/}
│  │
│  ├─ orchestrator/              long-lived worker · consumes runs.requested
│  │  ├─ Dockerfile              node:20-alpine · no browser
│  │  └─ src/{worker.js, dag.js, agents/, llm/, prompts/}
│  │
│  └─ executor/                  ephemeral job · consumes execution.requested
│     ├─ Dockerfile              mcr…/playwright:v1.52-jammy · ~1.6 GB
│     └─ src/{worker.js, semaphore.js, browser.js, steps/, passes/}
│
├─ packages/                     shared libs · imported by name, not by path
│  ├─ cloud/                     queue · objectStore · secrets · cache
│  ├─ domain/                    stageKeys · appProfiles · zod schemas
│  ├─ locators/                  locatorRegistry · elementLogger
│  ├─ builders/                  scriptBuilder · javaSeleniumBuilder
│  ├─ analyzer/                  urlAnalyzer · urlAnalyzerPro
│  └─ db/                        pg pool · schema · migrations/
│
├─ web/                          React 18 + Vite · nginx image
│  ├─ Dockerfile                 build → nginx:alpine · ~25 MB
│  └─ src/{views, components, layouts, data/}
│
├─ infra/{aws,gcp,azure}/        terraform per provider (M7)
├─ agent-workflow/               M1–M7 milestones · progress.json
└─ artifacts/                    DELETED — replaced by object store (MinIO local, S3 prod)`}
      </Diagram>

      <Note tone="info">
        <strong>The rule that fixes root npm:</strong> the root <code>package.json</code> declares{' '}
        <code>&quot;workspaces&quot;: [&quot;apps/*&quot;, &quot;packages/*&quot;, &quot;web&quot;]</code>{' '}
        and <em>zero</em> runtime dependencies. Every dependency belongs to the workspace that
        imports it — which is what keeps <code>playwright</code> out of the API image.
      </Note>
    </section>
  );
}

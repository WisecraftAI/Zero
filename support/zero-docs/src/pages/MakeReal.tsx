import { Card, CardGrid } from '@/components/ui/Card';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { PromptBlock } from '@/components/ui/PromptBlock';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { REPOS } from '@/data/repos';

const NORTH_STAR = `You are implementing ZER0 (ai-qa-orchestrator) so the Target architecture on zero-docs (Architecture tab) becomes the live runtime. Do not invent a different cloud shape.

## Ground truth (read before coding)
1. AGENTS.md — layout, pipeline, conventions
2. zero-docs (this site) — target, sequence, per-workspace patterns, done/not-done
3. public/architectureV2.html — reference HTML (same blueprint)
4. support/agent-workflow/WORKFLOW.md + prompts/packaging.md (S3–S6) + prompts/target-arch.md (M1–M7, frozen)
5. support/agent-workflow/prompts/repos/<name>.md for the workspace you are touching
6. Live code: services/api/server.js (HTTP API composition root) + packages/* + web/

Each workspace has three names — not three repos:
- Folder (path on disk): services/api/
- npm package (import name): @zero/api
- Cursor skill (slash command): /zero-api
Roster: support/agent-workflow/prompts/repos/README.md

## North-star shape
- HTTP API — auth, intake, SSE, signed URLs. Never Chromium. Folder services/api/ · npm @zero/api · skill /zero-api
- Orchestrator worker — BA · Manual · Automation · Manager · Delivery, LLM, DAG. Consumes runs.requested. Folder services/orchestrator/ · npm @zero/orchestrator · skill /zero-orchestrator
- Playwright executor — jobs on execution.requested. Folder services/executor/ · npm @zero/executor · skill /zero-executor
Talk only through Cloud adapters: folder packages/cloud/ · npm @zero/cloud · skill /zero-cloud
  (queue · object store · DB · cache · secrets).

## How to work
1. npm run workflow:status
2. If the user named a workspace, read that prompt and invoke its Cursor skill (/zero-web, /zero-api, …).
3. If they asked to advance architecture, implement the earliest unfinished packaging step (S3–S6). Do not re-do M1–M4.
4. Small PR. Preserve stageKeys order and locator merge.
5. npm run workflow:verify. Ask before destructive migrations or public API breaks.`;

export function MakeRealPage() {
  return (
    <>
      <section className="section" id="what-is-workflow">
        <h2>What is agent-workflow?</h2>
        <p className="sub">
          A state machine in <code>support/agent-workflow/</code> that kept coding agents on the
          Target architecture. Capability M1–M7 and packaging S0–S6 are complete — use it now to
          verify boundaries and scope per-workspace edits. For system parts, read{' '}
          <a href="#architecture">Architecture</a> and <a href="#tech-stack">Tech Stack</a>.
        </p>
        <Diagram ariaLabel="Agent workflow loop">
{`  DETECT  →  PLAN (planner.md)  →  IMPLEMENT (implementer + repo skill)  →  VERIFY
                                                                      │
                                                                      ▼
                                                         ADVANCE progress.json
                                                                      │
                                                         STOP / ASK if blocked`}
        </Diagram>
        <CardGrid columns={2}>
          <Card title="Capability track · M1–M7">
            <p>
              Durable store → object store → queue → execution farm → auth → LLM → multi-cloud.
              Probes live in <code>scripts/detect-milestone.js</code> and{' '}
              <code>verify-milestone.js</code>. Status in <code>progress.json</code>.{' '}
              <StatusBadge status="done" /> at the probe floor.
            </p>
          </Card>
          <Card title="Packaging track · S0–S6">
            <p>
              Workspaces, split routes, executor image, orchestrator image, and Azure/Vercel +
              GATE-9 are <StatusBadge status="done" />. Specs in{' '}
              <code>milestones/S*-*.md</code>. Day-to-day coding uses per-workspace skills; do not
              invent a new packaging milestone.
            </p>
          </Card>
        </CardGrid>
      </section>

      <section className="section" id="how-dev-codes">
        <h2>How a developer codes with it</h2>
        <p className="sub">Four ways in. Same ground truth. Never skip verify.</p>
        <ol className="compact">
          <li>
            <strong>See status.</strong> Open this site, or run{' '}
            <code>npm run workflow:status</code>, or open{' '}
            <code>http://localhost:5175/status</code> after <code>docker compose up workflow</code>.
          </li>
          <li>
            <strong>Pick the lane.</strong> Understanding parts → Architecture / Tech Stack tabs.
            Changing one workspace → that repo&apos;s skill (<code>/zero-api</code>,{' '}
            <code>/zero-web</code>, …). Boundary checks after a split-sensitive change →{' '}
            <code>npm run workflow:verify -- --milestone S6</code>. Explaining only →{' '}
            <code>/zero-architecture</code>.
          </li>
          <li>
            <strong>Agent reads the prompt.</strong> Mandatory first files:{' '}
            <code>support/agent-workflow/WORKFLOW.md</code>, the matching{' '}
            <code>prompts/repos/&lt;name&gt;.md</code>, and today&apos;s source path listed there.
          </li>
          <li>
            <strong>Plan → implement → verify.</strong> Role prompts:{' '}
            <code>agents/planner.md</code>, <code>agents/implementer.md</code>,{' '}
            <code>agents/verifier.md</code>. Then{' '}
            <code>npm run workflow:verify -- --milestone S6</code> (or the named S / M id).
          </li>
          <li>
            <strong>Say what flipped.</strong> Done vs not-done on this site must stay honest.
            Update <code>progress.json</code> only after verify exits 0.
          </li>
        </ol>
        <CodeBlock lang="bash" label="developer commands">
{`# 1. Where are we?
npm run workflow:status

# 2. In Cursor, ask one of:
#    /zero-target-arch          → packaging track (S0–S6 done)
#    /zero-api                  → HTTP API · folder services/api/ · npm @zero/api
#    /zero-orchestrator         → Orchestrator worker · folder services/orchestrator/
#    /zero-executor             → Playwright executor · folder services/executor/
#    /zero-web                  → Web UI · folder web/ · npm @zero/web
#    /zero-cloud                → Cloud adapters · folder packages/cloud/
#    /zero-domain  /zero-db /zero-locators /zero-builders /zero-analyzer

# 3. After the change
npm run workflow:verify -- --milestone S6
npm test -- --testPathPattern=smoke`}
        </CodeBlock>
        <Note tone="info">
          HTTP routes live in folder <code>services/api/src/routes/</code> (npm <code>@zero/api</code>,
          skill <code>/zero-api</code>). Keep Chromium and vendor SDKs out of new route code —
          Playwright already left this image in S4.
        </Note>
      </section>

      <section className="section" id="repo-skills">
        <h2>Workspaces · folder, npm package, Cursor skill</h2>
        <p className="sub">
          One workspace has three names. Say the Cursor skill to the agent. Import the npm
          package in code. Open the folder on disk. The prompt file is the coding contract.
        </p>
        <ProvidersTable
          caption="One row = one workspace. Folder, npm package, and Cursor skill are three names for that row."
          headers={['Workspace', 'Folder', 'npm package', 'Cursor skill', 'Prompt file', 'Status']}
          rows={REPOS.map((r) => [
            r.name,
            <code key={`${r.id}-path`}>{r.path}</code>,
            <code key={`${r.id}-pkg`}>{r.pkg}</code>,
            <code key={`${r.id}-skill`}>{r.skill}</code>,
            <code key={`${r.id}-prompt`}>{r.prompt.replace('support/agent-workflow/', '')}</code>,
            <StatusBadge key={`${r.id}-st`} status={r.status} />,
          ])}
        />
        <Note tone="info">
          Folders exist (S2) and process/image splits are done (S4–S5). Skills edit those folders —
          keep Chromium and vendor SDKs out of new HTTP API route code.
        </Note>
      </section>

      <section className="section" id="workflow-layout">
        <h2>support/agent-workflow/ layout</h2>
        <Diagram ariaLabel="agent-workflow folder tree">
{`support/agent-workflow/
├── README.md                 how to run the loop
├── WORKFLOW.md               DETECT → PLAN → IMPLEMENT → VERIFY → ADVANCE
├── progress.json             M1–M7 + packaging S0–S6
├── agents/
│   ├── planner.md            one milestone, files + risks
│   ├── implementer.md        code against the plan
│   ├── verifier.md           probes + red flags
│   └── repo-coder.md         route a "update X" ask to the right prompt
├── milestones/               M1–M7 (done) · S0–S6 (done)
├── prompts/
│   ├── target-arch.md        capability north-star (frozen)
│   ├── packaging.md          packaging north-star (S3–S6)
│   └── repos/                one prompt per target workspace
│       ├── web.md
│       ├── api.md
│       ├── orchestrator.md
│       ├── executor.md
│       ├── cloud.md
│       ├── domain.md
│       ├── db.md
│       ├── locators.md
│       ├── builders.md
│       └── analyzer.md
└── scripts/
    ├── detect-milestone.js   M* and S* probes
    ├── verify-milestone.js   acceptance checks
    └── status-server.js      HTTP :5175 /status /verify`}
        </Diagram>
      </section>

      <section className="section" id="make-real-prompt">
        <h2>North-star agent prompt</h2>
        <p className="sub">
          Paste this into Cursor, or invoke <code>/zero-target-arch</code> (packaging prompt:{' '}
          <code>support/agent-workflow/prompts/packaging.md</code>).
        </p>
        <PromptBlock label="Agent prompt · ZER0 target architecture" text={NORTH_STAR} />
      </section>
    </>
  );
}

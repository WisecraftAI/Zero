import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { Note } from '@/components/ui/Note';

export function Order() {
  return (
    <section className="section" id="v3-order">
      <h2>Migration order</h2>
      <p className="sub">
          Restructuring is worthless if it stalls halfway. This order keeps the app runnable after
          every step. <code>npm run workflow:status</code> now probes S0–S6; next is S5.
      </p>

        <Pipeline>
        <PipelineStage id="S0" title="Containerize what exists" status="done">
          One <code>Dockerfile</code> + <code>docker-compose.yml</code> for today&apos;s monolith,
          plus Postgres/Redis/MinIO. No code moves. Reproducible environment; unblocked M1.
        </PipelineStage>
        <PipelineStage id="S1" title="Add a smoke test" status="done">
          Jest boots the app, starts a run, and (when Postgres is up) asserts a{" "}
          <code>qa_runs</code> row. Without that, moving 5,099 lines is unverifiable.
        </PipelineStage>
        <PipelineStage id="S2" title="Turn on workspaces" status="done">
          Root is workspaces-only. <code>lib/*</code> moved into <code>packages/*</code>,{' '}
          <code>client/</code> into <code>web/</code>, deployables into <code>apps/*</code>.
          Imports use package names. Still one server process.
        </PipelineStage>
        <PipelineStage id="S3" title="Split routes from stages" status="done">
          HTTP routes live under <code>apps/api/src/routes/</code>. DAG walker is{' '}
          <code>apps/orchestrator/processRun.js</code> (<code>@zero/orchestrator</code>). Same
          container, two clear halves. Skill: <code>/zero-api</code>.
        </PipelineStage>
        <PipelineStage id="S4" title="Extract the executor image" status="done">
          Playwright lives in folder <code>apps/executor/</code> (npm <code>@zero/executor</code>).
          Compose runs a Playwright image on <code>execution.requested</code>. The API image has
          no <code>playwright</code> dependency and does not call <code>chromium.launch</code>.{' '}
          <code>npm start</code> still co-locates the worker. Skill: <code>/zero-executor</code>.
        </PipelineStage>
        <PipelineStage id="S5" title="Extract the orchestrator image" status="not-done">
          Folder <code>apps/orchestrator/</code> and npm package <code>@zero/orchestrator</code>{' '}
          exist. Remaining: its own image; HTTP API returns immediately and relays SSE from Redis.
          Skill: <code>/zero-orchestrator</code>.
        </PipelineStage>
        <PipelineStage id="S6" title="Cloud adapters + remaining providers" status="partial">
          Folder <code>packages/cloud/</code> · npm <code>@zero/cloud</code> · local + aws + gcp.
          Remaining: Azure / Vercel and GATE-9 conformance. Skill: <code>/zero-cloud</code>.
        </PipelineStage>
      </Pipeline>

      <Note tone="info">
        <strong>Current position:</strong> S0–S4 and capability M1–M7 probes are done. The
        packaging workflow&apos;s next step is <strong>S5 — extract the orchestrator image</strong>.
        Spec: <code>agent-workflow/milestones/S5-orchestrator-image.md</code>. Skill:{' '}
        <code>/zero-orchestrator</code>.
      </Note>
    </section>
  );
}

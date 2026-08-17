import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { Note } from '@/components/ui/Note';

export function Order() {
  return (
    <section className="section" id="v3-order">
      <h2>Migration order</h2>
      <p className="sub">
        Restructuring is worthless if it stalls halfway. This order keeps the app runnable after
        every step, and lines up with M1–M7 in <code>agent-workflow/</code>.
      </p>

      <Pipeline>
        <PipelineStage id="S0" title="Containerize what exists · done">
          One <code>Dockerfile</code> + <code>docker-compose.yml</code> for today&apos;s monolith,
          plus Postgres/Redis/MinIO. No code moves. Reproducible environment; unblocks M1.
        </PipelineStage>
        <PipelineStage id="S1" title="Add a smoke test · done">
          Jest now boots the app, starts a run, and (when Postgres is up) asserts a{" "}
          <code>qa_runs</code> row. Without that, moving 5,099 lines is unverifiable.
        </PipelineStage>
        <PipelineStage id="S2" title="Turn on workspaces">
          Root becomes workspaces-only. Move <code>lib/*</code> into <code>packages/*</code> and
          <code>client/</code> into <code>web/</code>. Imports change from paths to package
          names. Still one server process.
        </PipelineStage>
        <PipelineStage id="S3" title="Split routes from stages">
          Carve <code>server.js</code> into <code>apps/api/src/routes/*</code> and an in-process
          orchestrator module. Same container, two clear halves — last step that&apos;s a pure
          refactor.
        </PipelineStage>
        <PipelineStage id="S4" title="Extract the executor">
          Move Chromium behind <code>execution.requested</code>. Now <code>playwright</code> can
          leave the API image. Delivers <strong>M4</strong>, the acceptance floor.
        </PipelineStage>
        <PipelineStage id="S5" title="Extract the orchestrator">
          Its own image consuming <code>runs.requested</code>. API returns <code>202</code>{' '}
          immediately and relays status over SSE from Redis pub/sub. Delivers <strong>M3</strong>.
        </PipelineStage>
        <PipelineStage id="S6" title="Swap local adapters for cloud">
          <code>ZERO_CLOUD=aws</code> and friends under <code>packages/cloud</code>, with{' '}
          <code>infra/</code> Terraform per provider. Delivers <strong>M7</strong>.
        </PipelineStage>
      </Pipeline>

      <Note tone="info">
        <strong>Current position:</strong> S0 + S1 + M1 are done. Postgres is live when{' '}
        <code>DATABASE_URL</code> / <code>PGHOST</code> is set; Jest covers health, a pipeline
        start, and run reload. <code>agent-workflow/progress.json</code> is on{' '}
        <strong>M5</strong> (auth + ACL). M1–M4 (acceptance floor) are shipped.
      </Note>
    </section>
  );
}

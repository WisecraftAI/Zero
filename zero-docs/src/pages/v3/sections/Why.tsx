import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';

export function Why() {
  return (
    <section className="section" id="v3-why">
      <h2>Why the repo shape has to change</h2>
      <p className="sub">
        Remaining packaging gaps after S4. The architectureV2 blueprint still needs the
        orchestrator process boundary.
      </p>

      <CardGrid columns="auto">
        <Card title="S4 done — Chromium left the API image">
          <p>
            Compose runs a Playwright <code>executor</code> service. <code>@zero/api</code> has no{' '}
            <code>playwright</code> dependency. <code>npm start</code> still co-locates the worker
            for local DX.
          </p>
        </Card>
        <Card title="Orchestrator still lives in the API process">
          <p>
            <code>processRun</code> is a module, not an image. S5 extracts{' '}
            <code>@zero/orchestrator</code> so the HTTP API can return immediately and relay SSE.
          </p>
        </Card>
        <Card title="One file still boots two remaining tiers">
          <p>
            <code>apps/api/server.js</code> is still the composition root for HTTP + orchestrator.
            S5 makes those separate processes.
          </p>
        </Card>
        <Card title="Artifacts are a local folder">
          <p>
            <code>artifacts/&lt;runId&gt;/</code> only works when one process writes and reads it.
            Split tiers need an object store from day one.
          </p>
        </Card>
      </CardGrid>

      <Note tone="info">
        <strong>V3 is a packaging change, not a redesign.</strong> M1–M7 capabilities already
        live in <code>apps/</code> and <code>packages/</code>. The tiers and <code>@zero/cloud</code> contracts stay as
        drawn in <code>architectureV2.html</code>. V3 only decides which files live where and
        which image runs them. Next step: S5 extract the orchestrator image.
      </Note>
    </section>
  );
}

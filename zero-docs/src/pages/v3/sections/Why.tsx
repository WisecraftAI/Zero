import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';

export function Why() {
  return (
    <section className="section" id="v3-why">
      <h2>Why the repo shape has to change</h2>
      <p className="sub">
        Six measured facts about today's code that the architectureV2 blueprint can't tolerate.
      </p>

      <CardGrid columns="auto">
        <Card title="One file holds three tiers">
          <p>
            <code>server.js</code> is <strong>5,099 lines</strong>: 46 routes, every stage agent,
            and the Playwright driver. API, orchestrator, and executor cannot be deployed or
            scaled apart.
          </p>
        </Card>
        <Card title="Root npm is ambiguous">
          <p>
            Root <code>package.json</code> is simultaneously the server, the build orchestrator
            for <code>client/</code>, and the deploy target. Nothing declares which service it
            represents.
          </p>
        </Card>
        <Card title="S0 done — still one image">
          <p>
            <code>Dockerfile</code> + <code>docker-compose.yml</code> + sidecars
            (Postgres / Redis / MinIO) exist. The image is still the monolith — Chromium
            ships with the API until S4.
          </p>
        </Card>
        <Card title="Chromium travels everywhere">
          <p>
            <code>playwright</code> sits in root dependencies, so any image built from root ships
            a browser — including tiers that must never launch one.
          </p>
        </Card>
        <Card title="Local deps are path-coupled">
          <p>
            <code>lib/</code> is shared by <code>require(&quot;./lib/…&quot;)</code>. A worker in
            another container cannot import it without copying the whole repo.
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
        <strong>V3 is a packaging change, not a redesign.</strong> The tiers, primitives, and{' '}
        <code>lib/cloud</code> contracts stay exactly as drawn in{' '}
        <a href="/architectureV2.html">architectureV2.html</a>. V3 only decides which files live
        where and which image runs them.
      </Note>
    </section>
  );
}

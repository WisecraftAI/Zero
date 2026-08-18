import { Card, CardGrid } from '@/components/ui/Card';

export function Best() {
  return (
    <section className="section" id="v3-best">
      <h2>Per-workspace conventions</h2>
      <p className="sub">
        Non-negotiable rules that keep the split healthy. Enforced by the gates above.
      </p>

      <CardGrid columns={1}>
        <Card title="Every workspace">
          <p>
            <code>type: &quot;module&quot;</code>, Node 20 LTS · one <code>src/</code> tree · one{' '}
            <code>test/</code> tree · <code>src/config.js</code> is the only reader of{' '}
            <code>process.env</code> and exports a frozen, zod-validated object ·{' '}
            <code>src/logger.js</code> re-exports from <code>@zero/observability</code> with a
            bound service name · exports declared in <code>package.json#exports</code>, no deep
            imports.
          </p>
        </Card>
        <Card title="services/api">
          <p>
            Route files return a router only; no side effects at import · zod schemas at the
            boundary, typed handlers · every route returns within 250 ms budget or streams · SSE
            handlers use <code>cache.subscribe</code>, never poll DB · errors funnel through one{' '}
            <code>errorHandler</code> middleware.
          </p>
        </Card>
        <Card title="services/orchestrator">
          <p>
            One agent = one file, one exported <code>run(runId, ctx)</code> · agents receive a{' '}
            <code>ctx</code> with <code>db · objectStore · secrets · llm · logger</code> — never
            call adapters directly · every write is idempotent on <code>(runId, stage)</code> ·
            retries are the queue&apos;s job · no <code>setTimeout</code>-based waits.
          </p>
        </Card>
        <Card title="services/executor">
          <p>
            One job = one browser context, always closed in <code>finally</code> · per-step
            timeout via <code>page.setDefaultTimeout</code> · screenshots + traces via{' '}
            <code>objectStore</code>, never local disk · learned selectors in a single batched
            statement · no HTTP server, only queue subscription.
          </p>
        </Card>
        <Card title="packages/cloud">
          <p>
            Each provider exports the exact same surface as <code>index.d.ts</code> — the
            conformance suite (GATE-9) is the source of truth · no cross-provider imports ·
            typed errors (<code>NotFound · Conflict · Throttled</code>) the domain switches on.
          </p>
        </Card>
        <Card title="packages/{domain, locators, builders, analyzer, db}">
          <p>
            Pure functions where possible, no I/O at import · zero dependencies on{' '}
            <code>express</code>, <code>playwright</code>, or cloud SDKs · snapshot tests for
            code emitters · db package owns migrations + a thin pg pool factory only.
          </p>
        </Card>
        <Card title="web">
          <p>
            One view = one folder, colocated <code>.scss</code> · data-fetching hooks under{' '}
            <code>src/data/</code>, never inside components · SSE via a single provider that
            debounces state updates · axe smoke test per view.
          </p>
        </Card>
      </CardGrid>
    </section>
  );
}

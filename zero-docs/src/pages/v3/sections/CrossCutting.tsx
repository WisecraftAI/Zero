import { Card, CardGrid } from '@/components/ui/Card';

export function CrossCutting() {
  return (
    <section className="section" id="v3-cross">
      <h2>Cross-cutting concerns</h2>
      <p className="sub">
        Concerns that touch every service. Standardize once, or every app reinvents them badly.
      </p>

      <CardGrid columns="auto">
        <Card title="Observability">
          <p>
            OpenTelemetry SDK auto-instruments express/pg/aws-sdk. One <code>traceparent</code>{' '}
            follows a run across api → queue → orchestrator → executor. Logs are JSON via pino,
            always include <code>runId</code>, <code>service</code>, <code>traceId</code>.
            Metrics: <code>runs_started</code>, <code>runs_completed</code>,{' '}
            <code>stage_duration_ms</code>, <code>queue_lag</code>, <code>executor_slots_used</code>.
          </p>
        </Card>
        <Card title="Config">
          <p>
            <code>src/config.js</code> = <code>zod.parse(process.env)</code>. Boot fails fast on
            missing/invalid config. Never read env below this file.
          </p>
        </Card>
        <Card title="Secrets">
          <p>
            Only <code>secrets.get()</code>. Prod refuses to boot if <code>KEY_ENC_SECRET</code>{' '}
            falls back to the dev default. Login passwords for a run never enter Postgres or
            artifacts.
          </p>
        </Card>
        <Card title="Health & readiness">
          <p>
            <code>/health</code> liveness (200 if event loop alive). <code>/ready</code> checks
            DB, queue, object store round-trip. K8s probes: liveness=<code>/health</code>,
            readiness=<code>/ready</code>.
          </p>
        </Card>
        <Card title="Error taxonomy">
          <p>
            Four base classes in <code>@zero/domain/errors</code>: <code>ValidationError</code>{' '}
            → 400, <code>NotFound</code> → 404, <code>Conflict</code> → 409,{' '}
            <code>InternalError</code> → 500. Handlers throw; middleware maps.
          </p>
        </Card>
        <Card title="Auth & multi-tenant">
          <p>
            OIDC verifier on api; every DB write scoped by <code>tenant_id</code>; presigned
            reads only. Adapter surface has no tenant knowledge — namespacing happens in{' '}
            <code>@zero/domain</code>.
          </p>
        </Card>
      </CardGrid>
    </section>
  );
}

import { FlawItem } from '@/components/ui/FlawItem';
import { Note } from '@/components/ui/Note';

export function ChecklistPage() {
  return (
    <section className="section">
      <h2>Ship Checklist · what "production" means for ZER0</h2>
      <p className="sub">
        Green on every item below or the "production" label is a marketing claim, not a
        technical one.
      </p>

      <FlawItem severity="gate" tag="SHIP-1" title="Docker compose starts clean on a fresh clone">
        <code>git clone &amp;&amp; docker compose up</code> boots web · api · orchestrator ·
        executor · postgres · redis · minio. Health probes green in &lt; 60 s.
      </FlawItem>
      <FlawItem severity="gate" tag="SHIP-2" title="Golden e2e passes in CI">
        <code>e2e/smoke.sh</code> starts a run and observes <code>completed</code> within its
        budget. Failing the smoke blocks merge.
      </FlawItem>
      <FlawItem severity="gate" tag="SHIP-3" title="API image has no browser">
        GATE-1 asserts <code>playwright</code> is absent from <code>zero-api</code>. GATE-5
        keeps the image under 250 MB.
      </FlawItem>
      <FlawItem severity="gate" tag="SHIP-4" title="Runs survive a restart">
        Kill orchestrator mid-run, restart, DAG resumes from <code>stage_progress</code>. State
        must land in Postgres, not memory.
      </FlawItem>
      <FlawItem severity="gate" tag="SHIP-5" title="One non-local cloud provider is green">
        Conformance suite (GATE-9) passes against <code>@zero/cloud/aws</code> (or gcp/azure) in
        CI, using LocalStack / emulators.
      </FlawItem>
      <FlawItem severity="p1" tag="SHIP-6" title="Auth actually gates">
        Header spoofing removed. Every write is tenant-scoped. Presigned URLs expire within 15 min.
      </FlawItem>
      <FlawItem severity="p1" tag="SHIP-7" title="Observability">
        Every log line has <code>runId · service · traceId</code>. Dashboards exist for{' '}
        <code>runs_started / completed / duration</code>, <code>queue_lag</code>,{' '}
        <code>executor_slots_used</code>.
      </FlawItem>
      <FlawItem severity="p1" tag="SHIP-8" title="Runbook + SLOs">
        Ops doc names owners, oncall rotation, and the two SLOs we defend: <code>p95(run) ≤ 5
        min</code> · <code>error_rate ≤ 1 %</code>.
      </FlawItem>
      <FlawItem severity="p2" tag="SHIP-9" title="LLM outages degrade, don't fail">
        Agent facade retries across providers and falls back to deterministic templates. A run
        still completes when OpenAI is down.
      </FlawItem>
      <FlawItem severity="p2" tag="SHIP-10" title="Migrations forward-only + reversible">
        <code>packages/db/migrate.js</code> up · down · up succeeds in CI.
      </FlawItem>

      <Note tone="info">
        Milestones M1–M4 in Blueprint cover SHIP-1 through SHIP-4. Everything else lands during
        M5–M7.
      </Note>
    </section>
  );
}

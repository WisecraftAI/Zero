import { FlawItem } from '@/components/ui/FlawItem';
import { Note } from '@/components/ui/Note';

export function Risks() {
  return (
    <section className="section" id="v3-risks">
      <h2>Risks &amp; tradeoffs</h2>
      <p className="sub">Where V3 is fragile, and what to do about it.</p>

      <FlawItem severity="p0" tag="R1" title="Adapter drift">
        Provider adapters silently diverge in edge behavior (retry semantics, error shapes, event
        ordering). <strong>Mitigation:</strong> the shared conformance suite (GATE-9) runs
        against every provider in CI; providers without green cannot ship.
      </FlawItem>
      <FlawItem severity="p0" tag="R2" title="Executor cold start">
        Chromium image ~1.6 GB and slow to schedule. First job of the day can wait 30–60 s.
        <strong> Mitigation:</strong> keep <code>min_replicas=1</code> for executor; autoscale on
        queue depth, not CPU.
      </FlawItem>
      <FlawItem severity="p1" tag="R3" title="Queue exactly-once fantasy">
        SQS/PubSub/Service Bus all deliver at-least-once. Idempotency must live in the handler.
        <strong> Mitigation:</strong> every write keyed by <code>(runId, stage)</code>; DB
        uniqueness catches replays.
      </FlawItem>
      <FlawItem severity="p1" tag="R4" title="Monorepo build times">
        Naive builds rebuild everything on any change. <strong>Mitigation:</strong> turborepo or
        nx with per-workspace caches, or lockfile-only Dockerfile layers so <code>npm ci</code>{' '}
        caches across commits.
      </FlawItem>
      <FlawItem severity="p1" tag="R5" title="SSE behind load balancers">
        Sticky sessions or cache-fanout matter. <strong>Mitigation:</strong> every replica
        subscribes to Redis pub/sub for <code>state.&lt;runId&gt;</code>; no stickiness required.
      </FlawItem>
      <FlawItem severity="p2" tag="R6" title="Local ≠ prod for signed URLs">
        <code>packages/cloud/local</code> uses HMAC tokens served by the API; real S3/GCS use
        SigV4/V4. <strong>Mitigation:</strong> nightly job that exercises the AWS adapter against
        LocalStack.
      </FlawItem>
      <FlawItem severity="p2" tag="R7" title="LLM provider outages">
        BA/Manager stages fail if OpenAI/Anthropic/Vertex hiccup. <strong>Mitigation:</strong>{' '}
        agents accept a <code>llm</code> facade with per-provider fallback and deterministic
        template mode, so a run can still complete with degraded reports.
      </FlawItem>

      <Note tone="info">
        <strong>Definition of done for V3:</strong> gates 1–5 green in required CI · smoke e2e
        green on <code>docker compose up</code> · one non-local provider passes the conformance
        suite · <code>agent-workflow/progress.json</code> shows <code>M4</code> complete
        (acceptance floor).
      </Note>
    </section>
  );
}

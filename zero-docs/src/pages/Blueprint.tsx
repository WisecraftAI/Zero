import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';

export function BlueprintPage() {
  return (
    <>
      <section className="section">
        <h2>Production Blueprint · M1–M7</h2>
        <p className="sub">
          The path from runtime-today to the target architecture. Tracked in{' '}
          <code>agent-workflow/progress.json</code>; M4 is the acceptance floor.
        </p>

        <Pipeline>
          <PipelineStage id="M1" title="Containerize + workspaces">
            One Dockerfile for today, docker-compose with Postgres/Redis/MinIO, root becomes
            npm workspaces. No code moves yet.
          </PipelineStage>
          <PipelineStage id="M2" title="Persistence on">
            Re-enable Postgres, wire <code>qa_runs</code> + <code>qa_assets</code> +{' '}
            <code>outbox_events</code>, delete the in-memory Map. Runs survive a restart.
          </PipelineStage>
          <PipelineStage id="M3" title="Extract orchestrator">
            Its own image consuming <code>runs.requested</code>. API returns 202 immediately and
            streams state via SSE from Redis pub/sub.
          </PipelineStage>
          <PipelineStage id="M4" title="Extract executor · acceptance floor">
            Chromium leaves the API image. Executor autoscales on queue depth. This is the
            minimum for a production claim.
          </PipelineStage>
          <PipelineStage id="M5" title="Real LLM">
            Agents call OpenAI/Anthropic/Vertex via <code>packages/orchestrator/llm</code>.{' '}
            <code>agent-settings</code> and <code>provider-keys</code> stop being cosmetic.
          </PipelineStage>
          <PipelineStage id="M6" title="Auth + multi-tenant">
            OIDC on API, tenant-scoped writes, presigned reads. Header auth removed.
          </PipelineStage>
          <PipelineStage id="M7" title="Multi-cloud">
            <code>packages/cloud/{'{aws,gcp,azure}'}</code> implemented against the same
            conformance suite. Terraform in <code>infra/</code>.
          </PipelineStage>
        </Pipeline>
      </section>

      <section className="section">
        <h2>Primitives that don&apos;t change per provider</h2>
        <CardGrid columns={2}>
          <Card title="ObjectStore">
            <p>presigned put/get, put/get by key, remove. Backed by MinIO locally, S3 / GCS / Blob / R2 in prod.</p>
          </Card>
          <Card title="Queue">
            <p>publish + subscribe on named topics. Backed by an in-proc pub/sub locally, SQS / Pub/Sub / Service Bus / QStash in prod.</p>
          </Card>
          <Card title="Secrets">
            <p>get/put by name. Backed by .env locally, Secrets Manager / GSM / Key Vault / Doppler in prod.</p>
          </Card>
          <Card title="Cache + pub/sub">
            <p>get/set with TTL, publish/subscribe channels. Backed by node-cache locally, Redis / Memorystore / Azure Cache / Upstash in prod.</p>
          </Card>
        </CardGrid>

        <Note tone="info">
          Because the interface is the contract, provider swap is one env var and one adapter
          file. No app code changes.
        </Note>
      </section>
    </>
  );
}

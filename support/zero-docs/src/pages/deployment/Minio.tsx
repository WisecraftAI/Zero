import { Diagram } from '@/components/ui/Diagram';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Note } from '@/components/ui/Note';
import { Card, CardGrid } from '@/components/ui/Card';
import { ProvidersTable } from '@/components/ui/ProvidersTable';

export function DeployMinio() {
  return (
    <>
      <h3>MinIO · S3-compatible object store in Compose</h3>
      <p className="sub">
        MinIO is the local stand-in for AWS S3, GCS, Azure Blob, and R2. Compose starts it on every
        full stack so you can exercise presigned uploads, screenshot blobs, and report files the same
        way you would in production — without paying for cloud storage while developing.
      </p>

      <Note tone="warn">
        <strong>Default Compose does not write to MinIO.</strong> The shared{' '}
        <code>x-app-env</code> block sets <code>ZERO_CLOUD=local</code>, so artifacts land in the
        HMAC local object store under <code>dist/artifacts/cloud-store</code> (served via{' '}
        <code>GET /cloud/local</code>). MinIO still starts (health checks, hybrid testing, and S3
        adapter drills) but stays idle until you opt into the S3 path below.
      </Note>

      <h3>What MinIO stores when enabled</h3>
      <CardGrid columns={2}>
        <Card title="Run artifacts">
          <p>
            <code>runs/&lt;runId&gt;/run.json</code>, execution screenshots, generated reports, and
            presigned upload targets for TC files. The API never streams large bodies — browsers PUT
            directly to signed URLs.
          </p>
        </Card>
        <Card title="Not MinIO">
          <p>
            Postgres holds run metadata and locator rows. Redis holds the queue and SSE pub/sub cache.
            The <code>app-artifacts</code> Compose volume is a shared filesystem fallback for{' '}
            <code>dist/artifacts/</code> while <code>ZERO_CLOUD=local</code>.
          </p>
        </Card>
      </CardGrid>

      <Diagram ariaLabel="MinIO vs local object store">
{`  ZERO_CLOUD=local (Compose default)
       │
       ├─ Object store → dist/artifacts/cloud-store  +  /cloud/local signed URLs
       ├─ Queue/cache  → REDIS_URL (or in-process when unset)
       └─ MinIO        → running, not used for blobs

  ZERO_CLOUD=aws  +  S3_ENDPOINT=http://minio:9000  (S3 drill / hybrid)
       │
       ├─ Object store → MinIO bucket zero-artifacts  (@zero/cloud AWS S3 client)
       ├─ Queue/cache  → still REDIS_URL in Compose (SQS optional in real AWS)
       └─ Console      → http://localhost:9001`}
      </Diagram>

      <h3>Compose services</h3>
      <ProvidersTable
        caption="MinIO sidecars in docker-compose.yml"
        headers={['Service', 'Image', 'Ports', 'Role']}
        rows={[
          [
            'minio',
            'minio/minio',
            '9000 S3 API · 9001 console',
            'S3-compatible storage; data in volume miniodata',
          ],
          [
            'minio-init',
            'minio/mc',
            '(none published)',
            'One-shot: creates bucket zero-artifacts via mc mb',
          ],
        ]}
      />

      <h3>Console access</h3>
      <CodeBlock lang="bash" label="MinIO console">
{`# After: docker compose up --build
open http://localhost:9001

# Default credentials (Compose only — never use in production)
User: zerominio
Pass: zerominio123

# Bucket created by minio-init
zero-artifacts`}
      </CodeBlock>

      <h3>Use MinIO for object storage (opt-in)</h3>
      <p className="prose">
        Point the <strong>AWS S3 adapter</strong> at MinIO. The SDK loads lazily — install it once on
        the host or bake it into images when you need this path:
      </p>
      <CodeBlock lang="bash" label="Enable MinIO-backed blobs">
{`npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Hybrid (MinIO in Docker, app on host):
docker compose up -d minio
export ZERO_CLOUD=aws
export S3_ENDPOINT=http://localhost:9000
export S3_BUCKET=zero-artifacts
export S3_ACCESS_KEY=zerominio
export S3_SECRET_KEY=zerominio123
export REDIS_URL=redis://localhost:6379   # queue + SSE still use Redis in Compose

# Full Compose: override ZERO_CLOUD in docker-compose.yml or an .env file:
# ZERO_CLOUD=aws
# S3_ENDPOINT=http://minio:9000   # in-network hostname`}
      </CodeBlock>

      <ProvidersTable
        caption="Environment variables for MinIO / S3-compatible endpoints"
        headers={['Variable', 'Compose default', 'Purpose']}
        rows={[
          ['ZERO_CLOUD', 'local', 'Must be aws (S3 SDK) to talk to MinIO'],
          ['S3_ENDPOINT', 'http://minio:9000 (in compose network)', 'MinIO API; use http://localhost:9000 on the host'],
          ['S3_BUCKET', 'zero-artifacts', 'Bucket name; created by minio-init'],
          ['S3_ACCESS_KEY', 'zerominio', 'Same as MINIO_ROOT_USER'],
          ['S3_SECRET_KEY', 'zerominio123', 'Same as MINIO_ROOT_PASSWORD'],
          ['MINIO_API_PORT', '9000', 'Host publish for S3 API (override if busy)'],
          ['MINIO_CONSOLE_PORT', '9001', 'Host publish for web console'],
        ]}
      />

      <h3>Operations</h3>
      <CodeBlock lang="bash" label="Common MinIO commands">
{`# Infra only (with Postgres + Redis)
docker compose up -d postgres redis minio

# Reset MinIO data (wipes all buckets)
docker compose down -v    # removes miniodata volume

# Inspect bucket from CLI (inside compose network)
docker compose run --rm minio-init mc ls local/zero-artifacts`}
      </CodeBlock>

      <Note tone="info">
        Production uses real S3 / GCS / Blob / R2 via <code>ZERO_CLOUD</code> — see{' '}
        <a href="#deploy-cloud">Deployment → Cloud</a>. MinIO is a dev/test substitute only; rotate
        credentials and never expose the console publicly.
      </Note>
    </>
  );
}

import { Diagram } from '@/components/ui/Diagram';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { Card, CardGrid } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Note } from '@/components/ui/Note';

export function Connect() {
  return (
    <section className="section" id="v3-connect">
      <h2>Connect to AWS · GCP · Azure · Vercel-hybrid</h2>
      <p className="sub">
        Every provider swap is one env variable plus one adapter file. Domain code never changes
        and never imports a vendor SDK.
      </p>

      <Diagram ariaLabel="Provider selection at boot">
{`          apps/*  ──── require('@zero/cloud')
                          │
                          ▼
                  packages/cloud/index.js
                          │
             switch (process.env.ZERO_CLOUD)
                │        │        │        │        │
                ▼        ▼        ▼        ▼        ▼
              local     aws      gcp     azure   vercel
              (dev)    S3+SQS   GCS+PS  Blob+SB  R2+QStash
                         │        │        │        │
                         └────── same interface ────┘
                     ObjectStore · Queue · Secrets · Cache`}
      </Diagram>

      <h3>Environment matrix</h3>
      <ProvidersTable
        headers={['Variable', 'local', 'aws', 'gcp', 'azure', 'vercel']}
        rows={[
          ['ZERO_CLOUD',       'local',         'aws',                       'gcp',                     'azure',                    'vercel'],
          ['DATABASE_URL',     'postgres…docker','RDS/Aurora URL',           'Cloud SQL socket',        'Flexible Server URL',      'Neon/Supabase URL'],
          ['Object store',     'MinIO :9000',   'S3_BUCKET·AWS_REGION',      'GCS_BUCKET·GOOGLE_PROJECT','AZ_STORAGE_ACCOUNT',      'R2_BUCKET·R2_ENDPOINT'],
          ['Queue',            'in-process',    'SQS_URL_RUNS/EXEC',         'PUBSUB_TOPIC_*',          'SB_QUEUE_*',               'QSTASH_URL·TOKEN'],
          ['Cache · pub/sub',  'node-cache',    'REDIS_URL ElastiCache',     'REDIS_URL Memorystore',   'REDIS_URL Azure Cache',    'UPSTASH_REDIS_URL'],
          ['Secrets',          '.env file',     'AWS_SECRETS_PREFIX',        'GCP_SECRETS_PROJECT',     'AZ_KEYVAULT_URL',          'Vercel env / Doppler'],
          ['Identity',         '—',             'IAM role IRSA/task role',   'Workload Identity',       'Managed Identity',         'Static tokens'],
          ['Cost floor / mo',  '$0',            '~$60 (RDS + NAT)',          '~$50 (Cloud SQL)',        '~$55 (Flexible)',          '~$25 (Neon+Upstash free)'],
        ]}
      />

      <Note tone="danger">
        <strong>Never bake static keys into images.</strong> Prefer IRSA (AWS), Workload Identity
        (GCP), or Managed Identity (Azure). Static keys are only acceptable for local / Vercel and
        should rotate through the secrets adapter, never <code>process.env</code> directly.
      </Note>

      <h3>Adapter template · AWS queue</h3>
      <p className="prose">
        Same shape as <code>packages/cloud/local/queue.js</code>. Domain code sees identical{' '}
        <code>publish</code> / <code>subscribe</code>.
      </p>
      <CodeBlock lang="ts" label="packages/cloud/aws/queue.js">
{`'use strict';
const { SQSClient, SendMessageCommand, ReceiveMessageCommand,
        DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({ region: process.env.AWS_REGION });   // IRSA / task role
const topicToUrl = {
  'runs.requested':      process.env.SQS_URL_RUNS,
  'execution.requested': process.env.SQS_URL_EXEC,
  'execution.completed': process.env.SQS_URL_EXEC_DONE,
};

async function publish(topic, msg, opts = {}) {
  await client.send(new SendMessageCommand({
    QueueUrl: topicToUrl[topic],
    MessageBody: JSON.stringify(msg),
    MessageDeduplicationId: opts.dedupId,
    MessageGroupId:         opts.groupId,
  }));
}

function subscribe(topic, handler) {
  const QueueUrl = topicToUrl[topic];
  let stopped = false;
  (async function loop() {
    while (!stopped) {
      const { Messages = [] } = await client.send(new ReceiveMessageCommand({
        QueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20, VisibilityTimeout: 300,
      }));
      for (const m of Messages) {
        try {
          await handler(JSON.parse(m.Body));
          await client.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: m.ReceiptHandle }));
        } catch (err) {
          console.error('[aws.queue] handler error:', err);   // SQS redrives via DLQ
        }
      }
    }
  })();
  return () => { stopped = true; };
}

module.exports = { publish, subscribe };`}
      </CodeBlock>

      <h3>Bootstrap · what the operator does per cloud</h3>
      <CardGrid columns="auto">
        <Card title="AWS">
          <p>
            Terraform in <code>infra/aws/</code>: VPC · RDS Postgres · S3 bucket + lifecycle ·
            SQS (runs, exec, DLQ) · ElastiCache · Secrets Manager · ECR · ECS Fargate services
            for api/orchestrator · Fargate task for executor with <code>shm-size=1g</code>. IAM:
            one role per service.
          </p>
        </Card>
        <Card title="GCP">
          <p>
            Terraform in <code>infra/gcp/</code>: Cloud SQL Postgres · GCS · Pub/Sub +
            subscriptions · Memorystore · Secret Manager · Artifact Registry · Cloud Run (api) ·
            Cloud Run Jobs (orchestrator, executor). Workload Identity binds each SA.
          </p>
        </Card>
        <Card title="Azure">
          <p>
            Terraform in <code>infra/azure/</code>: Flexible Postgres · Blob Storage · Service
            Bus · Cache for Redis · Key Vault · ACR · Container Apps (api, orchestrator) ·
            Container Apps Job (executor). Managed Identity per app.
          </p>
        </Card>
        <Card title="Vercel-hybrid">
          <p>
            Vercel Functions (api), Neon/Supabase Postgres, Cloudflare R2, Upstash Redis +
            QStash for queue, Browserless / Browserbase for executor. Cheapest path for &lt; 100
            runs/day; ceiling is executor throughput.
          </p>
        </Card>
      </CardGrid>
    </section>
  );
}

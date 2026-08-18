import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { Note } from '@/components/ui/Note';
import { Card, CardGrid } from '@/components/ui/Card';

export function DeployCost() {
  return (
    <>
      <h3>Cost · what each path actually spends</h3>
      <p className="sub">
        Ballpark monthly figures for a small team (under ~100 runs/day). Prices vary by region,
        reserved vs on-demand, and whether you already have a VPC. LLM spend is separate and
        optional — templates work with zero API spend.
      </p>

      <h3>Floor by deployment path</h3>
      <ProvidersTable
        caption="Fixed infrastructure before you run a single pipeline. LLM and burst executor compute are additive."
        headers={['Path', 'Infra floor / mo', 'Typical at ~50 runs/day', 'Notes']}
        rows={[
          [
            'Local dev',
            '$0',
            '$0–5 LLM',
            'npm on your laptop. No cloud bill. Chromium + Postgres optional.',
          ],
          [
            'Docker Compose',
            '$0 cloud',
            '$0–5 LLM',
            'All containers on one host. Budget ~8 GB RAM and ~3 GB disk for images + volumes.',
          ],
          [
            'Hybrid',
            '$0 cloud',
            '$0–5 LLM',
            'Postgres / Redis / MinIO in Docker; app on host — same cloud cost as Compose.',
          ],
          [
            'AWS',
            '~$60–120',
            '~$80–200',
            'Floor: RDS db.t4g.micro (~$12) + NAT gateway (~$32) + ElastiCache cache.t3.micro (~$12) + Secrets Manager + S3/SQS pennies. Add Fargate for three tiers.',
          ],
          [
            'GCP',
            '~$50–100',
            '~$70–180',
            'Floor: Cloud SQL f1-micro (~$7) + Memorystore 1 GB BASIC (~$35) + Secret Manager + GCS/Pub/Sub pennies. Cloud Run min instances add ~$15–40 each.',
          ],
          [
            'Azure',
            '~$55–110',
            '~$75–190',
            'Floor: Flexible Server Burstable B1ms (~$25) + Cache for Redis Basic C0 (~$16) + Key Vault + Blob/Service Bus pennies. Container Apps consumption on top.',
          ],
          [
            'Vercel-hybrid',
            '~$25–40',
            '~$40–120',
            'Neon free / launch (~$0–19) + Upstash Redis free tier + R2 (~$0) + Vercel Pro (~$20). Executor via Browserless/Browserbase is the main variable.',
          ],
        ]}
      />

      <Note tone="info">
        The <strong>Cloud</strong> tab environment matrix includes a one-line{' '}
        <code>Cost floor / mo</code> row for quick comparison. This tab breaks down what drives
        those numbers and what scales with usage.
      </Note>

      <h3>Variable costs per run</h3>
      <ProvidersTable
        headers={['Component', 'Default behavior', 'Typical $/run', 'How to minimize']}
        rows={[
          [
            'LLM (BA / Manual / Automation / Manager)',
            'Template base + optional enrichment when a provider key exists',
            '$0–0.50 (capped)',
            'Set ZERO_LLM=off for demos; lower ZERO_LLM_MAX_USD_PER_RUN (default $0.50); skip optional stages',
          ],
          [
            'Playwright execution',
            'Minimal mode: URL load + screenshot per TC',
            '$0 local · ~$0.02–0.08 cloud job',
            'EXECUTION_MODE=minimal; export Java scripts and run E2E externally; cap ZERO_EXEC_CONCURRENCY',
          ],
          [
            'Web Analyzer crawl',
            'Playwright crawl when no TC file and short notes',
            '$0 local · ~$0.05–0.15 cloud',
            'Upload TCs or longer BA notes to skip the crawl stage',
          ],
          [
            'Object storage',
            'TC files, screenshots, reports under artifacts/',
            '<$0.01 unless heavy screenshots',
            'Lifecycle rules on S3/GCS (30–90 day expiry); compress traces',
          ],
          [
            'Queue + cache',
            'SQS/Pub/Sub + Redis for fan-out',
            '<$0.01 at low volume',
            'Local ZERO_CLOUD=local for dev; serverless queues have generous free tiers',
          ],
        ]}
      />

      <h3>LLM guardrails (built in)</h3>
      <p className="prose">
        Orchestrator enrichment is best-effort — templates always complete the run. Caps are enforced
        in <code>@zero/orchestrator/llm</code> before each provider call:
      </p>
      <ProvidersTable
        headers={['Variable', 'Default', 'Effect']}
        rows={[
          ['ZERO_LLM', '(on)', 'Set to off to force template-only — zero LLM spend'],
          ['ZERO_LLM_RPM', '20', 'Rate limit across all LLM calls in the process'],
          ['ZERO_LLM_MAX_USD_PER_RUN', '0.50', 'Hard cap per run; falls back to template when exceeded'],
          ['ZERO_LLM_TIMEOUT_MS', '8000', 'Aborts slow calls; template fallback on timeout'],
        ]}
      />

      <h3>IaC primitives · what Terraform provisions</h3>
      <p className="prose">
        <code>infra/aws</code> and <code>infra/gcp</code> create the four cloud adapters only — not
        Postgres, compute, or networking. Approximate add-on cost for those modules:
      </p>
      <CardGrid columns="auto">
        <Card title="infra/aws">
          <ul className="compact">
            <li>S3 bucket — ~$0.023/GB/mo + requests</li>
            <li>3× SQS standard queues — first 1M requests/mo free</li>
            <li>Secrets Manager — ~$0.40/secret/mo</li>
            <li>ElastiCache cache.t3.micro — ~$12/mo (requires subnet_ids)</li>
          </ul>
          <p className="prose">
            RDS, NAT, Fargate, and ALB are <strong>not</strong> in this module — they dominate the
            AWS floor above.
          </p>
        </Card>
        <Card title="infra/gcp">
          <ul className="compact">
            <li>GCS bucket — ~$0.020/GB/mo (region-dependent)</li>
            <li>3× Pub/Sub topics + subscriptions — 10 GB/mo free</li>
            <li>Secret Manager — ~$0.06/secret/version/mo</li>
            <li>Memorystore Redis 1 GB BASIC — ~$35/mo</li>
          </ul>
          <p className="prose">
            Cloud SQL and Cloud Run are provisioned separately — see GCP floor in the table above.
          </p>
        </Card>
      </CardGrid>

      <h3>Executor sizing (largest compute line item)</h3>
      <p className="prose">
        The executor image is ~1.6 GB (Playwright + Chromium). Each job needs{' '}
        <code>shm_size ≥ 1gb</code>. Rough cloud job costs:
      </p>
      <ProvidersTable
        headers={['Host', 'Unit', 'Approx cost', 'When to use']}
        rows={[
          ['Local / Compose', '1 concurrent job', '$0', 'Dev and demos'],
          ['AWS Fargate', '1 vCPU · 2 GB · 5 min job', '~$0.004/job', 'Production farm; scale on queue depth'],
          ['GCP Cloud Run Jobs', '2 vCPU · 2 GB · 5 min', '~$0.003/job', 'Scale to zero between bursts'],
          ['Browserless / Browserbase', 'per minute', '~$0.01–0.05/min', 'Vercel-hybrid when you cannot host Chromium'],
        ]}
      />

      <Note tone="warn">
        Estimates assume US regions and on-demand pricing as of 2026. Reserved instances, committed
        use discounts, and existing shared VPCs can cut the floor 30–50%. Re-quote in your cloud
        calculator before budgeting — link the Terraform outputs to your env matrix on the Cloud tab.
      </Note>
    </>
  );
}

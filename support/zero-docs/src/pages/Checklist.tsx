import { FlawItem } from '@/components/ui/FlawItem';
import { Note } from '@/components/ui/Note';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function ChecklistPage() {
  return (
    <>
      <section className="section" id="p0">
        <h2>Ship Checklist · what &quot;production&quot; means</h2>
        <p className="sub">
          Scored against the live tree, not the original HTML wish list. Green means the
          capability exists. Workspaces and the split images (<code>api</code> ·{' '}
          <code>orchestrator</code> · <code>executor</code>) are <StatusBadge status="done" />. The
          remaining gates are <strong>ops maturity</strong> — <code>e2e/smoke.sh</code>, observability, a runbook, an OIDC login UI, and a migrate CLI.
        </p>

        <FlawItem severity="gate" tag="SHIP-1" title="Compose starts on a fresh clone">
          <code>docker compose up --build</code> boots split <code>web</code> / <code>api</code> /{' '}
          <code>orchestrator</code> / <code>executor</code> images + Postgres / Redis. MinIO is
          opt-in via <code>--profile s3</code>. Docs :5174 · workflow :5175. Split images are{' '}
          <StatusBadge status="done" />.
        </FlawItem>
        <FlawItem severity="gate" tag="SHIP-2" title="Smoke tests in CI">
          Jest health + pipeline start + Postgres persist/reload exist.{' '}
          <code>e2e/smoke.sh</code> against four compose services is{' '}
          <StatusBadge status="not-done" />. Current smoke is <StatusBadge status="partial" />.
        </FlawItem>
        <FlawItem severity="gate" tag="SHIP-3" title="API image has no browser">
          GATE-1. The API image has no <code>playwright</code> dependency and never calls{' '}
          <code>chromium.launch</code>; Chromium lives only in the executor image.{' '}
          <StatusBadge status="done" />
        </FlawItem>
        <FlawItem severity="gate" tag="SHIP-4" title="Runs survive a restart">
          Postgres upserts <code>qa_runs</code> / <code>qa_assets</code> when configured. No{' '}
          <code>stage_progress</code> resume-from-crash yet. <StatusBadge status="partial" />
        </FlawItem>
        <FlawItem severity="gate" tag="SHIP-5" title="One non-local cloud provider">
          Cloud adapters (<code>@zero/cloud</code>, folder <code>packages/cloud/</code>) ship local ·
          aws · gcp · azure · vercel, with IaC under <code>infra/</code> and a GATE-9 conformance
          suite (<code>test/cloud.conformance.test.js</code>). Adapters + conformance are{' '}
          <StatusBadge status="done" />.
        </FlawItem>
        <FlawItem severity="p1" tag="SHIP-6" title="Auth actually gates">
          Verified API keys / JWT, tenant-scoped runs, recording CORS allowlist, production{' '}
          <code>KEY_ENC_SECRET</code> required. No OIDC login UI. Header spoofing of{' '}
          <code>X-User-Email</code> is rejected. <StatusBadge status="partial" />
        </FlawItem>
        <FlawItem severity="p1" tag="SHIP-7" title="Observability">
          Winston logs exist. No required <code>runId · service · traceId</code> on every line,
          no dashboards for <code>queue_lag</code> / <code>executor_slots_used</code>.{' '}
          <StatusBadge status="not-done" />
        </FlawItem>
        <FlawItem severity="p1" tag="SHIP-8" title="Runbook + SLOs">
          Ops doc naming owners, oncall, and <code>p95(run) ≤ 5 min</code> /{' '}
          <code>error_rate ≤ 1 %</code> is <StatusBadge status="not-done" />.
        </FlawItem>
        <FlawItem severity="p2" tag="SHIP-9" title="LLM outages degrade, don&apos;t fail">
          <code>@zero/orchestrator/llm</code> falls back to templates on error, rate/cost cap, or{' '}
          <code>ZERO_LLM=off</code>. <StatusBadge status="done" />
        </FlawItem>
        <FlawItem severity="p2" tag="SHIP-10" title="Migrations forward-only + reversible">
          Postgres helpers (<code>@zero/db</code>, folder <code>packages/db/</code>) use{' '}
          <code>CREATE TABLE IF NOT EXISTS</code>. No <code>packages/db/migrate.js</code> up · down
          · up. <StatusBadge status="not-done" />
        </FlawItem>
      </section>

      <section className="section" id="p0-original">
        <h2>Original P0s from architectureV2 · current score</h2>
        <p className="sub">These were blockers when the HTML was written. Several have flipped.</p>
        <FlawItem severity="p0" tag="P0" title="Postgres hard-disabled">
          <code>databaseConfigured()</code> follows <code>DATABASE_URL</code> / <code>PGHOST</code>.{' '}
          <StatusBadge status="done" />
        </FlawItem>
        <FlawItem severity="p0" tag="P0" title="No real auth">
          Spoofable <code>X-User-Email</code> is no longer identity. API keys / JWT are verified.
          Still no OIDC UI. <StatusBadge status="partial" />
        </FlawItem>
        <FlawItem severity="p0" tag="P0" title="Public artifacts + open recording CORS">
          <code>/artifacts</code> is not statically served. Recording CORS is an origin allowlist.{' '}
          <StatusBadge status="done" />
        </FlawItem>
        <FlawItem severity="p0" tag="P0" title="In-process Playwright, no queue">
          Queue + executor worker exist. <code>npm start</code> is API-only; Chromium runs only in
          the executor image (<code>npm run start:all</code> co-locates for local dev).{' '}
          <StatusBadge status="done" />
        </FlawItem>
        <FlawItem severity="p0" tag="P0" title="Minimal execution ≠ E2E proof">
          Still true. Manager &quot;Go&quot; must not be treated as release proof.{' '}
          <StatusBadge status="done" /> as an honesty rule — the product still defaults to minimal.
        </FlawItem>
      </section>

      <Note tone="info">
        Milestones M1–M4 cover the capability half of SHIP-1 through SHIP-4. Packaging S0–S7 and
        product Q1–Q4 are done on the Architecture tab. Remaining gates here are ops maturity
        (observability, runbook, migrate CLI), not packaging or product features.
      </Note>
    </>
  );
}

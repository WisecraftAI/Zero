import { Card, CardGrid } from '@/components/ui/Card';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';
import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function OverviewPage() {
  return (
    <>
      <section className="section" id="purpose">
        <h2>What ZER0 is for</h2>
        <p className="sub">
          One tool that compresses the QA architect + BA + manual + automation workflow behind a
          single URL.
        </p>
        <p className="prose">
          Give ZER0 an <strong>OTT URL</strong> and any of a <strong>test-case file</strong>,{' '}
          <strong>Figma link</strong>, or <strong>plain notes</strong>. It produces consolidated
          requirements, an app-specific manual test-case list, Playwright + Java/Selenium scripts,
          a Playwright execution report with screenshots, and Manager / Delivery reports as PDF or
          JSON.
        </p>
        <p className="prose">
          The point is not another test recorder. It is a single run that turns a link into a full
          QA artifact set — usable by a solo QA on day one and portable into a real Java/Maven
          suite when you want production coverage.
        </p>
      </section>

      <section className="section" id="audience">
        <h2>Who it&apos;s for</h2>
        <p className="sub">Built for teams doing OTT / streaming / e-commerce QA under time pressure.</p>
        <CardGrid columns={2}>
          <Card title="QA architects &amp; leads">
            <p>Need consistent BRD → TC → script → report traceability across many channels. Get it in one run.</p>
          </Card>
          <Card title="Solo QA on a new product">
            <p>No test suite yet. Feed the site URL, pick a profile, get a manual list and a Java suite you can adapt.</p>
          </Card>
          <Card title="Delivery managers">
            <p>Need a stakeholder-ready Manager / Delivery report per run without chasing four people for pieces.</p>
          </Card>
          <Card title="Automation engineers">
            <p>Use the generated Playwright spec and Java/Selenium class as scaffolding; own execution in your own CI.</p>
          </Card>
        </CardGrid>
      </section>

      <section className="section" id="how-people-use">
        <h2>How people use it</h2>
        <p className="sub">Six steps, from browser open to shippable report.</p>
        <Pipeline>
          <PipelineStage id="01" title="Open the UI">
            <code>npm start</code> then <code>http://localhost:3000</code>. Dashboard shows past runs.
          </PipelineStage>
          <PipelineStage id="02" title="Create a new run">
            Enter the OTT URL, pick a channel profile, and provide any of: TC file (
            <code>.csv</code>, <code>.xlsx</code>, <code>.txt</code>, <code>.md</code>,{' '}
            <code>.json</code>), a Figma link, or BA notes.
          </PipelineStage>
          <PipelineStage id="03" title="Choose options">
            Enable accessibility, performance, or security passes. Add login credentials
            (runtime-only). Toggle &quot;show browser&quot; for a headed Chromium.
          </PipelineStage>
          <PipelineStage id="04" title="Watch the pipeline">
            Stages tick through — BA → Manual → Automation → Execution → optional passes → Manager
            → Delivery.
          </PipelineStage>
          <PipelineStage id="05" title="Review artifacts">
            Download requirements, manual TC list, Playwright spec, Java/Selenium class, PDF or
            JSON reports.
          </PipelineStage>
          <PipelineStage id="06" title="Take Java to prod">
            Drop the generated Java class into your Maven/Gradle project, tune the locators, run
            in your CI.
          </PipelineStage>
        </Pipeline>
      </section>

      <section className="section" id="how-it-works">
        <h2>How it works under the hood · today</h2>
        <p className="sub">
          A single Express process still orchestrates the pipeline on <code>npm start</code>.
          Compose splits Chromium into the executor image (S4). Orchestrator as its own image is S5.
        </p>
        <ol className="compact">
          <li>
            <strong>Intake:</strong> UI POSTs to <code>/api/runs</code>. JSON +{' '}
            <code>uploads[]</code> returns presigned PUTs (M2). Legacy multipart still accepted.
          </li>
          <li>
            <strong>Persist:</strong> run metadata upserts to Postgres when{' '}
            <code>DATABASE_URL</code> is set (M1), plus <code>artifacts/&lt;runId&gt;/run.json</code>.
          </li>
          <li>
            <strong>Queue:</strong> HTTP API publishes <code>runs.requested</code>. Orchestrator
            worker (<code>@zero/orchestrator</code>, folder <code>apps/orchestrator/</code>)
            consumes it in-process (M3).
          </li>
          <li>
            <strong>Stages:</strong> walker follows <code>stageKeys</code> from{' '}
            <code>@zero/domain</code>. BA / Manual / Automation / Manager call{' '}
            <code>@zero/orchestrator/llm</code> when a decrypted key exists (M6); otherwise templates.
          </li>
          <li>
            <strong>Execution:</strong> orchestrator publishes <code>execution.requested</code>.
            Playwright executor (<code>@zero/executor</code>, folder <code>apps/executor/</code>)
            launches Chromium (M4). Compose runs that worker in its own image. Default{' '}
            <code>npm start</code> still runs it in the same process.
          </li>
          <li>
            <strong>Reports:</strong> pdfkit Manager PDF + Delivery JSON. SSE exists at{' '}
            <code>/api/runs/:id/stream</code>; the React client still polls.
          </li>
        </ol>
      </section>

      <section className="section" id="overview-tiers">
        <h2>The tiers we&apos;re heading to</h2>
        <CardGrid columns={3}>
          <Card title="1 · Presentation">
            <p>
              Web UI — folder <code>web/</code> · npm <code>@zero/web</code> · skill{' '}
              <code>/zero-web</code>. React 18 + Vite. Never talks to the DB or Chromium.
            </p>
          </Card>
          <Card title="2 · Application">
            <p>
              HTTP API (folder <code>apps/api/</code> · npm <code>@zero/api</code> · skill{' '}
              <code>/zero-api</code>) + Orchestrator worker (folder{' '}
              <code>apps/orchestrator/</code> · npm <code>@zero/orchestrator</code> · skill{' '}
              <code>/zero-orchestrator</code>). Communicate via queue.
            </p>
          </Card>
          <Card title="3 · Execution">
            <p>
              Playwright executor — folder <code>apps/executor/</code> · npm{' '}
              <code>@zero/executor</code> · skill <code>/zero-executor</code>. Ephemeral job that
              launches Chromium. Own image after S4. Autoscales on queue depth.
            </p>
          </Card>
        </CardGrid>
        <Note tone="info">
          Capability milestones M1–M4 are <StatusBadge status="done" />. Packaging S0–S4 are{' '}
          <StatusBadge status="done" />. S5–S6 (orchestrator image, remaining cloud) are{' '}
          <StatusBadge status="not-done" />.
          See <a href="#make-real">Make it Real</a> for how a developer implements the split with
          agent-workflow.
        </Note>
      </section>

      <section className="section" id="benefits">
        <h2>Benefits</h2>
        <CardGrid columns="auto">
          <Card title="One run, five artifacts">
            <p>Requirements, TC list, Playwright spec, Java class, and Manager/Delivery reports — from a single form.</p>
          </Card>
          <Card title="Channel-aware">
            <p>Profiles: Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic. Selectors and journeys per app family.</p>
          </Card>
          <Card title="Templates first, LLM optional">
            <p>Deterministic agents always run. LLM enrich is best-effort when a decrypted provider key exists.</p>
          </Card>
          <Card title="Portable output">
            <p>Java/Selenium class is plain text. Drop it in a Maven repo and run it against your own environments.</p>
          </Card>
          <Card title="Optional deep passes">
            <p>Accessibility, performance, and security stages toggle per run — feed straight into the Manager review.</p>
          </Card>
          <Card title="Traceability">
            <p>Every artifact links back to the run ID. PDF, JSON, and screenshots are downloadable per run.</p>
          </Card>
        </CardGrid>
      </section>

      <section className="section" id="stack">
        <h2>Complete tech stack · today</h2>
        <p className="sub">From <code>package.json</code> and the live code — nothing invented.</p>
        <CardGrid columns={2}>
          <Card title="Backend runtime · Node.js">
            <p>
              <code>express@4.19</code> · <code>playwright@1.52</code> · <code>multer</code> ·{' '}
              <code>pdfkit</code> · <code>xlsx</code> · <code>pg@8.13</code> · <code>uuid</code> ·{' '}
              <code>dotenv</code>
            </p>
          </Card>
          <Card title="API surface &amp; middleware">
            <p>
              <code>cors</code> · <code>helmet</code> · <code>compression</code> · <code>morgan</code> ·{' '}
              <code>express-rate-limit</code> · <code>express-validator</code> · Swagger UI
            </p>
          </Card>
          <Card title="Auth, secrets, logs, LLM">
            <p>
              <code>jsonwebtoken</code> · <code>node-cache</code> · <code>winston</code> ·{' '}
              <code>@zero/orchestrator/llm</code> (OpenAI / Claude / Gemini) ·{' '}
              <code>apps/api/encryption.js</code>
            </p>
          </Card>
          <Card title="Frontend">
            <p>
              <code>react@18</code> + Vite 5 · CSS modules per view · fonts Outfit / IBM Plex Mono /
              Syne
            </p>
          </Card>
          <Card title="Storage">
            <p>
              Postgres when configured · <code>@zero/cloud</code> object store (local HMAC / S3 / GCS)
              · in-memory Maps still shadow some tables · Redis when <code>REDIS_URL</code> is set
            </p>
          </Card>
          <Card title="Dev · tooling · docs">
            <p>
              Jest · ESLint 9 · <code>agent-workflow/</code> · this site (<code>zero-docs/</code>,
              React 19 + Vite 6 + TS strict) · optional <code>ml-training/</code>
            </p>
          </Card>
        </CardGrid>
      </section>

      <section className="section" id="structure">
        <h2>Project structure · today vs remaining split</h2>
        <p className="sub">
          Left is on disk now (S4). Right is what S5–S6 still change. Folder, npm
          package, and Cursor skill for each workspace are on the Architecture tab.
        </p>
        <Diagram ariaLabel="Current repo tree">
{`Zero/                          ON DISK NOW (S4)              REMAINING (S5–S6)
├─ package.json                workspaces root               (no runtime deps)
├─ apps/api/                   HTTP API · @zero/api          no Chromium (done)
│                                skill /zero-api
├─ apps/orchestrator/          Orchestrator worker           own image
│                                @zero/orchestrator · /zero-orchestrator
├─ apps/executor/              Playwright executor           own image (done)
│                                @zero/executor · /zero-executor
├─ packages/cloud/             Cloud adapters · @zero/cloud  Azure / Vercel · GATE-9
│                                skill /zero-cloud
├─ packages/{db,domain,…}      shared npm @zero/*            stays
├─ web/                        Web UI · @zero/web            nginx image
│                                skill /zero-web
├─ public/                     Vite build output             (served; do not hand-edit)
├─ agent-workflow/             M1–M7 done · packaging S5 next  stays
├─ zero-docs/                  this site                     stays
├─ infra/{aws,gcp}/            Terraform                     stays
└─ artifacts/                  runtime output                → object store`}
        </Diagram>
        <Note tone="info">
          UI changes live in <code>web/src/**</code> and need <code>npm run build</code>. Server
          behavior lives in <code>apps/api/src/routes/</code> plus the composition root{' '}
          <code>apps/api/server.js</code>. Chromium runs in <code>@zero/executor</code>.
        </Note>
      </section>

      <section className="section" id="overview-docs">
        <h2>How to read this docs site</h2>
        <p className="prose">
          <strong>Architecture</strong> is the whole target: tiers, 36-step sequence, providers,
          workspaces, LLD, Docker, and S0–S6.{' '}
          <strong>Make it Real</strong> is agent-workflow and per-workspace skills.{' '}
          <strong>Ship Checklist</strong> is the definition of done.
        </p>
      </section>
    </>
  );
}

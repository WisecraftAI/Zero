import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';
import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function OverviewPage() {
  return (
    <>
      <section className="section" id="purpose">
        <h2>What ZER0 is</h2>
        <p className="sub">
          An <strong>AI QA orchestration platform</strong> — paste any public URL and get a full QA
          artifact set, with or without uploaded test cases.
        </p>
        <Note tone="info">
          <strong>This tab is the product story</strong> — what ZER0 does, which AI agents run, and
          how people use it. System parts live on <a href="#architecture">Architecture</a> (tiers,
          workspaces, Docker) and <a href="#tech-stack">Tech Stack</a> (LLD, orchestrator, LLM
          wiring). <a href="#deployment">Deployment</a> is the step-by-step rollout.
        </Note>
        <p className="prose">
          Give ZER0 a <strong>target URL</strong> — OTT, SaaS, marketplace, corporate site, or any
          public page. Optionally add a <strong>test-case file</strong>, <strong>Figma link</strong>,
          or <strong>plain notes</strong>. With <strong>URL only</strong> (no file, short notes),
          the Web Analyzer crawls multiple pages, infers domain type, generates major functional test
          cases, and executes top critical flows in Playwright — no channel picker required.
        </p>
        <p className="prose">
          The point is not another test recorder or a static template generator. ZER0 is an{' '}
          <strong>agentic QA workflow</strong>: each stage is a purpose-built agent that reads your
          inputs, calls a large language model when you configure one, and hands structured output
          to the next agent until you have a stakeholder-ready package.
        </p>
      </section>

      <section className="section" id="ai-agents">
        <h2>AI agents in the pipeline</h2>
        <p className="sub">
          Every run walks a fixed agent chain. Each agent has deterministic templates so the
          pipeline always completes; when you add an OpenAI, Claude, or Gemini key,{' '}
          <code>@zero/orchestrator/llm</code> enriches that stage with model output.
        </p>
        <Pipeline>
          <PipelineStage id="🕷" title="Web Analyzer agent (optional)">
            Multi-page Playwright crawl when you have no test-case file and short notes. Surfaces{' '}
            <code>crawledPages</code>, page structure, forms, domain type, and suggested flows for
            downstream agents. Rules only — no LLM.
          </PipelineStage>
          <PipelineStage id="DI" title="Domain inference (automatic)">
            One LLM call after crawl when rule-based domain confidence is low. Infers site purpose
            and critical test areas. Skipped when no key or <code>ZERO_LLM=off</code>.
          </PipelineStage>
          <PipelineStage id="BA" title="BA agent">
            Consolidates URL + Figma + uploaded cases + notes + analyzer insights into channel-aware
            requirements. LLM enriches scope, acceptance criteria, and edge cases.
          </PipelineStage>
          <PipelineStage id="MQ" title="Manual QA agent">
            Generates app-oriented manual test cases — not generic templates. Uses profile + URL
            analysis + BA output; LLM adds cases the templates miss.
          </PipelineStage>
          <PipelineStage id="AQ" title="Automation QA agent">
            Builds adaptive locator candidates (profile → learned → Postgres) and emits Playwright +
            Java/Selenium script text. LLM suggests selector strategies when keys exist.
          </PipelineStage>
          <PipelineStage id="▶" title="Execution service">
            Playwright worker runs checks — <code>discovered_flows</code> (multi-step critical flows
            for URL-only auto) or <code>minimal</code> (load + screenshot for CSV). Captures
            evidence and logs elements for future locator learning. Not an LLM stage.
          </PipelineStage>
          <PipelineStage id="M" title="Manager agent">
            Executive review with root-cause analysis and an action plan. LLM narrative when a key
            exists; deterministic report structure always.
          </PipelineStage>
          <PipelineStage id="📦" title="Delivery agent">
            Stakeholder-ready delivery report (PDF / JSON) packaging everything from the run.
          </PipelineStage>
        </Pipeline>
        <Note tone="info">
          Optional deep passes — <strong>accessibility</strong>, <strong>performance</strong>, and{' '}
          <strong>security</strong> — are additional Playwright agents you toggle per run. Their
          findings feed into the Manager review.
        </Note>
      </section>

      <section className="section" id="ai-models">
        <h2>Multi-model LLM support</h2>
        <p className="sub">
          Bring your own key. ZER0 never stores plaintext provider secrets in artifacts or run JSON.
        </p>
        <CardGrid columns={3}>
          <Card title="OpenAI">
            <p>GPT-family models for BA consolidation, manual case expansion, locator hints, and Manager narrative.</p>
          </Card>
          <Card title="Anthropic Claude">
            <p>Same agent stages — pick Claude when your org standardizes on Anthropic.</p>
          </Card>
          <Card title="Google Gemini">
            <p>Same contract via <code>@zero/orchestrator/llm</code>; per-agent settings in the UI.</p>
          </Card>
        </CardGrid>
        <p className="prose">
          Configure keys under <strong>Provider keys</strong> in the UI (encrypted at rest when{' '}
          <code>KEY_ENC_SECRET</code> is set). Per-agent overrides live in <strong>Agent settings</strong>.
          Caps: <code>ZERO_LLM_RPM</code> and <code>ZERO_LLM_MAX_USD_PER_RUN</code>. Set{' '}
          <code>ZERO_LLM=off</code> to force template-only mode for demos or air-gapped runs.
        </p>
      </section>

      <section className="section" id="audience">
        <h2>Who it&apos;s for</h2>
        <p className="sub">
          Teams doing OTT / streaming / e-commerce QA who want AI agents to do the first 80% — then
          humans review and ship.
        </p>
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
            Compose UI at <code>http://localhost:3000</code>, or local Vite via{' '}
            <code>npm run client</code> → <code>http://localhost:5173</code> (API on{' '}
            <code>:3001</code> via <code>npm start</code> / <code>npm run start:all</code>).
            Dashboard shows past runs.
          </PipelineStage>
          <PipelineStage id="02" title="Create a new run">
            Enter a <strong>target URL</strong>. For guided mode, add any of: TC file (
            <code>.csv</code>, <code>.xlsx</code>, <code>.txt</code>, <code>.md</code>,{' '}
            <code>.json</code>), a Figma link, or BA notes. For autonomous mode, URL alone is
            enough.
          </PipelineStage>
          <PipelineStage id="03" title="Choose options">
            Enable accessibility or performance passes. Security checkbox is in the UI but not
            parsed by API intake yet. Add login credentials (runtime-only). Toggle &quot;show
            browser&quot; for a headed Chromium.
          </PipelineStage>
          <PipelineStage id="04" title="Watch the agents">
            Stages tick through — Web Analyzer → BA → Manual → Automation → Execution → optional
            passes → Manager → Delivery. LLM-enriched stages show model output in artifacts.
          </PipelineStage>
          <PipelineStage id="05" title="Review artifacts">
            On Run Detail, inspect the flow diagram of discovered journeys, then download
            requirements, manual TC list, Playwright spec, Java/Selenium class, PDF or JSON reports.
            Shareable paths: <code>/</code>, <code>/runs</code>, <code>/runs/new</code>,{' '}
            <code>/runs/:id</code>.
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
          <code>npm start</code> runs the HTTP API only; <code>npm run start:all</code> (or Compose)
          runs the workspace-scoped API, orchestrator, and executor images together. Chromium exists
          only in the executor image.
        </p>
        <ol className="compact">
          <li>
            <strong>Intake:</strong> UI POSTs to <code>/runs</code>. JSON +{' '}
            <code>uploads[]</code> returns presigned PUTs (M2). Legacy multipart still accepted.
          </li>
          <li>
            <strong>Persist:</strong> run metadata upserts to Postgres when{' '}
            <code>DATABASE_URL</code> is set (M1) — ten tables, hub <code>qa_runs</code>, only{' '}
            <code>qa_assets.run_id</code> is an enforced FK. ER + columns:{' '}
            <a href="#tech-schema">Tech → Schema · ER</a>. Fallback:{' '}
            <code>dist/artifacts/&lt;runId&gt;/run.json</code>.
          </li>
          <li>
            <strong>Queue:</strong> HTTP API publishes <code>runs.requested</code>. Orchestrator
            worker (<code>@zero/orchestrator</code>, folder <code>services/orchestrator/</code>)
            consumes it in-process (M3).
          </li>
          <li>
            <strong>Stages:</strong> walker follows <code>stageKeys</code> from{' '}
            <code>@zero/domain</code>. Host-scoped agentic memory is recalled into LLM
            context for the same host. BA / Manual / Automation / Manager call{' '}
            <code>@zero/orchestrator/llm</code> when a decrypted key exists (M6); otherwise templates.
          </li>
          <li>
            <strong>Execution:</strong> orchestrator publishes <code>execution.requested</code>.
            Playwright executor (<code>@zero/executor</code>, folder <code>services/executor/</code>)
            launches Chromium (M4) in its own image. <code>npm run start:all</code> co-locates that
            worker for local dev.
          </li>
          <li>
            <strong>Reports:</strong> pdfkit Manager PDF + Delivery JSON. SSE at{' '}
            <code>/runs/:id/stream</code> is primary (<code>useRunStream.js</code>); the React
            client falls back to 3s polling after SSE failures.
          </li>
        </ol>
      </section>

      <section className="section" id="overview-tiers">
        <h2>The three tiers · shipped</h2>
        <p className="sub">
          Packaging S0–S7 and product Q1–Q4 are <StatusBadge status="done" />. Docker and system
          diagrams live on <a href="#architecture">Architecture</a>; LLD, libraries, and generated
          module facts on <a href="#tech-stack">Tech Stack</a>.
        </p>
        <CardGrid columns={3}>
          <Card title="1 · Presentation">
            <p>
              Web UI — folder <code>web/</code> · npm <code>@zero/web</code> · skill{' '}
              <code>/zero-web</code>. React 18 + Vite. Never talks to the DB or Chromium.
            </p>
          </Card>
          <Card title="2 · Application">
            <p>
              HTTP API (folder <code>services/api/</code> · npm <code>@zero/api</code> · skill{' '}
              <code>/zero-api</code>) + Orchestrator worker (folder{' '}
              <code>services/orchestrator/</code> · npm <code>@zero/orchestrator</code> · skill{' '}
              <code>/zero-orchestrator</code>). Communicate via queue.
            </p>
          </Card>
          <Card title="3 · Execution">
            <p>
              Playwright executor — folder <code>services/executor/</code> · npm{' '}
              <code>@zero/executor</code> · skill <code>/zero-executor</code>. Ephemeral job that
              launches Chromium. Own image. Autoscales on queue depth.
            </p>
          </Card>
        </CardGrid>
      </section>

      <section className="section" id="benefits">
        <h2>Why AI orchestration</h2>
        <CardGrid columns="auto">
          <Card title="Agent chain, one run">
            <p>BA → Manual → Automation → Manager agents hand off structured artifacts — no copy-paste between ChatGPT tabs.</p>
          </Card>
          <Card title="Your model, your key">
            <p>OpenAI, Claude, or Gemini per agent. Templates keep the pipeline reliable when a provider is down or keys are absent.</p>
          </Card>
          <Card title="Channel-aware agents">
            <p>Profiles: Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic. Agents tune selectors and journeys per app family.</p>
          </Card>
          <Card title="Any-URL autonomous QA">
            <p>
              URL-only runs: multi-page crawl → domain cases → discovered flow execution. Not
              limited to OTT channel profiles.
            </p>
          </Card>
          <Card title="Crawl + reason">
            <p>
              Web Analyzer crawls up to <code>ZERO_ANALYZER_MAX_PAGES</code> internal pages; BA and
              Manual agents reason over what they find — not just your CSV.
            </p>
          </Card>
          <Card title="Evidence, not just text">
            <p>Execution runs real Playwright checks with screenshots. Manager agent reviews actual run outcomes.</p>
          </Card>
          <Card title="Portable output">
            <p>Java/Selenium class is plain text. Drop it in Maven and run against your environments — AI did the scaffolding.</p>
          </Card>
        </CardGrid>
      </section>

      <section className="section" id="overview-docs">
        <h2>How to read this docs site</h2>
        <p className="prose">
          Markdown lead briefings live beside this app under <code>docs/v1</code> (current runtime,
          including <code>DATABASE.md</code> for the Postgres ER) and <code>docs/v2</code> (vision +
          remaining gaps). Packaging is complete — the deep reading is Architecture + Tech Stack:
        </p>
        <Note tone="info">
          <strong>New developer on a new PC?</strong> Follow{' '}
          <code>support/zero-docs/docs/v1/DEVELOPER_GUIDE.md</code> §2 Day-0 (prerequisites, clone,{' '}
          <code>.env</code>, Docker vs hybrid vs <code>npm run start:all</code>, verify). Then use the{' '}
          <a href="#deployment">Deployment</a> tab for the same run paths in the interactive site.
        </Note>
        <ol className="compact">
          <li><strong>Overview</strong> — this tab: product purpose, audience, and how people use it.</li>
          <li><strong>Architecture</strong> — system parts: tiers, sequence, providers, workspaces, Docker, M1–M7 / S0–S7 / Q1–Q4 scores.</li>
          <li><strong>Tech Stack</strong> — deployable workspaces (Web, API, orchestrator, executor) with
            per-workspace LLD. Postgres ER on <a href="#tech-schema">Schema · ER</a>.</li>
          <li><strong>Packages</strong> — shared <code>@zero/*</code> libraries (domain, db, locators,
            builders, analyzer, cloud). Live disk docs via <code>npm run packages-doc</code>.</li>
          <li><strong>Deployment</strong> — step-by-step for local, Compose, hybrid, and production.</li>
          <li><strong>Make it Real</strong> — agent-workflow for boundary checks and per-workspace skills.</li>
          <li><strong>Ship Checklist</strong> — ops maturity gates still open after packaging.</li>
        </ol>
      </section>
    </>
  );
}

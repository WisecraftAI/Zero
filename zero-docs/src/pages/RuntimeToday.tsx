import { FlawItem } from '@/components/ui/FlawItem';
import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { Note } from '@/components/ui/Note';

export function RuntimeTodayPage() {
  return (
    <>
      <section className="section">
        <h2>Runtime today · pipeline stages</h2>
        <p className="sub">
          Order in <code>stageKeys</code>: optional webAnalyzer → BA → Manual QA → Automation QA
          → Execution → optional a11y/perf/security → Manager → Delivery.
        </p>

        <Pipeline>
          <PipelineStage id="OPT" title="Web Analyzer (optional)">
            Runs when no TC file and notes are short. Uses <code>lib/urlAnalyzerPro.js</code>{' '}
            (Playwright crawl) to seed BA with real page structure.
          </PipelineStage>
          <PipelineStage id="01" title="BA">
            Template consolidation of OTT URL + optional Figma + uploaded TCs + notes + analyzer
            insights. Emits BRD-shaped artifact.
          </PipelineStage>
          <PipelineStage id="02" title="Manual QA">
            Cases from CSV, UI rows, URL analysis, or channel templates.
          </PipelineStage>
          <PipelineStage id="03" title="Automation QA">
            Merges locators: profile → in-memory learned (+ Postgres when DB enabled). Emits
            Playwright spec + Java/Selenium class via <code>lib/scriptBuilder</code> +{' '}
            <code>lib/javaSeleniumBuilder</code>.
          </PipelineStage>
          <PipelineStage id="04" title="Execution">
            Playwright with retries + screenshots under <code>artifacts/&lt;runId&gt;/</code>.{' '}
            <code>EXECUTION_MODE=minimal</code> loads URL + waits for body (reliable).{' '}
            <code>full</code> attempts keyword nav (brittle).
          </PipelineStage>
          <PipelineStage id="OPT" title="Accessibility · Performance · Security (optional)">
            Playwright passes; emit inline in run artifact.
          </PipelineStage>
          <PipelineStage id="05" title="Manager">
            Executive review PDF via pdfkit.
          </PipelineStage>
          <PipelineStage id="06" title="Delivery">
            Stakeholder JSON summary.
          </PipelineStage>
        </Pipeline>
      </section>

      <section className="section">
        <h2>What&apos;s actually broken</h2>
        <p className="sub">
          Every item below is grounded in the current code — <code>server.js</code>,{' '}
          <code>lib/*</code>, or <code>.env.example</code>.
        </p>

        <FlawItem severity="p0" tag="P0" title="server.js is 5,099 lines">
          46 route handlers, every pipeline agent, the Playwright driver, and mutable globals in
          one file. Impossible to unit-test; impossible to deploy a subset.
        </FlawItem>
        <FlawItem severity="p1" tag="P1" title="Maps still shadow Postgres">
          M1 writes <code>qa_runs</code> / <code>qa_assets</code> when <code>DATABASE_URL</code>{' '}
          is set, but recordings, selector memory, and login secrets still live in process Maps.
        </FlawItem>
        <FlawItem severity="p1" tag="P1" title="Chromium still co-located locally">
          M4 routes Playwright through <code>execution.requested</code>. Default{" "}
          <code>npm start</code> still runs the worker in-process (local queue). Split with{" "}
          <code>API_ONLY=1</code> + <code>npm run execution</code> once a shared queue exists.
        </FlawItem>
        <FlawItem severity="p1" tag="P1" title="Auth is on, UI login is not">
          M5 verifies API keys / JWT and scopes runs by tenant. Local default is{" "}
          <code>ZERO_AUTH=off</code> (tenant <code>local</code> only). There is still no
          in-app login screen.
        </FlawItem>
        <FlawItem severity="p1" tag="P1" title="UI still polls">
          SSE exists at <code>/api/runs/:id/stream</code> (M3); the React client still polls
          every 2 s until it is wired to EventSource.
        </FlawItem>
        <FlawItem severity="p1" tag="P1" title="Shared queue needs aws/gcp, not local">
          M7 adapters implement SQS / Pub/Sub. Default <code>ZERO_CLOUD=local</code> is still
          in-process pub/sub — a second container will not see messages until you point at
          AWS or GCP.
        </FlawItem>
        <FlawItem severity="p2" tag="P2" title="LLM enrich is best-effort">
          M6 calls Claude / OpenAI / Gemini when a key exists. Templates still win if the
          provider errors, rate/cost caps trip, or <code>ZERO_LLM=off</code>.
        </FlawItem>
        <FlawItem severity="p2" tag="P2" title="Thin test net">
          S1 landed health + one pipeline smoke + Postgres persist/reload. Coverage is still
          far from the 5k-line <code>server.js</code>.
        </FlawItem>

        <Note tone="danger">
          These aren&apos;t style complaints — they&apos;re what the Target V3 tab exists to
          resolve, milestone by milestone.
        </Note>
      </section>
    </>
  );
}

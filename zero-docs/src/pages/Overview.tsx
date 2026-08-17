import { Card, CardGrid } from '@/components/ui/Card';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';

export function OverviewPage() {
  return (
    <>
      <section className="section" id="overview-what">
        <h2>What ZER0 is</h2>
        <p className="sub">
          Architect-level QA orchestration UI. Consumes an OTT URL (plus optional Figma / notes /
          uploaded test cases), runs a pipeline of agents, executes Playwright, and emits
          Manager / Delivery reports plus reusable Playwright + Java/Selenium scripts.
        </p>

        <Diagram ariaLabel="high-level today">
{`user (browser)
   │
   ▼
web (React 18 + Vite → served from public/)
   │  fetch /api/*
   ▼
server.js  (Express · 5,099 lines)
   │  handlers | agents | Playwright | winston | swagger | pdfkit
   ▼
artifacts/<runId>/           run.json · screenshots · pdfs
   (also in-memory Map)`}
        </Diagram>
      </section>

      <section className="section" id="overview-tiers">
        <h2>The tiers we&apos;re heading to</h2>
        <CardGrid columns={3}>
          <Card title="1 · Presentation">
            <p><code>web</code> — React 18 + Vite. Bundled to <code>dist/</code>, served by nginx (or any CDN). Never talks to the DB or Chromium.</p>
          </Card>
          <Card title="2 · Application">
            <p><code>api</code> (stateless HTTP + SSE) + <code>orchestrator</code> (long-lived DAG worker). Communicate via queue.</p>
          </Card>
          <Card title="3 · Execution">
            <p><code>executor</code> — ephemeral job that launches Chromium, uploads artifacts, upserts learned selectors. Autoscales on queue depth.</p>
          </Card>
        </CardGrid>

        <Note tone="info">
          The <a href="#v3">Target V3 tab</a> shows how today&apos;s folders map into these tiers,
          and how the four Docker images enforce the split.
        </Note>
      </section>

      <section className="section" id="overview-docs">
        <h2>How to read this docs site</h2>
        <p className="prose">
          <strong>Runtime Today</strong> is the honest picture of the code that actually ships —
          the god file, the disabled DB, the missing SSE.{' '}
          <strong>Production Blueprint</strong> is the seven-milestone shape we&apos;re driving to.{' '}
          <strong>Ship Checklist</strong> is the definition of done. <strong>Target V3</strong>{' '}
          is the mechanical work: repo layout, Docker, migration order, per-app LLD, and the
          quality gates that keep the split from rotting.
        </p>
      </section>
    </>
  );
}

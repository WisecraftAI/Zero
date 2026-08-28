import { ZeroLogoFull } from '../components/ZeroLogo';
import AiSetupBanner from '../components/AiSetupBanner';
import { useAiSetup } from '../data/useAiSetup';
import './MarketingHomeView.scss';

const PIPELINE = [
  {
    key: '01',
    name: 'Understand',
    agents: 'Web Analyzer · BA',
    detail: 'Crawl the linked pages, infer what kind of product this is, and consolidate the behavior into requirements.',
    artifacts: ['Crawl map', 'Requirements brief'],
  },
  {
    key: '02',
    name: 'Design',
    agents: 'Manual QA · Automation QA',
    detail: 'Write the manual cases worth running, then resolve locators and emit automation for the critical flows.',
    artifacts: ['Manual test cases', 'Playwright + Java scripts'],
  },
  {
    key: '03',
    name: 'Execute',
    agents: 'Executor',
    detail: 'Run the flows in Chromium with retries, screenshots, and optional accessibility, performance, and security passes.',
    artifacts: ['Screenshots', 'Execution results'],
  },
  {
    key: '04',
    name: 'Decide',
    agents: 'Manager · Delivery',
    detail: 'Turn the evidence into an executive read: what broke, what it risks, and whether this build should ship.',
    artifacts: ['Manager report', 'Delivery summary'],
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 9h11M10 5l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="10" cy="10" r="7" />
        <path d="M3 10h14" />
        <path d="M10 3c2 2 2 12 0 14M10 3c-2 2-2 12 0 14" />
      </g>
    </svg>
  );
}

function RelayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="4.5" cy="10" r="2" />
        <circle cx="15.5" cy="5" r="2" />
        <circle cx="15.5" cy="15" r="2" />
        <path d="M6.3 9.1 13.7 5.6M6.3 10.9l7.4 3.5" />
      </g>
    </svg>
  );
}

function EvidenceIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M3 12.5h14" />
        <path d="M6.6 8.4l1.9 1.9 3.6-3.6" />
      </g>
    </svg>
  );
}

const OUTCOMES = [
  {
    id: '01',
    title: 'Any public URL',
    detail:
      'Point ZERO at a live product and it starts working. No specification to write first, no fixtures to seed, no test IDs to add to someone else’s codebase.',
    proof: 'No spec required to start',
    Icon: GlobeIcon,
  },
  {
    id: '02',
    title: 'One agent pipeline',
    detail:
      'BA, Manual QA, Automation QA, execution, and Manager hand their output to each other inside a single run — instead of five tools, five owners, and a status thread between them.',
    proof: 'Five agents, one handoff',
    Icon: RelayIcon,
  },
  {
    id: '03',
    title: 'Evidence, not promises',
    detail:
      'Screenshots, generated Playwright and Java scripts, execution results, and reports stay attached to the run, so every release call can be traced back to what actually happened.',
    proof: 'Every claim is traceable',
    Icon: EvidenceIcon,
  },
];

export default function MarketingHomeView({ onNewRun, onDashboard, onNavigate }) {
  const aiSetup = useAiSetup();

  return (
    <div className="marketing-home">
      <section className="marketing-hero" aria-labelledby="marketing-title">
        <div className="marketing-hero-copy">
          <div className="marketing-kicker">
            <span className="marketing-kicker-dot" />
            AI-first QA orchestration
          </div>
          <h1 id="marketing-title">
            One URL in.
            <span>Complete QA out.</span>
          </h1>
          <p className="marketing-lede">
            ZERO understands a product, writes the coverage, runs the checks,
            and explains the release risk—without making you coordinate a room
            full of tools and handoffs.
          </p>
          <div className="marketing-actions" aria-label="Get started">
            <button className="marketing-cta marketing-cta--primary" onClick={onNewRun}>
              Start a new run <ArrowIcon />
            </button>
            <button className="marketing-cta marketing-cta--secondary" onClick={onDashboard}>
              Open dashboard
            </button>
          </div>
          <p className="marketing-proof">
            <span>Requirements</span>
            <span>Test cases</span>
            <span>Automation</span>
            <span>Reports</span>
          </p>
        </div>

        <div className="marketing-brand-stage" aria-label="ZERO product identity">
          <div className="marketing-brand-glow" />
          <ZeroLogoFull width={470} className="marketing-brand-logo" />
          <div className="marketing-pass">
            <span className="marketing-pass-pulse" />
            One autonomous pass
          </div>
        </div>
      </section>

      {!aiSetup.loading && aiSetup.available && (
        <section className="marketing-ai-setup" aria-label="AI agent setup">
          <AiSetupBanner
            variant="marketing"
            geminiConfigured={aiSetup.geminiConfigured}
            activeCount={aiSetup.activeCount}
            onGoApiKeys={() => onNavigate('apikeys')}
            onGoAgents={() => onNavigate('agents')}
            onEnableGemini={aiSetup.geminiConfigured ? aiSetup.enableGemini : undefined}
            enabling={aiSetup.enabling}
          />
        </section>
      )}

      <section className="marketing-pipeline" aria-labelledby="pipeline-title">
        <div className="marketing-section-heading">
          <span>How ZERO works</span>
          <h2 id="pipeline-title">Four decisions. One uninterrupted run.</h2>
          <p className="marketing-section-lede">
            A single URL moves from discovery to a release call in one pass.
            Each stage hands its output straight to the next one, so you read
            the result instead of shepherding the middle.
          </p>
        </div>
        <ol className="marketing-pipeline-track">
          {PIPELINE.map((stage) => (
            <li key={stage.key}>
              <div className="marketing-stage-head">
                <span className="marketing-stage-number">{stage.key}</span>
                <span className="marketing-stage-agents">{stage.agents}</span>
              </div>
              <div className="marketing-stage-copy">
                <h3>{stage.name}</h3>
                <p>{stage.detail}</p>
              </div>
              <ul className="marketing-stage-artifacts">
                {stage.artifacts.map((artifact) => (
                  <li key={artifact}>{artifact}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="marketing-pipeline-note">
          <span className="marketing-pipeline-note-mark" aria-hidden="true" />
          Every artifact stays attached to the run, so a report can always be
          traced back to the screenshot that produced it.
        </p>
      </section>

      <section className="marketing-outcomes" aria-labelledby="outcomes-title">
        <div className="marketing-outcomes-intro">
          <span className="marketing-eyebrow">Built for product teams</span>
          <h2 id="outcomes-title">From “test this” to “ship this” without the coordination tax.</h2>
          <p className="marketing-section-lede">
            A release usually waits on four separate chases: a spec, a test plan,
            an automation backlog, and someone willing to make the call. One ZERO
            run produces all four and leaves the evidence behind for each.
          </p>
          <ul className="marketing-audience" aria-label="Who this is for">
            <li>Product managers</li>
            <li>QA leads</li>
            <li>Engineering managers</li>
          </ul>
        </div>
        <div className="marketing-outcome-list">
          {OUTCOMES.map(({ id, title, detail, proof, Icon }) => (
            <article key={id}>
              <span className="marketing-outcome-icon">
                <Icon />
              </span>
              <div className="marketing-outcome-body">
                <div className="marketing-outcome-head">
                  <h3>{title}</h3>
                  <span>{id}</span>
                </div>
                <p>{detail}</p>
                <p className="marketing-outcome-proof">
                  <span aria-hidden="true" />
                  {proof}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-final-cta" aria-label="Start using ZERO">
        <div>
          <span>Ready when your URL is.</span>
          <h2>Give the agents something real to test.</h2>
        </div>
        <div className="marketing-final-actions">
          <button className="marketing-cta marketing-cta--on-accent" onClick={onNewRun}>
            Start a new run <ArrowIcon />
          </button>
          <div className="marketing-final-signal">
            <span />
            Any public URL
          </div>
        </div>
      </section>
    </div>
  );
}

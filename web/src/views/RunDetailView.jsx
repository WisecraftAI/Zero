import { useState, useEffect } from 'react';
import PipelineFlow from '../components/PipelineFlow';
import RunProgressPanel from '../components/RunProgressPanel';
import { apiUrl } from '../apiBase';
import './RunDetailView.css';

/* ─── Tab definitions ─────────────────────────────────────── */
const ALL_TABS = [
  { id: 'webAnalysis',  label: 'Web Analysis',  optional: true },
  { id: 'requirements', label: 'Requirements' },
  { id: 'manual',       label: 'Manual TC' },
  { id: 'automation',   label: 'Automation' },
  { id: 'execution',    label: 'Execution' },
  { id: 'accessibility',label: 'Accessibility', optional: true },
  { id: 'performance',  label: 'Performance',   optional: true },
  { id: 'security',     label: 'Security',      optional: true },
  { id: 'manager',      label: 'Manager Report' },
  { id: 'recording',    label: 'Recording',     optional: true },
  { id: 'element-log',  label: 'Element Log' },
  { id: 'flow',         label: 'Flow Diagram',  optional: true },
];

function getVisibleTabs(run) {
  return ALL_TABS.filter(t => {
    if (!t.optional) return true;
    if (t.id === 'webAnalysis')   return !!run?.stages?.webAnalyzer;
    if (t.id === 'accessibility') return !!run?.stages?.accessibility;
    if (t.id === 'performance')   return !!run?.stages?.performance;
    if (t.id === 'security')      return !!run?.stages?.security;
    if (t.id === 'recording')     return !!(run?.artifacts?.recording || run?.input?.recording);
    if (t.id === 'flow')          return !!run?.picture;
    return false;
  });
}

function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(ts).slice(0, 16); }
}

/* ─── Main component ─────────────────────────────────────── */
export default function RunDetailView({ run, runId, onRerunFailed, onBack, streamTransport }) {
  const [activeTab, setActiveTab] = useState('requirements');
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (run?.status !== 'running') return undefined;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [run?.status]);

  // While execution runs, surface the execution tab so results appear as they land.
  useEffect(() => {
    if (run?.stages?.execution?.status === 'running') {
      setActiveTab('execution');
    }
  }, [run?.stages?.execution?.status]);

  const visibleTabs = getVisibleTabs(run);
  const currentTabId = visibleTabs.find(t => t.id === activeTab) ? activeTab : 'requirements';

  const hasFailures = run?.artifacts?.executionReport?.totals?.failed > 0;
  const canDownload = run?.status === 'completed';

  const es = run?.artifacts?.managerReport?.executiveSummary || {};
  const verdictKey = (es.verdict || '').toLowerCase() === 'go' ? 'go'
    : (es.verdict || '').toLowerCase().includes('conditional') ? 'conditional'
    : 'hold';

  const idStr = String(runId || '').slice(0, 20);
  const runStatus = run?.status;


  return (
    <div className="run-detail-view">

      {/* Header */}
      <div className="rdt-header">
        <div className="rdt-header-left">
          <div className="rdt-url">
            {run?.input?.ottUrl
              ? <a href={run.input.ottUrl} target="_blank" rel="noreferrer">{run.input.ottUrl}</a>
              : <span className="text-muted">{runId ? 'Loading…' : 'No run active'}</span>
            }
          </div>
          <div className="rdt-meta-row">
            <code className="rdt-run-id">{idStr}{idStr.length === 20 ? '…' : ''}</code>
            {runStatus && <span className={`chip ${runStatus}`}>{runStatus}</span>}
            {es.verdict && <span className={`verdict ${verdictKey}`}>{es.verdict}</span>}
            {es.passRate && <span className="rdt-passrate">Pass rate: <strong>{es.passRate}</strong></span>}
            {run && <span className="rdt-date">Started {fmtDate(run.startedAt || run.createdAt)}</span>}
          </div>
        </div>
        <div className="rdt-header-right">
          <button className="btn btn-secondary btn-sm" disabled={!runId || !hasFailures} onClick={onRerunFailed}>
            Re-run Failed
          </button>
          <button className="btn btn-secondary btn-sm" disabled={!canDownload}
            onClick={() => window.open(apiUrl(`/runs/${runId}/download`), '_blank')}>
            <DownloadIcon /> PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Runs
          </button>
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="rdt-pipeline-panel">
        <RunProgressPanel run={run} streamTransport={streamTransport} />
        <div className="rdt-section-label">Pipeline stages</div>
        <PipelineFlow run={run} tick={tick} />
      </div>

      {/* Main body — tabs + optional side panel */}
      <div className="rdt-body">

        {/* Tabs */}
        <div className="rdt-tab-panel">
          <div className="rdt-tabs">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                className={`rdt-tab${currentTabId === tab.id ? ' rdt-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'execution' && run?.artifacts?.executionReport?.totals && (
                  <TabBadge
                    passed={run.artifacts.executionReport.totals.passed}
                    failed={run.artifacts.executionReport.totals.failed}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="rdt-tab-content">
            <TabContent run={run} tab={currentTabId} runId={runId} />
          </div>
        </div>
        
        {/* Actual Flow Side Panel */}
        <div className="rdt-actual-flow-panel">
          <div className="rdt-side-label">
            {runStatus === 'running' && <span className="rdt-side-live-dot" />}
            Actual Flow
          </div>
          <ActualFlowContent run={run} />
        </div>


      </div>
    </div>
  );
}

function TabBadge({ passed, failed }) {
  if (passed == null && failed == null) return null;
  return (
    <span className="rdt-tab-badge">
      {failed > 0
        ? <span style={{ color: 'var(--red)' }}>{failed}✕</span>
        : <span style={{ color: 'var(--green)' }}>{passed}✓</span>
      }
    </span>
  );
}

/* ─── Tab content switch ─────────────────────────────────── */
function TabContent({ run, tab, runId }) {
  if (!run) {
    return (
      <div className="tab-empty">
        {runId ? 'Pipeline starting…' : 'No active run. Start one from New Run.'}
      </div>
    );
  }
  switch (tab) {
    case 'webAnalysis':   return <WebAnalysisTab run={run} />;
    case 'requirements':  return <RequirementsTab run={run} />;
    case 'manual':        return <ManualTab run={run} />;
    case 'automation':    return <AutomationTab run={run} />;
    case 'execution':     return <ExecutionTab run={run} />;
    case 'accessibility': return <AccessibilityTab run={run} />;
    case 'performance':   return <PerformanceTab run={run} />;
    case 'security':      return <SecurityTab run={run} />;
    case 'manager':       return <ManagerTab run={run} />;
    case 'recording':     return <RecordingTab run={run} />;
    case 'element-log':   return <ElementLogTab />;
    case 'flow':          return <FlowTab run={run} />;
    default:              return null;
  }
}

/* ─── Tab panels ─────────────────────────────────────────── */

function RequirementsTab({ run }) {
  const d = run.artifacts?.requirements;
  if (!d) return <Awaiting />;
  const items = d.requirements || d.items || (Array.isArray(d) ? d : null);
  if (items) {
    return (
      <div className="req-list">
        {items.map((req, i) => (
          <div key={i} className="req-item">
            <span className="req-num">R{String(i + 1).padStart(2, '0')}</span>
            <span className="req-text">{typeof req === 'string' ? req : req.requirement || req.text || JSON.stringify(req)}</span>
          </div>
        ))}
        <JsonToggle data={d} />
      </div>
    );
  }
  return <JsonBlock data={d} />;
}

function ManualTab({ run }) {
  const d = run.artifacts?.manualTestCases;
  if (!d) return <Awaiting />;
  const cases = d.testCases || d.cases || (Array.isArray(d) ? d : null);
  if (cases) {
    return (
      <div className="tc-list">
        {cases.map((tc, i) => (
          <div key={i} className="tc-card">
            <div className="tc-header">
              <span className="tc-id">{tc.id || `TC-${i + 1}`}</span>
              <span className="tc-feature">{tc.feature || tc.Feature || ''}</span>
              {tc.priority && <PriorityBadge p={tc.priority} />}
            </div>
            <div className="tc-scenario">{tc.scenario || tc.Scenario || tc.title || ''}</div>
            {tc.steps?.length > 0 && (
              <ol className="tc-steps">
                {tc.steps.map((s, j) => <li key={j}>{typeof s === 'string' ? s : s.action || JSON.stringify(s)}</li>)}
              </ol>
            )}
            {tc.expectedResult && (
              <div className="tc-expected">
                <span className="tc-expected-label">Expected</span>
                {tc.expectedResult}
              </div>
            )}
          </div>
        ))}
        <JsonToggle data={d} />
      </div>
    );
  }
  return <JsonBlock data={d} />;
}

function AutomationTab({ run }) {
  const d = run.artifacts?.automationBundle;
  if (!d) return <Awaiting />;
  const lang = d.metadata?.scriptingLanguage || 'Java';
  const framework = d.metadata?.framework || 'Selenium';
  return (
    <div className="automation-panel">
      <div className="automation-meta">
        <span className="lang-tag">{lang}</span>
        <span className="framework-tag">{framework}</span>
      </div>
      {d.generatedSeleniumJava && <CodeSection title="Java / Selenium" code={d.generatedSeleniumJava} />}
      {d.generatedPlaywrightScript && (
        <CollapsibleCodeSection title="Playwright (runtime)" code={d.generatedPlaywrightScript} />
      )}
      <JsonToggle data={d} />
    </div>
  );
}

function ExecutionTab({ run }) {
  const data = run.artifacts?.executionReport;
  if (!data) return <Awaiting />;
  const tests = data.tests || [];
  const totals = data.totals || {};
  return (
    <div className="exec-panel">
      <div className="exec-summary">
        <span className="exec-stat"><strong>{totals.total ?? 0}</strong> run</span>
        <span className="exec-stat status-passed"><strong>{totals.passed ?? 0}</strong> passed</span>
        <span className="exec-stat status-failed"><strong>{totals.failed ?? 0}</strong> failed</span>
        <span className="exec-stat">Pass rate: <strong>{totals.passRate ?? '0%'}</strong></span>
      </div>
      <table className="data-table exec-table">
        <thead>
          <tr><th>ID</th><th>Title</th><th>Status</th><th>Error</th><th>Evidence</th></tr>
        </thead>
        <tbody>
          {tests.map(t => (
            <tr key={t.id}>
              <td><span className="tc-id-small">{t.id}</span></td>
              <td className="exec-title">{(t.title || '').slice(0, 70)}{(t.title || '').length > 70 ? '…' : ''}</td>
              <td><span className={`status-${t.status}`}>{t.status}</span></td>
              <td className="exec-error">{t.error ? String(t.error).slice(0, 90) + (String(t.error).length > 90 ? '…' : '') : '—'}</td>
              <td>
                {t.screenshot
                  ? <a href={t.screenshot} target="_blank" rel="noreferrer" className="screenshot-link">Screenshot ↗</a>
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <JsonToggle data={data} />
    </div>
  );
}

function AccessibilityTab({ run }) {
  const data = run.artifacts?.accessibilityReport;
  if (!data) return <Awaiting msg="Accessibility Agent not enabled or awaiting…" />;
  const summary = data.summary || {};
  const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';
  return (
    <div className="agent-report">
      <div className="agent-score-row">
        <span className={`score-badge ${scoreClass}`}>{summary.score ?? '—'}<small>/100</small></span>
        <div>
          <div className="agent-verdict">{summary.verdict || '—'}</div>
          <div className="agent-counts">
            {summary.checksRun} checks · {summary.passed} passed · {summary.errors} errors · {summary.warnings} warnings
          </div>
        </div>
      </div>
      {data.checks?.length > 0 && (
        <Section title="Checks">
          <table className="data-table">
            <thead><tr><th>Check</th><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {data.checks.map((c, i) => (
                <tr key={i}>
                  <td>{c.name}</td>
                  <td><span className={c.status === 'pass' ? 'status-passed' : c.status === 'fail' ? 'status-failed' : 'status-skipped'}>{c.status}</span></td>
                  <td>{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.issues?.length > 0 && (
        <Section title="Issues">
          <ul className="issue-list">
            {data.issues.map((issue, i) => (
              <li key={i} className={`issue issue--${issue.type}`}>
                <strong>[{issue.category}]</strong> {issue.message}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {data.recommendations?.length > 0 && (
        <Section title="Recommendations">
          <ol className="reco-list">{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}

function PerformanceTab({ run }) {
  const data = run.artifacts?.performanceReport;
  if (!data) return <Awaiting msg="Performance Agent not enabled or awaiting…" />;
  const summary = data.summary || {};
  const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';
  return (
    <div className="agent-report">
      <div className="agent-score-row">
        <span className={`score-badge ${scoreClass}`}>{summary.score ?? '—'}<small>/100</small></span>
        <div>
          <div className="agent-verdict">{summary.verdict || '—'}</div>
          <div className="agent-counts">
            Load: <strong>{summary.loadTime}</strong> · Resources: {summary.resourceCount} · Size: {summary.totalSize}
          </div>
        </div>
      </div>
      {data.coreWebVitals && (
        <Section title="Core Web Vitals">
          <div className="vitals-grid">
            <VitalCard label="FCP" value={data.coreWebVitals.fcp} />
            <VitalCard label="DCL" value={data.coreWebVitals.domContentLoaded} />
            <VitalCard label="Load" value={data.coreWebVitals.loadComplete} />
          </div>
        </Section>
      )}
      {data.metrics?.length > 0 && (
        <Section title="Metrics">
          <table className="data-table">
            <thead><tr><th>Metric</th><th>Value</th><th>Score</th></tr></thead>
            <tbody>
              {data.metrics.map((m, i) => <tr key={i}><td>{m.name}</td><td>{m.value}</td><td>{m.score}</td></tr>)}
            </tbody>
          </table>
        </Section>
      )}
      {data.recommendations?.length > 0 && (
        <Section title="Recommendations">
          <ol className="reco-list">{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}

function WebAnalysisTab({ run }) {
  const data = run.artifacts?.webAnalysis;
  if (!data) return <Awaiting msg="Web Analyzer runs automatically when no test document is provided." />;
  return (
    <div className="agent-report">
      <Section title="Site Overview">
        <div className="site-overview">
          <p><strong>Title:</strong> {data.siteOverview?.title || '—'}</p>
          <p><strong>Type:</strong> {data.siteOverview?.type || '—'}</p>
          <p><strong>Domain:</strong> {data.metadata?.domain || '—'} ({data.metadata?.siteName})</p>
          <p><strong>Pages Discovered:</strong> {data.siteOverview?.pagesDiscovered || 0}</p>
        </div>
      </Section>
      {data.baInsights && (
        <Section title="BA Insights">
          <p className="insight-summary">{data.baInsights.summary}</p>
          {data.baInsights.keyFunctionalities?.length > 0 && (
            <>
              <h4>Key Functionalities</h4>
              <ul className="feature-list">
                {data.baInsights.keyFunctionalities.map((f, i) => (
                  <li key={i}><strong>{f.name}</strong> - Priority: <span className={`priority-${f.priority?.toLowerCase()}`}>{f.priority}</span></li>
                ))}
              </ul>
            </>
          )}
          {data.baInsights.userJourneys?.length > 0 && (
            <>
              <h4>Suggested User Journeys</h4>
              <ol className="journey-list">{data.baInsights.userJourneys.map((j, i) => <li key={i}>{j}</li>)}</ol>
            </>
          )}
          {data.baInsights.criticalPaths?.length > 0 && (
            <>
              <h4>Critical Paths</h4>
              <ul className="critical-list">{data.baInsights.criticalPaths.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </>
          )}
        </Section>
      )}
      {data.features?.length > 0 && (
        <Section title="Discovered Features">
          <table className="data-table">
            <thead><tr><th>Feature</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              {data.features.map((f, i) => (
                <tr key={i}><td>{f.name}</td><td>{f.type}</td><td>{f.description}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.discoveredPages?.length > 0 && (
        <Section title="Discovered Pages">
          <ul className="page-list">
            {data.discoveredPages.map((p, i) => (
              <li key={i}><strong>{p.linkText}</strong>: {p.title} <a href={p.url} target="_blank" rel="noreferrer">→</a></li>
            ))}
          </ul>
        </Section>
      )}
      {data.suggestedTestAreas?.length > 0 && (
        <Section title="Suggested Test Areas">
          {data.suggestedTestAreas.map((area, i) => (
            <div key={i} className="test-area-block">
              <h4>{area.area} <span className={`priority-badge priority-${area.priority?.toLowerCase()}`}>{area.priority}</span></h4>
              <ul>{area.tests?.map((t, j) => <li key={j}>{t}</li>)}</ul>
            </div>
          ))}
        </Section>
      )}
      {data.suggestedRequirements?.length > 0 && (
        <Section title="Auto-Generated Requirements">
          <ul className="req-list">{data.suggestedRequirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}

function SecurityTab({ run }) {
  const data = run.artifacts?.securityReport;
  if (!data) return <Awaiting msg="Security Agent not enabled or awaiting…" />;
  const summary = data.summary || {};
  const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';
  return (
    <div className="agent-report">
      <div className="agent-score-row">
        <span className={`score-badge ${scoreClass}`}>{summary.score ?? '—'}<small>/100</small></span>
        <div>
          <div className="agent-verdict">{summary.verdict || '—'}</div>
          <div className="agent-counts">
            {summary.checksRun} checks · {summary.passed} passed · {summary.failed} failed · {summary.warnings} warnings
          </div>
        </div>
      </div>
      {data.securityHeaders && (
        <Section title="Security Headers">
          <table className="data-table">
            <thead><tr><th>Header</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Content-Security-Policy</td><td className={data.securityHeaders.contentSecurityPolicy ? 'status-passed' : 'status-failed'}>{data.securityHeaders.contentSecurityPolicy ? '✓ Present' : '✗ Missing'}</td></tr>
              <tr><td>X-Frame-Options</td><td className={data.securityHeaders.xFrameOptions ? 'status-passed' : 'status-failed'}>{data.securityHeaders.xFrameOptions || '✗ Missing'}</td></tr>
              <tr><td>X-Content-Type-Options</td><td className={data.securityHeaders.xContentTypeOptions ? 'status-passed' : 'status-failed'}>{data.securityHeaders.xContentTypeOptions || '✗ Missing'}</td></tr>
              <tr><td>Strict-Transport-Security</td><td className={data.securityHeaders.strictTransportSecurity ? 'status-passed' : 'status-failed'}>{data.securityHeaders.strictTransportSecurity ? '✓ Present' : '✗ Missing'}</td></tr>
              <tr><td>Referrer-Policy</td><td className={data.securityHeaders.referrerPolicy ? 'status-passed' : 'status-skipped'}>{data.securityHeaders.referrerPolicy || '—'}</td></tr>
            </tbody>
          </table>
        </Section>
      )}
      {data.checks?.length > 0 && (
        <Section title="Security Checks">
          <table className="data-table">
            <thead><tr><th>Check</th><th>Status</th><th>Severity</th><th>Description</th></tr></thead>
            <tbody>
              {data.checks.map((c, i) => (
                <tr key={i}>
                  <td>{c.name}</td>
                  <td><span className={c.status === 'pass' ? 'status-passed' : c.status === 'fail' ? 'status-failed' : 'status-skipped'}>{c.status}</span></td>
                  <td><span className={`severity-${c.severity}`}>{c.severity}</span></td>
                  <td>{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.vulnerabilities?.length > 0 && (
        <Section title="⚠️ Vulnerabilities Found">
          <ul className="issue-list">
            {data.vulnerabilities.map((v, i) => (
              <li key={i} className={`issue issue--${v.type}`}>
                <strong>[{v.type?.toUpperCase()}]</strong> {v.name}: {v.description}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {data.recommendations?.length > 0 && (
        <Section title="Recommendations">
          <ol className="reco-list">{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
        </Section>
      )}
      {data.complianceNotes?.length > 0 && (
        <Section title="Compliance Notes">
          <ul className="compliance-list">{data.complianceNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}

function ManagerTab({ run }) {
  const data = run.artifacts?.managerReport;
  if (!data) return <Awaiting />;
  const es = data.executiveSummary || {};
  const verdictKey = es.verdict?.toLowerCase() === 'go' ? 'go'
    : es.verdict?.toLowerCase().includes('conditional') ? 'conditional' : 'hold';
  return (
    <div className="manager-panel">
      <div className="manager-verdict-row">
        {es.verdict && <span className={`verdict ${verdictKey}`}>{es.verdict}</span>}
        <div className="manager-stats">
          <span>Risk: <strong>{es.riskLevel || '—'}</strong></span>
          <span>Pass rate: <strong>{es.passRate || '0%'}</strong></span>
          <span>{es.executed ?? 0}/{es.totalTestCases ?? 0} executed</span>
          <span className="status-passed">{es.passed ?? 0} passed</span>
          <span className="status-failed">{es.failed ?? 0} failed</span>
        </div>
      </div>
      {data.traceabilityMatrix?.length > 0 && (
        <Section title="Traceability Matrix">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Error</th></tr></thead>
            <tbody>
              {data.traceabilityMatrix.slice(0, 30).map(t => (
                <tr key={t.id}>
                  <td><span className="tc-id-small">{t.id}</span></td>
                  <td>{(t.title || '').slice(0, 55)}</td>
                  <td><span className={`status-${t.status}`}>{t.status}</span></td>
                  <td className="exec-error">{t.error ? String(t.error).slice(0, 60) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.analysis?.rootCauses?.length > 0 && (
        <Section title="Root Causes">
          <ul className="rca-list">{data.analysis.rootCauses.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </Section>
      )}
      {data.actionPlan?.length > 0 && (
        <Section title="Action Plan">
          <ol className="reco-list">{data.actionPlan.map((a, i) => <li key={i}>{a}</li>)}</ol>
        </Section>
      )}
      {data.signOff?.recommendation && (
        <Section title="Sign-off">
          <p className="signoff-text">{data.signOff.recommendation}</p>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}

function RecordingTab({ run }) {
  const rec = run.artifacts?.recording || run.input?.recording;
  if (!rec) return <Awaiting msg="No recording attached to this run." />;
  const events = rec.events || [];
  return (
    <div className="recording-panel">
      <div className="recording-meta">
        Source: <strong>{rec.source || 'session'}</strong> · {events.length} events
        {rec.ottUrl && <> · URL: <a href={rec.ottUrl} target="_blank" rel="noreferrer">{rec.ottUrl}</a></>}
      </div>
      {events.length > 0 && (
        <CollapsibleCodeSection title={`Events (${events.length})`} code={JSON.stringify(events, null, 2)} />
      )}
      <JsonToggle data={rec} />
    </div>
  );
}

function ElementLogTab() {
  return (
    <div className="element-log-info">
      <p>To submit element logs, use the <strong>Locators</strong> section in the sidebar.</p>
      <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 8 }}>
        Element logs improve selector accuracy across runs by building a persistent locator registry.
      </p>
    </div>
  );
}

function FlowTab({ run }) {
  if (!run?.picture) return <Awaiting />;
  return <div className="flow-wrap" dangerouslySetInnerHTML={{ __html: run.picture }} />;
}

function ActualFlowContent({ run }) {
  const manual = run?.artifacts?.manualTestCases;
  const basePlan = manual?.testCases || manual?.cases || (Array.isArray(manual) ? manual : []);
  const report = run?.artifacts?.executionReport;
  const execTests = report?.tests || [];
  const runStatus = run?.status;
  const isExecuting = runStatus === 'running';

  let finalNodes = [];
  if (basePlan.length > 0) {
    // Create lookup map normalized to uppercase keys to prevent mismatch
    const execMap = {};
    execTests.forEach(t => {
      if (t.id) execMap[String(t.id).toUpperCase()] = t;
    });

    finalNodes = basePlan.map(item => {
      const match = item.id ? execMap[String(item.id).toUpperCase()] : null;
      return {
        id: item.id || '',
        title: item.scenario || item.title || 'Untitled Step',
        status: match ? match.status : 'queued',
        screenshot: match?.screenshot || null,
        original: match || item
      };
    });
  } else if (execTests.length > 0) {
    finalNodes = execTests.map(t => ({
      id: t.id || '',
      title: t.title || 'Untitled Step',
      status: t.status,
      screenshot: t.screenshot,
      original: t
    }));
  }

  // If entire process is executing, let's highlight the current executing task
  const executionStage = run?.stages?.execution?.status;
  const isSpecificallyExecuting = executionStage === 'running' || (isExecuting && !executionStage);
  
  if (isSpecificallyExecuting && finalNodes.length > 0) {
    const anyActuallyRunning = finalNodes.some(n => {
      const s = String(n.status || '').toLowerCase();
      return s === 'running' || s === 'in-progress';
    });
    // If nothing is explicitly marked running, implicitly assume the first queued one is active
    if (!anyActuallyRunning) {
      const firstQueued = finalNodes.find(n => {
        const s = String(n.status || '').toLowerCase();
        return s !== 'pass' && s !== 'passed' && s !== 'fail' && s !== 'failed' && s !== 'skipped';
      });
      if (firstQueued) {
        firstQueued.status = 'running';
      }
    }
  }

  if (finalNodes.length === 0) {
    const msg = isExecuting ? 'Preparation step...' : 'No plan or execution flow available yet.';
    return <div className="af-empty">{msg}</div>;
  }

  return (
    <div className="af-sidebar-list">
      {finalNodes.map((n, i) => {
        const status = normalizeStatus(n.status);
        return (
          <div key={n.id || i} className="af-sidebar-step">
            <div className={`af-sb-node af-sb-node--${status}`}>
              <div className="af-sb-node-head">
                <StatusGlyph status={status} />
                <span className="af-sb-node-id">{n.id || `ST-${i + 1}`}</span>
              </div>
              <div className="af-sb-node-title" title={n.title}>{n.title}</div>
              {n.screenshot && (
                <a href={n.screenshot} target="_blank" rel="noreferrer" className="af-sb-thumb">
                  <img src={n.screenshot} alt="Step Screenshot" loading="lazy" />
                </a>
              )}
            </div>
            {i < finalNodes.length - 1 && (
              <div className="af-sb-connector">
                <div className="af-sb-line" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function normalizeStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'pass' || v === 'passed' || v === 'success') return 'passed';
  if (v === 'fail' || v === 'failed' || v === 'error')   return 'failed';
  if (v === 'running' || v === 'in-progress' || v === 'in_progress') return 'running';
  if (v === 'skipped' || v === 'skip') return 'skipped';
  return 'queued';
}

function statusLabel(s) {
  return { passed: 'Passed', failed: 'Failed', running: 'Running', queued: 'Queued', skipped: 'Skipped' }[s] || s;
}

function StatusGlyph({ status }) {
  if (status === 'passed') {
    return (
      <span className="af-glyph af-glyph--pass" title="Passed">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.2l2.7 2.7L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="af-glyph af-glyph--fail" title="Failed">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className="af-glyph af-glyph--running" title="Running">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'nrv-spin 0.9s linear infinite' }}>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" strokeDasharray="22 12" />
        </svg>
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className="af-glyph af-glyph--skipped" title="Skipped">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="af-glyph af-glyph--queued" title="Queued">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="3.5" cy="7" r="1.2" fill="currentColor" />
        <circle cx="7"   cy="7" r="1.2" fill="currentColor" />
        <circle cx="10.5" cy="7" r="1.2" fill="currentColor" />
      </svg>
    </span>
  );
}

/* ─── Shared sub-components ─────────────────────────────── */
function Awaiting({ msg = 'Awaiting…' }) {
  return <div className="tab-awaiting">{msg}</div>;
}
function Section({ title, children }) {
  return (
    <div className="report-section">
      <div className="report-section-title">{title}</div>
      {children}
    </div>
  );
}
function JsonBlock({ data }) {
  return <pre className="code-block json-block">{JSON.stringify(data, null, 2)}</pre>;
}
function JsonToggle({ data }) {
  return (
    <details className="json-toggle">
      <summary>Raw JSON</summary>
      <pre className="code-block json-block">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
function CodeSection({ title, code }) {
  return (
    <div className="code-section">
      <div className="code-section-title">{title}</div>
      <pre className="code-block">{code}</pre>
    </div>
  );
}
function CollapsibleCodeSection({ title, code }) {
  return (
    <details className="json-toggle">
      <summary>{title}</summary>
      <pre className="code-block">{code}</pre>
    </details>
  );
}
function PriorityBadge({ p }) {
  const cls = p === 'High' || p === 'Critical' ? 'priority-high'
    : p === 'Medium' ? 'priority-med' : 'priority-low';
  return <span className={`priority-badge ${cls}`}>{p}</span>;
}
function VitalCard({ label, value }) {
  return (
    <div className="vital-card">
      <div className="vital-label">{label}</div>
      <div className="vital-value">{value || '—'}</div>
    </div>
  );
}

const DownloadIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M5.5 1v7M3 6l2.5 2.5L8 6M1 9.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

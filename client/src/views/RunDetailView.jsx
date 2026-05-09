import { useState } from 'react';
import PipelineFlow from '../components/PipelineFlow';
import './RunDetailView.css';

/* ─── Tab definitions ─────────────────────────────────────── */
const ALL_TABS = [
  { id: 'requirements', label: 'Requirements' },
  { id: 'manual',       label: 'Manual TC' },
  { id: 'automation',   label: 'Automation' },
  { id: 'execution',    label: 'Execution' },
  { id: 'accessibility',label: 'Accessibility', optional: true },
  { id: 'performance',  label: 'Performance',   optional: true },
  { id: 'manager',      label: 'Manager Report' },
  { id: 'recording',    label: 'Recording',     optional: true },
  { id: 'element-log',  label: 'Element Log' },
  { id: 'flow',         label: 'Flow Diagram',  optional: true },
];

function getVisibleTabs(run) {
  return ALL_TABS.filter(t => {
    if (!t.optional) return true;
    if (t.id === 'accessibility') return !!run?.stages?.accessibility;
    if (t.id === 'performance')   return !!run?.stages?.performance;
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
export default function RunDetailView({ run, runId, onRerunFailed, onBack }) {
  const [activeTab, setActiveTab] = useState('requirements');

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

  /* Compute active stage for the orchestration panel */
  const stages = run?.stages || {};
  const currentStage = Object.entries(stages).find(([, v]) => v?.status === 'running')?.[0];
  const stageLabels = {
    ba: 'BA Agent', manualQa: 'Manual QA', automationQa: 'Automation QA',
    execution: 'Execution Engine', accessibility: 'Accessibility', performance: 'Performance', manager: 'Manager',
  };

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
            onClick={() => window.open(`/api/runs/${runId}/download`, '_blank')}>
            <DownloadIcon /> PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Runs
          </button>
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="rdt-pipeline-panel">
        <div className="rdt-section-label">Pipeline</div>
        <PipelineFlow run={run} />
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

        {/* Live orchestration side panel */}
        {runStatus === 'running' && (
          <div className="rdt-side-panel">
            <div className="rdt-side-label">
              <span className="rdt-side-live-dot" />
              Live Orchestration
            </div>
            {currentStage ? (
              <div className="rdt-stage-active">
                <div className="rdt-stage-active-name">{stageLabels[currentStage] || currentStage}</div>
                <div className="rdt-stage-active-sub">Agent running…</div>
              </div>
            ) : (
              <div className="rdt-stage-active-sub">Initializing…</div>
            )}
            <div className="rdt-side-stages">
              {Object.entries(stages).map(([key, val]) => (
                <div key={key} className={`rdt-side-stage rdt-side-stage--${val?.status || 'pending'}`}>
                  <span className="rdt-side-stage-dot" />
                  <span className="rdt-side-stage-name">{stageLabels[key] || key}</span>
                  <span className="rdt-side-stage-status">{val?.status || 'pending'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
    case 'requirements':  return <RequirementsTab run={run} />;
    case 'manual':        return <ManualTab run={run} />;
    case 'automation':    return <AutomationTab run={run} />;
    case 'execution':     return <ExecutionTab run={run} />;
    case 'accessibility': return <AccessibilityTab run={run} />;
    case 'performance':   return <PerformanceTab run={run} />;
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
      {tests.some(t => t.screenshot) && (
        <div className="screenshot-grid">
          {tests.filter(t => t.screenshot).map(t => (
            <a key={t.id} href={t.screenshot} target="_blank" rel="noreferrer" className="screenshot-thumb">
              <div className="screenshot-thumb-id">{t.id}</div>
              <div className={`screenshot-thumb-status status-${t.status}`}>{t.status}</div>
            </a>
          ))}
        </div>
      )}
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

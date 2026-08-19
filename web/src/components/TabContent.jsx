import { useState } from 'react';
import { apiUrl, artifactUrl } from '../apiBase';
import './TabContent.css';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function TabContent({ run, activeTab, placeholder }) {
  if (activeTab === 'element-log') {
    return <ElementLogPanel />;
  }

  if (!run) {
    return (
      <div className="tab-content-inner">
        <p className="empty">{placeholder}</p>
      </div>
    );
  }

  if (activeTab === 'requirements') {
    const d = run.artifacts?.requirements;
    // Include web analysis insights if available
    const webAnalysis = run.artifacts?.webAnalysis;
    return (
      <div className="tab-content-inner">
        {webAnalysis && webAnalysis.baInsights && (
          <div className="manager-section web-analysis-insights">
            <h3>🔍 Web Analysis Insights</h3>
            <p><strong>Summary:</strong> {webAnalysis.baInsights.summary}</p>
            {webAnalysis.baInsights.keyFunctionalities?.length > 0 && (
              <>
                <h4>Key Functionalities Discovered</h4>
                <ul>
                  {webAnalysis.baInsights.keyFunctionalities.map((f, i) => (
                    <li key={i}><strong>{f.name}</strong> - Priority: {f.priority}</li>
                  ))}
                </ul>
              </>
            )}
            {webAnalysis.baInsights.userJourneys?.length > 0 && (
              <>
                <h4>Suggested User Journeys</h4>
                <ol>
                  {webAnalysis.baInsights.userJourneys.map((j, i) => <li key={i}>{j}</li>)}
                </ol>
              </>
            )}
            {webAnalysis.suggestedRequirements?.length > 0 && (
              <>
                <h4>Auto-Generated Requirements</h4>
                <ul>
                  {webAnalysis.suggestedRequirements.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
        {d ? <pre>{JSON.stringify(d, null, 2)}</pre> : <p className="empty">Awaiting…</p>}
      </div>
    );
  }

  if (activeTab === 'webAnalysis') {
    const data = run.artifacts?.webAnalysis;
    if (!data) return <div className="tab-content-inner"><p className="empty">Web Analyzer not run. It auto-runs when no test document is provided.</p></div>;
    const classification = data.domainClassification || {};
    const domainLabel = classification.domain || data.metadata?.domainName || data.siteOverview?.type || null;
    const subDomainLabel = classification.subDomain || data.metadata?.subDomain || null;
    const analysisFailed = Boolean(data.analysisFailed || data.error);
    return (
      <div className="tab-content-inner">
        {analysisFailed && (
          <div className="manager-section">
            <h3>Analysis Failed</h3>
            <p>{data.error || 'Web analysis could not load the target URL.'}</p>
            <p>No site data was collected, so the domain could not be determined.</p>
          </div>
        )}
        <div className="manager-section">
          <h3>Site Overview</h3>
          <p><strong>Title:</strong> {data.siteOverview?.title || '—'}</p>
          <p><strong>Domain:</strong> {domainLabel || 'Not determined'}</p>
          <p><strong>Sub-domain:</strong> {subDomainLabel || 'Not determined'}</p>
          <p><strong>Pages Discovered:</strong> {data.siteOverview?.pagesDiscovered || 0}</p>
        </div>
        {data.features?.length > 0 && (
          <div className="manager-section">
            <h3>Discovered Features</h3>
            <table className="exec-table">
              <thead><tr><th>Feature</th><th>Type</th><th>Description</th></tr></thead>
              <tbody>
                {data.features.map((f, i) => (
                  <tr key={i}>
                    <td>{f.name}</td>
                    <td>{f.type}</td>
                    <td>{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.discoveredPages?.length > 0 && (
          <div className="manager-section">
            <h3>Discovered Pages</h3>
            <ul>
              {data.discoveredPages.map((p, i) => (
                <li key={i}><strong>{p.linkText}</strong>: {p.title} <a href={p.url} target="_blank" rel="noreferrer">→</a></li>
              ))}
            </ul>
          </div>
        )}
        {data.forms?.length > 0 && (
          <div className="manager-section">
            <h3>Discovered Forms ({data.forms.length})</h3>
            {data.forms.map((form, i) => (
              <div key={i} className="form-analysis">
                <p><strong>Form {i + 1}</strong> · Method: {form.method?.toUpperCase()} · Fields: {form.fields?.length || 0}</p>
                <ul>
                  {form.fields?.map((f, j) => (
                    <li key={j}>{f.name || 'unnamed'} ({f.type}) {f.required && '(required)'}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {data.suggestedTestAreas?.length > 0 && (
          <div className="manager-section">
            <h3>Suggested Test Areas</h3>
            {data.suggestedTestAreas.map((area, i) => (
              <div key={i} className="test-area">
                <h4>{area.area} <span className="priority-badge">{area.priority}</span></h4>
                <ul>
                  {area.tests?.map((t, j) => <li key={j}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        <details className="mt"><summary className="details-summary">Full JSON</summary><pre className="mt">{JSON.stringify(data, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'security') {
    const data = run.artifacts?.securityReport;
    if (!data) return <div className="tab-content-inner"><p className="empty">Security Agent not enabled or awaiting…</p></div>;
    const summary = data.summary || {};
    const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';
    return (
      <div className="tab-content-inner">
        <div className="manager-section">
          <h3>Security Score</h3>
          <p>
            <span className={`score-badge ${scoreClass}`}>{summary.score}/100</span>
            <span className="verdict-text">{summary.verdict || '—'}</span>
          </p>
          <p>{summary.checksRun || 0} checks run · {summary.passed || 0} passed · {summary.failed || 0} failed · {summary.warnings || 0} warnings</p>
        </div>
        {data.securityHeaders && (
          <div className="manager-section">
            <h3>Security Headers</h3>
            <table className="exec-table">
              <thead><tr><th>Header</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>Content-Security-Policy</td><td className={data.securityHeaders.contentSecurityPolicy ? 'status-passed' : 'status-failed'}>{data.securityHeaders.contentSecurityPolicy ? '✓ Present' : '✗ Missing'}</td></tr>
                <tr><td>X-Frame-Options</td><td className={data.securityHeaders.xFrameOptions ? 'status-passed' : 'status-failed'}>{data.securityHeaders.xFrameOptions || '✗ Missing'}</td></tr>
                <tr><td>X-Content-Type-Options</td><td className={data.securityHeaders.xContentTypeOptions ? 'status-passed' : 'status-failed'}>{data.securityHeaders.xContentTypeOptions || '✗ Missing'}</td></tr>
                <tr><td>Strict-Transport-Security</td><td className={data.securityHeaders.strictTransportSecurity ? 'status-passed' : 'status-failed'}>{data.securityHeaders.strictTransportSecurity ? '✓ Present' : '✗ Missing'}</td></tr>
                <tr><td>Referrer-Policy</td><td className={data.securityHeaders.referrerPolicy ? 'status-passed' : 'status-skipped'}>{data.securityHeaders.referrerPolicy || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        )}
        {data.checks?.length > 0 && (
          <div className="manager-section">
            <h3>Security Checks</h3>
            <table className="exec-table">
              <thead><tr><th>Check</th><th>Status</th><th>Severity</th><th>Description</th></tr></thead>
              <tbody>
                {data.checks.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td className={`status-${c.status === 'pass' ? 'passed' : c.status === 'fail' ? 'failed' : 'skipped'}`}>{c.status}</td>
                    <td className={`severity-${c.severity}`}>{c.severity}</td>
                    <td>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.vulnerabilities?.length > 0 && (
          <div className="manager-section vulnerabilities">
            <h3>⚠️ Vulnerabilities Found</h3>
            <ul className="issues-list">
              {data.vulnerabilities.map((v, i) => (
                <li key={i} className={`issue-${v.type}`}>
                  <strong>[{v.type.toUpperCase()}]</strong> {v.name}: {v.description}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.recommendations?.length > 0 && (
          <div className="manager-section">
            <h3>Recommendations</h3>
            <ol>{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
          </div>
        )}
        {data.complianceNotes?.length > 0 && (
          <div className="manager-section">
            <h3>Compliance Notes</h3>
            <ul>{data.complianceNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </div>
        )}
        <details className="mt"><summary className="details-summary">Full JSON</summary><pre className="mt">{JSON.stringify(data, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'manual') {
    const d = run.artifacts?.manualTestCases;
    return (
      <div className="tab-content-inner">
        {d ? <pre>{JSON.stringify(d, null, 2)}</pre> : <p className="empty">Awaiting…</p>}
      </div>
    );
  }

  if (activeTab === 'automation') {
    const d = run.artifacts?.automationBundle;
    if (!d) return <div className="tab-content-inner"><p className="empty">Awaiting…</p></div>;
    const lang = d.metadata?.scriptingLanguage || 'Java';
    const framework = d.metadata?.framework || 'Selenium (Java)';
    const javaScript = d.generatedSeleniumJava;
    const playwrightScript = d.generatedPlaywrightScript;
    return (
      <div className="tab-content-inner">
        <p className="automation-lang">
          <strong>Scripting language:</strong> <span className="lang-badge">{lang}</span>
          {framework && <span className="framework-hint"> · {framework}</span>}
        </p>
        {javaScript && (
          <div className="script-block">
            <h4>Generated Java (Selenium)</h4>
            <pre className="script-pre">{javaScript}</pre>
          </div>
        )}
        {playwrightScript && (
          <details className="script-details">
            <summary>Playwright (runtime) script</summary>
            <pre className="script-pre">{playwrightScript}</pre>
          </details>
        )}
        <details className="raw-json-details"><summary>Raw bundle JSON</summary><pre>{JSON.stringify(d, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'recording') {
    const rec = run.artifacts?.recording || run.input?.recording;
    if (!rec) return <div className="tab-content-inner"><p className="empty">No recording for this run. Use “Record session” in the form to attach one.</p></div>;
    const events = rec.events || [];
    return (
      <div className="tab-content-inner">
        <p><strong>Recording</strong> · {rec.source || 'session'} · {events.length} events · {rec.ottUrl && <a href={rec.ottUrl} target="_blank" rel="noreferrer">OTT URL</a>}</p>
        {events.length > 0 && (
          <details className="mt"><summary>Events ({events.length})</summary><pre className="pre-small">{JSON.stringify(events, null, 2)}</pre></details>
        )}
        <details className="mt"><summary>Full recording JSON</summary><pre>{JSON.stringify(rec, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'execution') {
    const data = run.artifacts?.executionReport;
    if (!data) return <div className="tab-content-inner"><p className="empty">Awaiting…</p></div>;
    const tests = data.tests || [];
    const totals = data.totals || {};
    return (
      <div className="tab-content-inner">
        <p><strong>{totals.total ?? 0}</strong> run · <span className="status-passed">{totals.passed ?? 0} passed</span> · <span className="status-failed">{totals.failed ?? 0} failed</span> · Pass rate: <strong>{totals.passRate ?? '0%'}</strong></p>
        <table className="exec-table">
          <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Error</th><th>Evidence</th></tr></thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{(t.title || '').slice(0, 60)}{(t.title || '').length > 60 ? '…' : ''}</td>
                <td className={`status-${t.status}`}>{t.status}</td>
                <td>{t.error ? String(t.error).slice(0, 80) + (String(t.error).length > 80 ? '…' : '') : '—'}</td>
                <td>{t.screenshot ? <a href={artifactUrl(t.screenshot)} target="_blank" rel="noreferrer">Screenshot</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="shot-grid">
          {tests.filter((t) => t.screenshot).map((t) => (
            <a key={t.id} href={artifactUrl(t.screenshot)} target="_blank" rel="noreferrer">{t.id}</a>
          ))}
        </div>
        <details className="mt"><summary className="details-summary">Raw JSON</summary><pre className="mt">{JSON.stringify(data, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'accessibility') {
    const data = run.artifacts?.accessibilityReport;
    if (!data) return <div className="tab-content-inner"><p className="empty">Accessibility Agent not enabled or awaiting…</p></div>;
    const summary = data.summary || {};
    const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';
    return (
      <div className="tab-content-inner">
        <div className="manager-section">
          <h3>Accessibility Score</h3>
          <p>
            <span className={`score-badge ${scoreClass}`}>{summary.score}/100</span>
            <span className="verdict-text">{summary.verdict || '—'}</span>
          </p>
          <p>{summary.checksRun || 0} checks run · {summary.passed || 0} passed · {summary.errors || 0} errors · {summary.warnings || 0} warnings</p>
        </div>
        {data.checks?.length > 0 && (
          <div className="manager-section">
            <h3>Checks</h3>
            <table className="exec-table">
              <thead><tr><th>Check</th><th>Status</th><th>Count</th></tr></thead>
              <tbody>
                {data.checks.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td className={`status-${c.status === 'pass' ? 'passed' : c.status === 'fail' ? 'failed' : 'skipped'}`}>{c.status}</td>
                    <td>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.issues?.length > 0 && (
          <div className="manager-section">
            <h3>Issues</h3>
            <ul className="issues-list">
              {data.issues.map((issue, i) => (
                <li key={i} className={`issue-${issue.type}`}>
                  <strong>[{issue.category}]</strong> {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.recommendations?.length > 0 && (
          <div className="manager-section">
            <h3>Recommendations</h3>
            <ol>{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
          </div>
        )}
        <details className="mt"><summary className="details-summary">Full JSON</summary><pre className="mt">{JSON.stringify(data, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'performance') {
    const data = run.artifacts?.performanceReport;
    if (!data) return <div className="tab-content-inner"><p className="empty">Performance Agent not enabled or awaiting…</p></div>;
    const summary = data.summary || {};
    const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';
    return (
      <div className="tab-content-inner">
        <div className="manager-section">
          <h3>Performance Score</h3>
          <p>
            <span className={`score-badge ${scoreClass}`}>{summary.score}/100</span>
            <span className="verdict-text">{summary.verdict || '—'}</span>
          </p>
          <p>Load time: <strong>{summary.loadTime}</strong> · Resources: {summary.resourceCount} · Size: {summary.totalSize}</p>
        </div>
        {data.coreWebVitals && (
          <div className="manager-section">
            <h3>Core Web Vitals</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">First Contentful Paint</span>
                <span className="metric-value">{data.coreWebVitals.fcp || '—'}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">DOM Content Loaded</span>
                <span className="metric-value">{data.coreWebVitals.domContentLoaded || '—'}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Load Complete</span>
                <span className="metric-value">{data.coreWebVitals.loadComplete || '—'}</span>
              </div>
            </div>
          </div>
        )}
        {data.metrics?.length > 0 && (
          <div className="manager-section">
            <h3>Metrics</h3>
            <table className="exec-table">
              <thead><tr><th>Metric</th><th>Value</th><th>Score</th></tr></thead>
              <tbody>
                {data.metrics.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td>{m.value}</td>
                    <td className={`score-${m.score}`}>{m.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.issues?.length > 0 && (
          <div className="manager-section">
            <h3>Issues</h3>
            <ul className="issues-list">
              {data.issues.map((issue, i) => (
                <li key={i} className={`issue-${issue.type}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
        {data.recommendations?.length > 0 && (
          <div className="manager-section">
            <h3>Recommendations</h3>
            <ol>{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
          </div>
        )}
        <details className="mt"><summary className="details-summary">Full JSON</summary><pre className="mt">{JSON.stringify(data, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'manager') {
    const data = run.artifacts?.managerReport;
    if (!data) return <div className="tab-content-inner"><p className="empty">Awaiting…</p></div>;
    const es = data.executiveSummary || {};
    const verdictClass = (es.verdict || '').toLowerCase() === 'go' ? 'go' : (es.verdict || '').toLowerCase() === 'conditional go' ? 'conditional' : 'hold';
    return (
      <div className="tab-content-inner">
        <div className="manager-section">
          <h3>Verdict</h3>
          <p><span className={`verdict ${verdictClass}`}>{es.verdict || '—'}</span> · Risk: {es.riskLevel || '—'} · Pass rate: <strong>{es.passRate || '0%'}</strong></p>
          <p>Executed {es.executed ?? 0} of {es.totalTestCases ?? 0} test cases · {es.passed ?? 0} passed, {es.failed ?? 0} failed, {es.skipped ?? 0} skipped.</p>
        </div>
        {data.traceabilityMatrix?.length > 0 && (
          <div className="manager-section">
            <h3>Traceability</h3>
            <table className="exec-table">
              <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Error</th></tr></thead>
              <tbody>
                {data.traceabilityMatrix.slice(0, 30).map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{(t.title || '').slice(0, 50)}</td>
                    <td className={`status-${t.status}`}>{t.status}</td>
                    <td>{t.error ? String(t.error).slice(0, 60) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.analysis?.rootCauses?.length > 0 && (
          <div className="manager-section">
            <h3>Root causes</h3>
            <ul>{data.analysis.rootCauses.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}
        {data.actionPlan?.length > 0 && (
          <div className="manager-section">
            <h3>Action plan</h3>
            <ol>{data.actionPlan.map((a, i) => <li key={i}>{a}</li>)}</ol>
          </div>
        )}
        {data.signOff && (
          <div className="manager-section">
            <h3>Sign-off</h3>
            <p>{data.signOff.recommendation}</p>
          </div>
        )}
        <details className="mt"><summary className="details-summary">Full JSON</summary><pre className="mt">{JSON.stringify(data, null, 2)}</pre></details>
      </div>
    );
  }

  if (activeTab === 'picture') {
    return (
      <div className="tab-content-inner">
        {run.picture ? <div className="svg-wrap" dangerouslySetInnerHTML={{ __html: run.picture }} /> : <p className="empty">Awaiting…</p>}
      </div>
    );
  }

  return <div className="tab-content-inner"><p className="empty">{placeholder}</p></div>;
}

function ElementLogPanel() {
  const [url, setUrl] = useState('');
  const [json, setJson] = useState('');
  const [result, setResult] = useState('');
  const [host, setHost] = useState('');
  const [locators, setLocators] = useState('');

  const submitLog = async () => {
    if (!url.trim()) { setResult('Enter page URL.'); return; }
    let payload;
    try {
      payload = JSON.parse(json || '{}');
    } catch {
      setResult('Invalid JSON.');
      return;
    }
    payload.url = payload.url || url;
    if (!payload.elements && !(payload.snapshot?.elements)) {
      setResult("JSON must contain 'elements' array.");
      return;
    }
    setResult('Submitting…');
    try {
      const res = await fetch(apiUrl('/element-log'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      setResult(res.ok ? `Saved. Host: ${data.host}, count: ${data.count}` : (data.error || 'Failed'));
    } catch (e) {
      setResult('Error: ' + e.message);
    }
  };

  const loadLocators = async () => {
    if (!host.trim()) { setLocators('Enter host.'); return; }
    try {
      const res = await fetch(apiUrl(`/locators?host=${encodeURIComponent(host)}`));
      const data = await res.json();
      setLocators(JSON.stringify(data, null, 2));
    } catch (e) {
      setLocators('Error: ' + e.message);
    }
  };

  return (
    <div className="tab-content-inner tab-element-log">
      <p className="hint">Feed element logs for locator reuse (Postgres required).</p>
      <label className="field"><span className="field-label">Page URL</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></label>
      <label className="field"><span className="field-label">Element log JSON</span><textarea value={json} onChange={(e) => setJson(e.target.value)} rows={8} placeholder='{"url":"...", "elements":[{"key":"playCta","selector":"button.play"}]}' /></label>
      <button type="button" className="btn btn-secondary" onClick={submitLog}>Submit</button>
      <div className="mt">{result}</div>
      <hr className="mt" />
      <label className="field"><span className="field-label">Load locators for host</span><input value={host} onChange={(e) => setHost(e.target.value)} placeholder="app.example.com" /></label>
      <button type="button" className="btn btn-secondary" onClick={loadLocators}>Load</button>
      {locators && <pre className="mt pre-small">{locators}</pre>}
    </div>
  );
}

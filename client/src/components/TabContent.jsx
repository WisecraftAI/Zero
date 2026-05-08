import { useState } from 'react';
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
    return (
      <div className="tab-content-inner">
        {d ? <pre>{JSON.stringify(d, null, 2)}</pre> : <p className="empty">Awaiting…</p>}
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
                <td>{t.screenshot ? <a href={t.screenshot} target="_blank" rel="noreferrer">Screenshot</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="shot-grid">
          {tests.filter((t) => t.screenshot).map((t) => (
            <a key={t.id} href={t.screenshot} target="_blank" rel="noreferrer">{t.id}</a>
          ))}
        </div>
        <details className="mt"><summary className="details-summary">Raw JSON</summary><pre className="mt">{JSON.stringify(data, null, 2)}</pre></details>
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
      const res = await fetch('/api/element-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      setResult(res.ok ? `Saved. Host: ${data.host}, count: ${data.count}` : (data.error || 'Failed'));
    } catch (e) {
      setResult('Error: ' + e.message);
    }
  };

  const loadLocators = async () => {
    if (!host.trim()) { setLocators('Enter host.'); return; }
    try {
      const res = await fetch(`/api/locators?host=${encodeURIComponent(host)}`);
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

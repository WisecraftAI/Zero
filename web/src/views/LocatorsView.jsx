import { useState } from 'react';
import { apiUrl } from '../apiBase';
import './LocatorsView.scss';

export default function LocatorsView() {
  const [logUrl, setLogUrl] = useState('');
  const [logJson, setLogJson] = useState('');
  const [logResult, setLogResult] = useState(null);
  const [logSubmitting, setLogSubmitting] = useState(false);

  const [queryHost, setQueryHost] = useState('');
  const [locators, setLocators] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const submitLog = async () => {
    if (!logUrl.trim()) { setLogResult({ error: 'Enter a page URL.' }); return; }
    let payload;
    try { payload = JSON.parse(logJson || '{}'); } catch {
      setLogResult({ error: 'Invalid JSON in element log.' }); return;
    }
    payload.url = payload.url || logUrl;
    if (!payload.elements && !payload.snapshot?.elements) {
      setLogResult({ error: "JSON must contain an 'elements' array." }); return;
    }
    setLogSubmitting(true);
    setLogResult(null);
    try {
      const res = await fetch(apiUrl('/element-log'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setLogResult(res.ok
        ? { ok: `Saved — host: ${data.host}, selectors stored: ${data.count}` }
        : { error: data.error || 'Failed to save.' });
    } catch (e) {
      setLogResult({ error: e.message });
    } finally { setLogSubmitting(false); }
  };

  const loadLocators = async () => {
    if (!queryHost.trim()) { setLocators({ error: 'Enter a host.' }); return; }
    setQueryLoading(true);
    setLocators(null);
    try {
      const res = await fetch(apiUrl(`/locators?host=${encodeURIComponent(queryHost)}`));
      const data = await res.json();
      setLocators(data);
    } catch (e) {
      setLocators({ error: e.message });
    } finally { setQueryLoading(false); }
  };

  return (
    <div className="view locators-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Locator Intelligence</h1>
          <p className="view-subtitle">Persistent selector registry — feeds automation generation across runs</p>
        </div>
      </div>

      <div className="locators-grid">

        {/* Submit element log */}
        <div className="locator-panel card">
          <div className="locator-panel-head">
            <PanelIcon type="submit" />
            <div>
              <div className="locator-panel-title">Submit Element Log</div>
              <div className="locator-panel-desc">Feed DOM element snapshots to improve future automation scripts</div>
            </div>
          </div>
          <div className="locator-panel-body">
            <div className="lfield">
              <label className="lfield-label">Page URL</label>
              <input
                className="lfield-input"
                value={logUrl}
                onChange={e => setLogUrl(e.target.value)}
                placeholder="https://example.com/watch"
              />
            </div>
            <div className="lfield">
              <label className="lfield-label">Element Log JSON</label>
              <textarea
                className="lfield-textarea"
                value={logJson}
                onChange={e => setLogJson(e.target.value)}
                rows={7}
                placeholder={'{\n  "url": "https://...",\n  "elements": [\n    {"key": "playCta", "selector": "button.play"}\n  ]\n}'}
              />
              <span className="lfield-hint">JSON with an <code>elements</code> array of <code>{'{key, selector}'}</code> objects.</span>
            </div>
            {logResult && (
              <div className={`log-result ${logResult.ok ? 'log-result--ok' : 'log-result--err'}`}>
                {logResult.ok || logResult.error}
              </div>
            )}
            <button className="btn btn-primary" onClick={submitLog} disabled={logSubmitting}>
              {logSubmitting ? 'Submitting…' : 'Submit Log'}
            </button>
          </div>
        </div>

        {/* Query locators */}
        <div className="locator-panel card">
          <div className="locator-panel-head">
            <PanelIcon type="query" />
            <div>
              <div className="locator-panel-title">Query Locators</div>
              <div className="locator-panel-desc">Look up stored selectors for a host — reused in automation generation</div>
            </div>
          </div>
          <div className="locator-panel-body">
            <div className="lfield">
              <label className="lfield-label">Host</label>
              <div className="lfield-row">
                <input
                  className="lfield-input"
                  value={queryHost}
                  onChange={e => setQueryHost(e.target.value)}
                  placeholder="app.example.com"
                  onKeyDown={e => e.key === 'Enter' && loadLocators()}
                />
                <button className="btn btn-secondary" onClick={loadLocators} disabled={queryLoading}>
                  {queryLoading ? '…' : 'Load'}
                </button>
              </div>
            </div>
            {locators !== null && (
              locators.error
                ? <div className="log-result log-result--err">{locators.error}</div>
                : <LocatorTable data={locators} />
            )}
          </div>
        </div>

      </div>

      {/* Info */}
      <div className="locator-info card card-padded">
        <div className="locator-info-icon"><InfoIcon /></div>
        <div>
          <div className="locator-info-title">How Locator Memory Works</div>
          <p className="locator-info-body">
            When you submit element logs, ZERO stores CSS selectors per host in PostgreSQL.
            During automation generation, these stored selectors are merged with profile defaults
            and learned execution selectors — giving you smarter, battle-tested automation over time.
          </p>
        </div>
      </div>
    </div>
  );
}

function LocatorTable({ data }) {
  const entries = Array.isArray(data)
    ? data
    : data.locators || Object.entries(data).map(([k, v]) => ({ key: k, selector: v }));
  if (!entries?.length) return <p className="empty-msg">No locators stored for this host yet.</p>;
  return (
    <table className="data-table loc-table">
      <thead><tr><th>Key</th><th>Selector</th></tr></thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i}>
            <td><code className="loc-key">{e.key || e.name || '—'}</code></td>
            <td><code className="loc-selector">{e.selector || e.value || '—'}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PanelIcon({ type }) {
  if (type === 'submit') return (
    <div className="panel-icon-wrap">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v9M4 8l4-4 4 4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
  return (
    <div className="panel-icon-wrap">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5M10 6v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

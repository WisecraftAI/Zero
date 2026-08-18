import { useState } from 'react';
import { apiUrl } from '../apiBase';
import './CmsScreenshotCapture.css';

export default function CmsScreenshotCapture() {
  const [url, setUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [station, setStation] = useState('');
  const [waitSec, setWaitSec] = useState(8);
  const [showBrowser, setShowBrowser] = useState(false);
  const [streamTab, setStreamTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [note, setNote] = useState(null);

  const captureOne = async () => {
    setError(null);
    setNote(null);
    setScreenshot(null);
    setBulkResults(null);
    if (!url.trim()) {
      setError('Paste one CMS URL or use bulk below.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/capture-cms-screenshot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          stationLabel: station.trim() || undefined,
          waitMs: Math.round(Number(waitSec) || 8) * 1000,
          fullPage: true,
          showBrowser,
          streamTab
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Capture failed');
      setScreenshot(data.screenshot);
      setNote(data.note || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const captureBulk = async () => {
    setError(null);
    setNote(null);
    setScreenshot(null);
    setBulkResults(null);
    const lines = bulkUrls.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) {
      setError('Paste one URL per line — each station’s CMS playout URL.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/capture-cms-signal-bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: bulkUrls,
          waitMs: Math.round(Number(waitSec) || 8) * 1000,
          showBrowser,
          streamTab
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk capture failed');
      setBulkResults(data.results || []);
      setNote(data.note || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card cms-capture-card">
      <h2 className="card-title">CMS signal screenshot (Stream tab)</h2>
      <p className="card-desc">
        Captures the <strong>Stream</strong> view (signal / preview), <strong>not Playout</strong>, per Gray LiveOps URL.
        For <strong>all stations</strong>, paste one URL per line and run bulk capture (same browser session — log in once if needed).
      </p>
      <div className="cms-capture-form">
        <label className="checkbox-label cms-checkbox">
          <input type="checkbox" checked={streamTab} onChange={(e) => setStreamTab(e.target.checked)} />
          <span>Use Stream tab (signal) — turn off only if you want Playout/current tab</span>
        </label>
        <div className="cms-capture-row">
          <label className="field">
            <span className="field-label">Wait after Stream loads (seconds)</span>
            <input type="number" min={3} max={45} value={waitSec} onChange={(e) => setWaitSec(e.target.value)} />
          </label>
        </div>
        <label className="checkbox-label cms-checkbox">
          <input type="checkbox" checked={showBrowser} onChange={(e) => setShowBrowser(e.target.checked)} />
          <span>Show browser (bulk: log in on first station, then all URLs reuse session)</span>
        </label>

        <h3 className="cms-subtitle">All stations — one URL per line</h3>
        <label className="field full">
          <span className="field-label">Station playout URLs (each line = one station)</span>
          <textarea
            className="cms-bulk-textarea"
            rows={6}
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            placeholder={'https://console.api.graycms.quickplay.com/services/gm/STATION1/.../liveops/playout/...\nhttps://console.api.graycms.quickplay.com/services/gm/STATION2/.../liveops/playout/...'}
          />
        </label>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={captureBulk}>
          {loading ? 'Capturing all…' : 'Capture signal (Stream) for all stations'}
        </button>

        <h3 className="cms-subtitle">Single URL (optional)</h3>
        <label className="field full">
          <span className="field-label">One CMS URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://console.api.graycms.quickplay.com/services/gm/wnem/.../liveops/playout/..."
          />
        </label>
        <div className="cms-capture-row">
          <label className="field">
            <span className="field-label">Filename label (single only)</span>
            <input value={station} onChange={(e) => setStation(e.target.value)} placeholder="Auto from URL if empty" />
          </label>
        </div>
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={captureOne}>
          Capture single
        </button>

        {error && <p className="cms-error">{error}</p>}
        {note && <p className="cms-note">{note}</p>}

        {screenshot && (
          <div className="cms-result">
            <a href={screenshot} target="_blank" rel="noreferrer" className="cms-open-link">
              Open full image
            </a>
            <img src={screenshot} alt="CMS signal" className="cms-preview" />
          </div>
        )}

        {bulkResults && bulkResults.length > 0 && (
          <div className="cms-bulk-results">
            <h4 className="cms-subtitle">Results ({bulkResults.length})</h4>
            <div className="cms-bulk-grid">
              {bulkResults.map((r, i) => (
                <div key={i} className="cms-bulk-item">
                  <strong>{r.station || `row-${i}`}</strong>
                  {r.ok ? (
                    <>
                      <a href={r.screenshot} target="_blank" rel="noreferrer">
                        Open
                      </a>
                      <img src={r.screenshot} alt={r.station} className="cms-preview cms-thumb" />
                    </>
                  ) : (
                    <span className="cms-error">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

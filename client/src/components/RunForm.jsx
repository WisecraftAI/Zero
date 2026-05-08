import { useRef, useState, useEffect } from 'react';
import './RunForm.css';

export default function RunForm({ onSubmit, onRerunFailed, onDownload, runId, run, hasFailures, canDownload }) {
  const formRef = useRef(null);
  const [recordingSessionId, setRecordingSessionId] = useState(null);
  const [recordingId, setRecordingId] = useState(null);

  useEffect(() => {
    const onMessage = (e) => {
      if (e.data?.type === 'recording-saved' && e.data.recordingId) {
        setRecordingId(e.data.recordingId);
        setRecordingSessionId(null);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleStartRecording = async () => {
    const form = formRef.current;
    const ottUrl = form?.ottUrl?.value?.trim();
    if (!ottUrl) return;
    try {
      const res = await fetch('/api/recordings/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ottUrl })
      });
      const data = await res.json();
      if (data.sessionId) {
        setRecordingSessionId(data.sessionId);
        setRecordingId(null);
        const url = `/record?sessionId=${encodeURIComponent(data.sessionId)}&ottUrl=${encodeURIComponent(ottUrl)}`;
        window.open(url, 'record', 'width=520,height=520');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const ottUrl = form.ottUrl?.value?.trim();
    const notes = form.notes?.value?.trim();
    const file = form.tcFile?.files?.[0];
    if (!ottUrl) return;
    if (!file && !notes) return;
    const fd = new FormData(form);
    fd.set('figmaUrl', '');
    if (recordingId) fd.set('recordingId', recordingId);
    else if (recordingSessionId) fd.set('recordingSessionId', recordingSessionId);
    const recFile = form.recordingFile?.files?.[0];
    if (recFile) fd.set('recordingFile', recFile);
    await onSubmit(fd);
  };

  return (
    <form ref={formRef} className="form" onSubmit={handleSubmit} encType="multipart/form-data">
      <div className="form-row">
        <label className="field full">
          <span className="field-label">OTT URL <em>required</em></span>
          <input name="ottUrl" type="url" placeholder="https://your-ott-app.com" required />
        </label>
      </div>
      <div className="form-row two">
        <label className="field">
          <span className="field-label">Test cases CSV <em>required</em></span>
          <input name="tcFile" type="file" accept=".csv,.xlsx,.xls" />
          <span className="field-hint">Feature, Scenario, Expected Result</span>
        </label>
        <label className="field">
          <span className="field-label">Channel profile</span>
          <select name="channelProfile">
            <option value="">Auto from URL</option>
            <option value="gray">Gray OTT</option>
            <option value="tvnz">TVNZ+</option>
            <option value="aha">Aha OTT</option>
            <option value="hotstar">Hotstar-like</option>
            <option value="primevideo">PrimeVideo-like</option>
            <option value="default">Generic OTT</option>
          </select>
        </label>
      </div>
      <div className="form-row two">
        <label className="field">
          <span className="field-label">Assertions (one per line)</span>
          <textarea
            name="assertions"
            rows={4}
            placeholder={"text:Sign in\ntext:Continue Watching\nselector:[data-testid='play']\nselector:button.primary"}
          />
          <span className="field-hint">
            Use <strong>text:</strong> for visible text. Use <strong>selector:</strong> for CSS or XPath. Each line = one check on the landing page.
          </span>
        </label>
        <label className="field">
          <span className="field-label">Login (optional)</span>
          <div className="field-inputs">
            <input name="loginUsername" type="text" placeholder="Email" autoComplete="off" />
            <input name="loginPassword" type="password" placeholder="Password" autoComplete="off" />
          </div>
        </label>
      </div>
      <div className="form-row">
        <label className="field full">
          <span className="field-label">Notes (optional)</span>
          <textarea name="notes" rows={2} placeholder="Release context, blockers…" />
        </label>
      </div>
      <div className="form-row">
        <label className="field full checkbox-field">
          <label className="checkbox-label">
            <input name="runHeaded" type="checkbox" value="true" />
            <span>Show browser (run in front of me so I can validate)</span>
          </label>
          <span className="field-hint">A browser window will open on your machine so you can watch navigation and validate each step.</span>
        </label>
      </div>
      <div className="form-row record-section">
        <div className="field full">
          <span className="field-label">Record session (optional)</span>
          <p className="field-hint">Recording your flow improves requirements and locators. Upload a recording JSON or record in the browser.</p>
          <div className="record-actions">
            <input name="recordingFile" type="file" accept=".json" className="record-file" />
            <button type="button" className="btn btn-secondary" onClick={handleStartRecording}>Start recording</button>
            {(recordingSessionId || recordingId) && (
              <span className="recording-status">
                {recordingId ? `Recording saved (${recordingId.slice(0, 20)}…)` : 'Recording in progress…'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Run pipeline & execute</button>
        <span className="form-actions-hint">Tests run automatically; see <strong>Execution</strong> tab for results.</span>
        <button type="button" className="btn btn-secondary" disabled={!runId || !hasFailures} onClick={onRerunFailed}>Re-run failed</button>
        <button type="button" className="btn btn-secondary" disabled={!canDownload} onClick={onDownload}>Download PDF</button>
      </div>
    </form>
  );
}

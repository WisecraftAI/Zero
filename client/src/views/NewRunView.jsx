import { useState, useRef, useEffect } from 'react';
import './NewRunView.css';

const STEPS = [
  { id: 'input',     label: 'Input Sources' },
  { id: 'assets',    label: 'Test Assets' },
  { id: 'creds',     label: 'Credentials' },
  { id: 'options',   label: 'Execution Options' },
  { id: 'recording', label: 'Recording' },
];

export default function NewRunView({ onSubmit }) {
  const formRef = useRef(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recordingSessionId, setRecordingSessionId] = useState(null);
  const [recordingId, setRecordingId] = useState(null);
  const [ottUrl, setOttUrl] = useState('');
  const [hasFile, setHasFile]   = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [runHeaded, setRunHeaded] = useState(false);
  const [enableAccessibility, setEnableAccessibility] = useState(false);
  const [enablePerformance, setEnablePerformance] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'recording-saved' && e.data.recordingId) {
        setRecordingId(e.data.recordingId);
        setRecordingSessionId(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleStartRecording = async () => {
    const url = ottUrl.trim();
    if (!url) { setError('Enter a target URL before recording.'); return; }
    setError('');
    try {
      const res = await fetch('/api/recordings/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ottUrl: url }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setRecordingSessionId(data.sessionId);
        setRecordingId(null);
        window.open(
          `/record?sessionId=${encodeURIComponent(data.sessionId)}&ottUrl=${encodeURIComponent(url)}`,
          'record',
          'width=520,height=520',
        );
      }
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const url = ottUrl.trim();
    if (!url) { setError('Target URL is required.'); setStep(0); return; }
    const file  = form.tcFile?.files?.[0];
    const notes = form.notes?.value?.trim();
    if (!file && !notes) { setError('Provide test cases (CSV) or release notes.'); return; }

    setError('');
    setSubmitting(true);
    const fd = new FormData(form);
    fd.set('figmaUrl', '');
    if (recordingId) fd.set('recordingId', recordingId);
    else if (recordingSessionId) fd.set('recordingSessionId', recordingSessionId);
    const recFile = form.recordingFile?.files?.[0];
    if (recFile) fd.set('recordingFile', recFile);

    try {
      await onSubmit(fd);
    } catch (err) {
      setError(err.message || 'Failed to start pipeline.');
      setSubmitting(false);
    }
  };

  return (
    <div className="view new-run-view">

      {/* Step progress header */}
      <div className="nrv-steps">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`nrv-step${i === step ? ' nrv-step--active' : ''}${i < step ? ' nrv-step--done' : ''}`}
            onClick={() => { setError(''); setStep(i); }}
            type="button"
          >
            <span className="nrv-step-num">
              {i < step ? <CheckIcon /> : String(i + 1).padStart(2, '0')}
            </span>
            <span className="nrv-step-label">{s.label}</span>
          </button>
        ))}
      </div>

      <form ref={formRef} className="nrv-body" onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="nrv-content">

          {/* Step 0 — Input Sources */}
          <div style={{ display: step === 0 ? 'block' : 'none' }}>
            <StepPanel title="Input Sources" eyebrow="Step 01 / 05" desc="Enter the target URL for QA execution">
              <Field label="Target URL" hint="Required" required>
                <div className="nrv-url-row">
                  <input
                    name="ottUrl"
                    type="url"
                    placeholder="https://example.com"
                    required
                    className="form-input"
                    value={ottUrl}
                    onChange={e => { setOttUrl(e.target.value); if (error) setError(''); }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary nrv-verify-btn"
                    disabled={!ottUrl.trim()}
                    onClick={() => window.open(ottUrl, '_blank')}
                  >
                    Verify ↗
                  </button>
                </div>
              </Field>
              <Field label="Channel Profile" hint="Auto-detected from URL if left blank">
                <select name="channelProfile" className="form-input">
                  <option value="">Auto from URL</option>
                  <option value="gray">Gray OTT</option>
                  <option value="tvnz">TVNZ+</option>
                  <option value="aha">Aha OTT</option>
                  <option value="hotstar">Hotstar-like</option>
                  <option value="primevideo">PrimeVideo-like</option>
                  <option value="default">Generic OTT</option>
                </select>
              </Field>

              <div className="nrv-ai-panel">
                <div className="nrv-ai-label">
                  <AIIcon /> AI Understanding
                </div>
                <div className="nrv-ai-line">
                  <span className="nrv-ai-key">Type</span>
                  <span className="nrv-ai-val">{ottUrl ? 'OTT Streaming Platform' : '—'}</span>
                </div>
                <div className="nrv-ai-line">
                  <span className="nrv-ai-key">URL</span>
                  <span className="nrv-ai-val nrv-ai-url">{ottUrl || 'Not set'}</span>
                </div>
                <div className="nrv-ai-line">
                  <span className="nrv-ai-key">Agents</span>
                  <span className="nrv-ai-val">BA → Manual QA → Automation → Execution → Manager</span>
                </div>
              </div>
            </StepPanel>
          </div>

          {/* Step 1 — Test Assets */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <StepPanel title="Test Assets" eyebrow="Step 02 / 05" desc="Provide test cases or context for the AI agents">
              <Field label="Test Cases CSV" hint="Columns: Feature, Scenario, Expected Result">
                <div className="file-drop-zone">
                  <input name="tcFile" type="file" accept=".csv,.xlsx,.xls" className="file-input" id="tcFile"
                    onChange={e => setHasFile(!!e.target.files?.[0])} />
                  <label htmlFor="tcFile" className={`file-drop-label${hasFile ? ' file-drop-label--filled' : ''}`}>
                    {hasFile ? <><CheckIcon /> File selected</> : <><UploadIcon /> Drop CSV / Excel here or click to browse</>}
                  </label>
                </div>
              </Field>

              <Field label="Assertions" hint="One per line — text:Sign In  or  selector:[data-testid='play']">
                <textarea
                  name="assertions"
                  className="form-textarea"
                  rows={4}
                  placeholder={"text:Sign in\ntext:Continue Watching\nselector:[data-testid='play']\nselector:button.primary"}
                />
              </Field>

              <Field label="Release Notes / Context" hint="Optional — helps the BA Agent scope the run">
                <textarea
                  name="notes"
                  className="form-textarea"
                  rows={3}
                  placeholder="Release context, known blockers, scope…"
                  onChange={e => setHasNotes(!!e.target.value.trim())}
                />
              </Field>
            </StepPanel>
          </div>

          {/* Step 2 — Credentials */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <StepPanel title="Credentials" eyebrow="Step 03 / 05" desc="Used at runtime only — never persisted">
              <div className="nrv-2col">
                <Field label="Email / Username">
                  <input name="loginUsername" type="text" className="form-input" placeholder="user@example.com" autoComplete="off" />
                </Field>
                <Field label="Password">
                  <input name="loginPassword" type="password" className="form-input" placeholder="••••••••" autoComplete="off" />
                </Field>
              </div>
              <div className="nrv-creds-note">
                <LockIcon />
                Credentials are passed directly to the test runner and are never stored.
              </div>
            </StepPanel>
          </div>

          {/* Step 3 — Execution Options */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            <StepPanel title="Execution Options" eyebrow="Step 04 / 05" desc="Configure how the pipeline runs">
              <CheckOption
                name="runHeaded"
                value="true"
                checked={runHeaded}
                onChange={setRunHeaded}
                label="Show browser"
                desc="Opens a visible browser window so you can watch execution live"
              />

              <div className="nrv-divider">
                <span>Optional Agents</span>
              </div>

              <CheckOption
                name="enableAccessibility"
                value="true"
                checked={enableAccessibility}
                onChange={setEnableAccessibility}
                label="Accessibility Agent"
                badge="WCAG"
                desc="WCAG checks, color contrast, alt text, ARIA labels"
              />
              <CheckOption
                name="enablePerformance"
                value="true"
                checked={enablePerformance}
                onChange={setEnablePerformance}
                label="Performance Agent"
                badge="CWV"
                desc="Core Web Vitals, load time, resource analysis"
              />
            </StepPanel>
          </div>

          {/* Step 4 — Recording */}
          <div style={{ display: step === 4 ? 'block' : 'none' }}>
            <StepPanel title="Session Recording" eyebrow="Step 05 / 05" desc="Improve locator quality by recording your flow">
              <div className="nrv-recording-row">
                <div className="file-drop-zone">
                  <input name="recordingFile" type="file" accept=".json" className="file-input" id="recFile" />
                  <label htmlFor="recFile" className="file-drop-label">
                    <UploadIcon /> Upload recording JSON
                  </label>
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleStartRecording}>
                  <RecordIcon /> Record in browser
                </button>
              </div>
              {(recordingSessionId || recordingId) && (
                <div className={`nrv-rec-status${recordingId ? ' nrv-rec-status--saved' : ' nrv-rec-status--live'}`}>
                  {recordingId
                    ? `Recording saved — ${recordingId.slice(0, 20)}…`
                    : 'Recording in progress…'}
                </div>
              )}
            </StepPanel>
          </div>

        </div>

        {/* Bottom nav */}
        <div className="nrv-footer">
          <div className="nrv-footer-left">
            {error && <div className="nrv-error">{error}</div>}
          </div>
          <div className="nrv-footer-right">
            {step > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => { setError(''); setStep(s => s - 1); }}>
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => { setError(''); setStep(s => s + 1); }}>
                Next →
              </button>
            ) : (
              <button type="submit" className="btn btn-primary btn-launch" disabled={submitting}>
                {submitting ? <><SpinIcon /> Starting pipeline…</> : <><RocketIcon /> Launch Pipeline</>}
              </button>
            )}
          </div>
        </div>
      </form>

    </div>
  );
}

function StepPanel({ eyebrow, title, desc, children }) {
  return (
    <div className="nrv-step-panel">
      <div className="nrv-step-panel-header">
        <span className="nrv-step-eyebrow">{eyebrow}</span>
        <h2 className="nrv-step-title">{title}</h2>
        <p className="nrv-step-desc">{desc}</p>
      </div>
      <div className="nrv-step-panel-body">{children}</div>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label">
          {label}
          {required && <span className="field-required">required</span>}
        </label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CheckOption({ name, value, label, desc, badge, checked, onChange }) {
  return (
    <label className="check-option">
      <input
        type="checkbox"
        name={name}
        value={value}
        className="check-option-input"
        checked={checked}
        onChange={e => onChange?.(e.target.checked)}
      />
      <div className="check-option-box" />
      <div className="check-option-body">
        <span className="check-option-label">
          {label}
          {badge && <span className="check-option-badge">{badge}</span>}
        </span>
        <span className="check-option-desc">{desc}</span>
      </div>
    </label>
  );
}

/* Icons */
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M2 5.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v8M4 5l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const RecordIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="6.5" cy="6.5" r="2.5" fill="currentColor" />
  </svg>
);
const RocketIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 1.5C6.5 1.5 10 2.5 10 6c0 2-1 3.5-1 3.5H4S3 8 3 6C3 2.5 6.5 1.5 6.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M5 9.5L4 12M8 9.5L9 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="6.5" cy="6" r="1" fill="currentColor" />
  </svg>
);
const SpinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'nrv-spin 0.8s linear infinite' }}>
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.8" strokeDasharray="20 12" />
  </svg>
);
const AIIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 6l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="2" y="5.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

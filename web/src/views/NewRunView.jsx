import { useState, useRef, useEffect, useMemo } from 'react';
import { apiUrl, API_BASE } from '../apiBase';
import { detectWebsiteTypeFromUrl, normalizeTargetUrl } from '../lib/websiteTypeHint';
import './NewRunView.css';

// Initial manual test case template
const emptyTestCase = () => ({ id: Date.now(), feature: '', scenario: '', expectedResult: '' });

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
  
  // Test case input mode: 'auto' | 'csv' | 'manual'
  const [testCaseMode, setTestCaseMode] = useState('auto');
  const [manualTestCases, setManualTestCases] = useState([emptyTestCase()]);

  // Manual test case handlers
  const addManualTestCase = () => {
    setManualTestCases(prev => [...prev, emptyTestCase()]);
  };
  const removeManualTestCase = (id) => {
    setManualTestCases(prev => prev.filter(tc => tc.id !== id));
  };
  const updateManualTestCase = (id, field, value) => {
    setManualTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  // Detect website type dynamically
  const websiteType = useMemo(() => detectWebsiteTypeFromUrl(ottUrl), [ottUrl]);

  useEffect(() => {
    console.log('[NewRunView] MOUNTED');
    const handler = (e) => {
      if (e.data?.type === 'recording-saved' && e.data.recordingId) {
        setRecordingId(e.data.recordingId);
        setRecordingSessionId(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  });

  const handleStartRecording = async () => {
    const url = ottUrl.trim();
    if (!url) { setError('Enter a target URL before recording.'); return; }
    setError('');
    try {
      const res = await fetch(apiUrl('/recordings/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ottUrl: url }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setRecordingSessionId(data.sessionId);
        setRecordingId(null);
        window.open(
          `${API_BASE}/record?sessionId=${encodeURIComponent(data.sessionId)}&ottUrl=${encodeURIComponent(url)}`,
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

    const url = normalizeTargetUrl(form.ottUrl?.value);
    if (!url) { setError('Target URL is required.'); return; }
    
    const file  = form.tcFile?.files?.[0];
    const notes = form.notes?.value?.trim();
    
    // Validate based on test case mode
    if (testCaseMode === 'csv' && !file) {
      setError('Please upload a CSV file or switch to another mode.');
      return;
    }
    if (testCaseMode === 'manual') {
      const validCases = manualTestCases.filter(tc => tc.feature.trim() || tc.scenario.trim());
      if (validCases.length === 0) {
        setError('Please add at least one test case or switch to another mode.');
        return;
      }
    }
    if (testCaseMode === 'auto' && !notes && !url) {
      setError('Provide a target URL for auto-generation.');
      return;
    }

    setError('');
    setSubmitting(true);
    const fd = new FormData(form);
    fd.set('ottUrl', url);
    fd.set('figmaUrl', '');
    fd.set('testCaseInputMode', testCaseMode);
    
    // Add manual test cases if in manual mode
    if (testCaseMode === 'manual') {
      const validCases = manualTestCases.filter(tc => tc.feature.trim() || tc.scenario.trim());
      fd.set('manualTestCases', JSON.stringify(validCases));
    }
    
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
            onClick={() => setStep(i)}
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
            <StepPanel title="Target website" eyebrow="Step 01 / 05" desc="Any public HTTPS URL — e-commerce, OTT, corporate, SaaS, etc. Domain type is detected during the Web Analyzer crawl.">
              <Field label="Website URL" hint="Required · https:// added automatically if omitted" required>
                <div className="nrv-url-row">
                  <input
                    name="ottUrl"
                    type="text"
                    inputMode="url"
                    placeholder="https://example.com or example.com"
                    required
                    className="form-input"
                    value={ottUrl}
                    onChange={e => setOttUrl(e.target.value)}
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
              <Field label="OTT channel override" hint="Optional — leave Auto for non-streaming sites">
                <select name="channelProfile" className="form-input">
                  <option value="">Auto-detect domain (recommended)</option>
                  <option value="default">Generic OTT</option>
                  <option value="gray">Gray OTT</option>
                  <option value="tvnz">TVNZ+</option>
                  <option value="aha">Aha OTT</option>
                  <option value="hotstar">Hotstar-like</option>
                  <option value="primevideo">PrimeVideo-like</option>
                </select>
              </Field>

              <div className="nrv-ai-panel">
                <div className="nrv-ai-label">
                  <AIIcon /> Preview (full detection runs in Web Analyzer)
                </div>
                <div className="nrv-ai-line">
                  <span className="nrv-ai-key">Domain hint</span>
                  <span className="nrv-ai-val">{websiteType || 'Enter a URL above'}</span>
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
            <StepPanel title="Test Assets" eyebrow="Step 02 / 05" desc="Provide test cases or let AI generate them">
              
              {/* Test Case Mode Tabs */}
              <div className="tc-mode-tabs">
                <button
                  type="button"
                  className={`tc-mode-tab${testCaseMode === 'auto' ? ' tc-mode-tab--active' : ''}`}
                  onClick={() => setTestCaseMode('auto')}
                >
                  <AIIcon /> Auto-Generate
                </button>
                <button
                  type="button"
                  className={`tc-mode-tab${testCaseMode === 'csv' ? ' tc-mode-tab--active' : ''}`}
                  onClick={() => setTestCaseMode('csv')}
                >
                  <UploadIcon /> Upload CSV
                </button>
                <button
                  type="button"
                  className={`tc-mode-tab${testCaseMode === 'manual' ? ' tc-mode-tab--active' : ''}`}
                  onClick={() => setTestCaseMode('manual')}
                >
                  <EditIcon /> Manual Entry
                </button>
              </div>

              {/* Auto-Generate Mode */}
              {testCaseMode === 'auto' && (
                <div className="tc-mode-content tc-auto">
                  <div className="tc-auto-info">
                    <AIIcon />
                    <div>
                      <strong>URL Analyzer Agent</strong>
                      <p>The AI will analyze your target URL to discover elements, detect features, and automatically generate test cases based on what it finds.</p>
                    </div>
                  </div>
                  <Field label="Additional Context" hint="Optional — helps focus the analysis">
                    <textarea
                      name="notes"
                      className="form-textarea"
                      rows={3}
                      placeholder="Focus areas, specific features to test, known issues..."
                      onChange={e => setHasNotes(!!e.target.value.trim())}
                    />
                  </Field>
                </div>
              )}

              {/* CSV Upload Mode */}
              {testCaseMode === 'csv' && (
                <div className="tc-mode-content tc-csv">
                  <Field label="Test Cases CSV" hint="Columns: Feature, Scenario, Expected Result">
                    <div className="file-drop-zone">
                      <input name="tcFile" type="file" accept=".csv,.xlsx,.xls" className="file-input" id="tcFile"
                        onChange={e => setHasFile(!!e.target.files?.[0])} />
                      <label htmlFor="tcFile" className={`file-drop-label${hasFile ? ' file-drop-label--filled' : ''}`}>
                        {hasFile ? <><CheckIcon /> File selected</> : <><UploadIcon /> Drop CSV / Excel here or click to browse</>}
                      </label>
                    </div>
                  </Field>
                </div>
              )}

              {/* Manual Entry Mode */}
              {testCaseMode === 'manual' && (
                <div className="tc-mode-content tc-manual">
                  <div className="tc-manual-header">
                    <span className="tc-manual-title">Test Cases ({manualTestCases.length})</span>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={addManualTestCase}>
                      + Add Test Case
                    </button>
                  </div>
                  <div className="tc-manual-list">
                    {manualTestCases.map((tc, idx) => (
                      <div key={tc.id} className="tc-manual-row">
                        <span className="tc-manual-num">{idx + 1}</span>
                        <input
                          type="text"
                          className="form-input tc-manual-input"
                          placeholder="Feature (e.g., Login)"
                          value={tc.feature}
                          onChange={e => updateManualTestCase(tc.id, 'feature', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input tc-manual-input tc-manual-input--wide"
                          placeholder="Scenario (e.g., User logs in with valid credentials)"
                          value={tc.scenario}
                          onChange={e => updateManualTestCase(tc.id, 'scenario', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input tc-manual-input"
                          placeholder="Expected Result"
                          value={tc.expectedResult}
                          onChange={e => updateManualTestCase(tc.id, 'expectedResult', e.target.value)}
                        />
                        {manualTestCases.length > 1 && (
                          <button
                            type="button"
                            className="tc-manual-remove"
                            onClick={() => removeManualTestCase(tc.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Field label="Assertions" hint="One per line — text:Sign In  or  selector:[data-testid='play']">
                <textarea
                  name="assertions"
                  className="form-textarea"
                  rows={4}
                  placeholder={"text:Sign in\ntext:Continue Watching\nselector:[data-testid='play']\nselector:button.primary"}
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
                label="Show browser"
                desc="Opens a visible browser window so you can watch execution live"
              />

              <div className="nrv-divider">
                <span>Optional Agents</span>
              </div>

              <CheckOption
                name="enableAccessibility"
                value="true"
                label="Accessibility Agent"
                badge="WCAG"
                desc="WCAG checks, color contrast, alt text, ARIA labels"
              />
              <CheckOption
                name="enablePerformance"
                value="true"
                label="Performance Agent"
                badge="CWV"
                desc="Core Web Vitals, load time, resource analysis"
              />
              <CheckOption
                name="enableSecurity"
                value="true"
                label="Security Agent"
                badge="SEC"
                desc="Security headers, HTTPS, CSP, XSS protection, cookie security"
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
              <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
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

function CheckOption({ name, value, label, desc, badge }) {
  return (
    <label className="check-option">
      <input type="checkbox" name={name} value={value} className="check-option-input" />
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
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="2" y="5.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

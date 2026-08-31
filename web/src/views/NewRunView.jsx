import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../apiBase';
import { normalizeTargetUrl } from '../lib/websiteTypeHint';
import { useStartRecordingMutation } from '../store/opsApi';
import { useCreateRunMutation } from '../store/runsApi';
import './NewRunView.scss';

const emptyTestCase = () => ({ id: Date.now(), feature: '', scenario: '', expectedResult: '' });

const PROMPT_CHIPS = [
  {
    label: 'Test checkout flow',
    prompt: 'Walk through checkout: add to cart, shipping, and order confirmation.',
  },
  {
    label: 'Validate sign-in',
    prompt: 'Test login with valid and invalid credentials. Confirm errors and session behaviour.',
  },
  {
    label: 'Check search results',
    prompt: 'Exercise search with common terms. Verify results load and empty states are handled.',
  },
  {
    label: 'Browse the catalog',
    prompt: 'Navigate categories and product detail pages. Confirm links, images, and pricing render.',
  },
];

const STEPS = [
  { id: 'target',   label: 'Target',     hint: 'URL and focus' },
  { id: 'cases',    label: 'Test cases', hint: 'Source and assertions' },
  { id: 'checks',   label: 'Checks',     hint: 'A11y · perf · security' },
  { id: 'advanced', label: 'Advanced',   hint: 'Sign-in · profile · recording' },
];

const LAST_STEP = STEPS.length - 1;

const TC_MODE_LABEL = {
  auto:   'Generated from the site',
  csv:    'From an uploaded file',
  manual: 'Written by hand',
};

export default function NewRunView({ onCreated }) {
  const formRef = useRef(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recordingSessionId, setRecordingSessionId] = useState(null);
  const [recordingId, setRecordingId] = useState(null);
  const [ottUrl, setOttUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [hasFile, setHasFile] = useState(false);
  const [createRun] = useCreateRunMutation();
  const [startRecording] = useStartRecordingMutation();

  const [testCaseMode, setTestCaseMode] = useState('auto');
  const [manualTestCases, setManualTestCases] = useState([emptyTestCase()]);

  const addManualTestCase = () => setManualTestCases(prev => [...prev, emptyTestCase()]);
  const removeManualTestCase = (id) => setManualTestCases(prev => prev.filter(tc => tc.id !== id));
  const updateManualTestCase = (id, field, value) => {
    setManualTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const validateTarget = () => {
    const url = normalizeTargetUrl(ottUrl);
    if (!url) { setError('Target URL is required.'); setStep(0); return false; }
    return true;
  };

  const goToStep = (next) => {
    if (next > 0 && !validateTarget()) return;
    setError('');
    setStep(Math.max(0, Math.min(LAST_STEP, next)));
  };

  const handleNext = () => goToStep(step + 1);
  const handleBack = () => goToStep(step - 1);

  const handlePromptKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    formRef.current?.requestSubmit();
  };

  const applyPromptChip = (prompt) => {
    setNotes(prompt);
    setError('');
  };

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
      const data = await startRecording({ ottUrl: url }).unwrap();
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
    if (!url) { setError('Target URL is required.'); setStep(0); return; }

    const file = form.tcFile?.files?.[0];
    const notesValue = form.notes?.value?.trim();

    if (testCaseMode === 'csv' && !file) {
      setError('Upload a CSV, or switch Test cases back to Generate from the site.');
      setStep(1);
      return;
    }
    if (testCaseMode === 'manual') {
      const validCases = manualTestCases.filter(tc => tc.feature.trim() || tc.scenario.trim());
      if (validCases.length === 0) {
        setError('Add at least one test case, or switch Test cases back to Generate from the site.');
        setStep(1);
        return;
      }
    }
    if (testCaseMode === 'auto' && !notesValue && !url) {
      setError('Provide a target URL for auto-generation.');
      setStep(0);
      return;
    }

    setError('');
    setSubmitting(true);
    const fd = new FormData(form);
    fd.set('ottUrl', url);
    fd.set('figmaUrl', '');
    fd.set('testCaseInputMode', testCaseMode);

    if (testCaseMode === 'manual') {
      const validCases = manualTestCases.filter(tc => tc.feature.trim() || tc.scenario.trim());
      fd.set('manualTestCases', JSON.stringify(validCases));
    }

    if (recordingId) fd.set('recordingId', recordingId);
    else if (recordingSessionId) fd.set('recordingSessionId', recordingSessionId);
    const recFile = form.recordingFile?.files?.[0];
    if (recFile) fd.set('recordingFile', recFile);

    try {
      const result = await createRun(fd).unwrap();
      onCreated?.(result.runId);
    } catch (err) {
      setError(err.message || 'Failed to start pipeline.');
      setSubmitting(false);
    }
  };

  const hostPreview = ottUrl.replace(/^https?:\/\//i, '').trim() || 'example.com';

  return (
    <div className="view new-run-view nrv--canvas">
      <form ref={formRef} className="nrv-body nrv-wizard" onSubmit={handleSubmit} encType="multipart/form-data" aria-busy={submitting}>

        <nav className="nrv-steps nrv-steps--tabs" aria-label="New run steps">
          <div className="nrv-steps-rail" aria-hidden="true">
            <div className="nrv-steps-progress" style={{ width: `${(step / LAST_STEP) * 100}%` }} />
          </div>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`nrv-step${step === i ? ' nrv-step--current' : ''}${step > i ? ' nrv-step--done' : ''}`}
              aria-current={step === i ? 'step' : undefined}
              onClick={() => goToStep(i)}
            >
              <span className="nrv-step-num">
                {step > i ? <TickIcon /> : i + 1}
              </span>
              <span className="nrv-step-copy">
                <span className="nrv-step-label">{s.label}</span>
                <span className="nrv-step-hint">{s.hint}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* ── Tab 1: Target ────────────────────────────────── */}
        <section className="nrv-pane nrv-pane--target" hidden={step !== 0}>
          <header className="nrv-pane-head">
            <h1 className="nrv-pane-title display">Target website</h1>
            <p className="nrv-pane-sub">Paste a URL. Add notes if agents should focus on a flow.</p>
          </header>

          <div className="nrv-prompt">
            <div className="nrv-prompt-url-row">
              <label className="nrv-prompt-scheme" htmlFor="nrv-ott-url">https://</label>
              <input
                id="nrv-ott-url"
                name="ottUrl"
                type="text"
                inputMode="url"
                placeholder="example.com"
                autoFocus
                className="nrv-prompt-url-input"
                aria-label="Target website URL"
                value={ottUrl}
                onChange={e => setOttUrl(e.target.value)}
                onKeyDown={handlePromptKeyDown}
              />
            </div>

            <textarea
              id="nrv-notes"
              name="notes"
              className="nrv-prompt-notes"
              rows={3}
              placeholder="Optional — e.g. sign in, search a product, complete checkout"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onKeyDown={handlePromptKeyDown}
            />

            <div className="nrv-chips" aria-label="Example prompts">
              {PROMPT_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  className="nrv-chip"
                  onClick={() => applyPromptChip(chip.prompt)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tab 2: Test cases ───────────────────────────── */}
        <section className="nrv-pane nrv-pane--cases" hidden={step !== 1}>
          <header className="nrv-pane-head">
            <h1 className="nrv-pane-title display">Test cases</h1>
            <p className="nrv-pane-sub">Pick where cases come from. Assertions are optional.</p>
          </header>

          <div className="tc-mode-tabs" role="group" aria-label="Test case source">
            <button
              type="button"
              className={`tc-mode-tab${testCaseMode === 'auto' ? ' tc-mode-tab--active' : ''}`}
              onClick={() => setTestCaseMode('auto')}
              aria-pressed={testCaseMode === 'auto'}
            >
              Generate from the site
            </button>
            <button
              type="button"
              className={`tc-mode-tab${testCaseMode === 'csv' ? ' tc-mode-tab--active' : ''}`}
              onClick={() => setTestCaseMode('csv')}
              aria-pressed={testCaseMode === 'csv'}
            >
              Upload a file
            </button>
            <button
              type="button"
              className={`tc-mode-tab${testCaseMode === 'manual' ? ' tc-mode-tab--active' : ''}`}
              onClick={() => setTestCaseMode('manual')}
              aria-pressed={testCaseMode === 'manual'}
            >
              Write them here
            </button>
          </div>

          <div className="nrv-pane-card">
            {testCaseMode === 'auto' && (
              <p className="nrv-mode-note">
                Cases will be generated from the site crawl. Use the notes on the Target tab to steer agents.
              </p>
            )}

            {testCaseMode === 'csv' && (
              <Field label="Test case file" hint="CSV or Excel with Feature, Scenario, Expected Result">
                <div className="file-drop-zone">
                  <input
                    name="tcFile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="file-input"
                    id="tcFile"
                    onChange={e => setHasFile(!!e.target.files?.[0])}
                  />
                  <label htmlFor="tcFile" className={`file-drop-label${hasFile ? ' file-drop-label--filled' : ''}`}>
                    {hasFile ? <><CheckIcon /> File selected</> : <><UploadIcon /> Choose a CSV or Excel file</>}
                  </label>
                </div>
              </Field>
            )}

            {testCaseMode === 'manual' && (
              <div className="tc-mode-content tc-manual">
                <div className="tc-manual-header">
                  <span className="tc-manual-title">{manualTestCases.length} test case{manualTestCases.length === 1 ? '' : 's'}</span>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addManualTestCase}>
                    Add test case
                  </button>
                </div>
                <div className="tc-manual-list">
                  {manualTestCases.map((tc, idx) => (
                    <div key={tc.id} className="tc-manual-row">
                      <span className="tc-manual-num">{idx + 1}</span>
                      <input
                        type="text"
                        className="form-input tc-manual-input"
                        placeholder="Feature"
                        aria-label={`Test case ${idx + 1} feature`}
                        value={tc.feature}
                        onChange={e => updateManualTestCase(tc.id, 'feature', e.target.value)}
                      />
                      <input
                        type="text"
                        className="form-input tc-manual-input tc-manual-input--wide"
                        placeholder="Scenario"
                        aria-label={`Test case ${idx + 1} scenario`}
                        value={tc.scenario}
                        onChange={e => updateManualTestCase(tc.id, 'scenario', e.target.value)}
                      />
                      <input
                        type="text"
                        className="form-input tc-manual-input"
                        placeholder="Expected result"
                        aria-label={`Test case ${idx + 1} expected result`}
                        value={tc.expectedResult}
                        onChange={e => updateManualTestCase(tc.id, 'expectedResult', e.target.value)}
                      />
                      {manualTestCases.length > 1 && (
                        <button
                          type="button"
                          className="tc-manual-remove"
                          aria-label={`Remove test case ${idx + 1}`}
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

            <Field label="Assertions" hint="One per line — text:Sign in  or  selector:[data-testid='play']">
              <textarea
                name="assertions"
                className="form-textarea"
                rows={3}
                placeholder={"text:Sign in\ntext:Continue Watching\nselector:[data-testid='play']"}
              />
            </Field>

            <p className="nrv-mode-hint">Currently: <strong>{TC_MODE_LABEL[testCaseMode]}</strong></p>
          </div>
        </section>

        {/* ── Tab 3: Checks ───────────────────────────────── */}
        <section className="nrv-pane nrv-pane--checks" hidden={step !== 2}>
          <header className="nrv-pane-head">
            <h1 className="nrv-pane-title display">What to include</h1>
            <p className="nrv-pane-sub">Extra checks are off unless you turn them on. Leave them off for a faster crawl-only run.</p>
          </header>

          <div className="nrv-checks">
            <CheckOption
              name="enableAccessibility"
              value="true"
              label="Accessibility"
              badge="WCAG"
              desc="Colour contrast, alt text, and ARIA labelling"
            />
            <CheckOption
              name="enablePerformance"
              value="true"
              label="Performance"
              badge="CWV"
              desc="Core Web Vitals, load time, and resource weight"
            />
            <CheckOption
              name="enableSecurity"
              value="true"
              label="Security"
              badge="SEC"
              desc="Headers, HTTPS, CSP, and cookie flags"
            />
            <CheckOption
              name="runHeaded"
              value="true"
              label="Show the browser"
              desc="Opens a visible Chromium window so you can watch the run"
            />
          </div>
        </section>

        {/* ── Tab 4: Advanced ─────────────────────────────── */}
        <section className="nrv-pane nrv-pane--advanced" hidden={step !== 3}>
          <header className="nrv-pane-head">
            <h1 className="nrv-pane-title display">Advanced</h1>
            <p className="nrv-pane-sub">Optional. Sign-in, channel profile, and browser recording.</p>
          </header>

          <details className="nrv-disclose" open>
            <summary>
              Sign-in details
              <span className="nrv-disclose-hint">Never stored</span>
            </summary>
            <div className="nrv-disclose-body">
              <div className="nrv-2col">
                <Field label="Email or username">
                  <input name="loginUsername" type="text" className="form-input" placeholder="user@example.com" autoComplete="off" />
                </Field>
                <Field label="Password">
                  <input name="loginPassword" type="password" className="form-input" placeholder="••••••••" autoComplete="off" />
                </Field>
              </div>
              <p className="nrv-note">
                <LockIcon />
                Credentials go straight to the test runner. They are not written to artifacts or the database.
              </p>
            </div>
          </details>

          <details className="nrv-disclose" open>
            <summary>
              Channel profile
              <span className="nrv-disclose-hint">Auto-detect</span>
            </summary>
            <div className="nrv-disclose-body">
              <Field label="Force a channel profile" hint="Leave on auto unless you are testing a known OTT app">
                <select name="channelProfile" className="form-input">
                  <option value="">Auto-detect from the crawl</option>
                  <option value="default">Generic OTT</option>
                  <option value="gray">Gray OTT</option>
                  <option value="tvnz">TVNZ+</option>
                  <option value="aha">Aha OTT</option>
                  <option value="hotstar">Hotstar-like</option>
                  <option value="primevideo">PrimeVideo-like</option>
                </select>
              </Field>
            </div>
          </details>

          <details className="nrv-disclose" open>
            <summary>
              Session recording
              <span className="nrv-disclose-hint">Improves locators</span>
            </summary>
            <div className="nrv-disclose-body">
              <div className="nrv-recording-row">
                <div className="file-drop-zone">
                  <input name="recordingFile" type="file" accept=".json" className="file-input" id="recFile" />
                  <label htmlFor="recFile" className="file-drop-label">
                    <UploadIcon /> Upload a recording
                  </label>
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleStartRecording}>
                  <RecordIcon /> Record in the browser
                </button>
              </div>
              {(recordingSessionId || recordingId) && (
                <div className={`nrv-rec-status${recordingId ? ' nrv-rec-status--saved' : ' nrv-rec-status--live'}`}>
                  {recordingId
                    ? `Recording saved — ${recordingId.slice(0, 20)}…`
                    : 'Recording in progress…'}
                </div>
              )}
            </div>
          </details>
        </section>

        {error && <div className="nrv-error" role="alert">{error}</div>}

        <div className="nrv-actions">
          <div className="nrv-actions-start">
            {step > 0 ? (
              <button type="button" className="btn btn-secondary nrv-back" onClick={handleBack}>
                Back
              </button>
            ) : (
              <p className="nrv-actions-hint">
                Target: <strong>{hostPreview}</strong> · Step {step + 1} of {STEPS.length}
              </p>
            )}
          </div>

          <div className="nrv-actions-end">
            {step < LAST_STEP && (
              <button type="button" className="nrv-next" onClick={handleNext}>
                Continue
              </button>
            )}
            <button
              type="submit"
              className={`btn-launch${step < LAST_STEP ? ' btn-launch--quiet' : ''}`}
              disabled={submitting}
            >
              {submitting
                ? <><SpinIcon /> Starting</>
                : <>Run <span className="btn-launch-glyph"><ArrowIcon /></span></>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label">{label}</label>
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

const TickIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.2l2.4 2.4L9.5 3.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M2 5.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 2v8M4 5l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const RecordIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="6.5" cy="6.5" r="2.5" fill="currentColor" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ animation: 'nrv-spin 0.8s linear infinite' }}>
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.8" strokeDasharray="20 12" />
  </svg>
);
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <rect x="2" y="5.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

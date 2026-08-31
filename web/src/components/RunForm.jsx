import { useRef, useState, useEffect } from 'react';
import { API_BASE } from '../apiBase';
import { useStartRecordingMutation } from '../store/opsApi';
import './RunForm.scss';

export default function RunForm({ onSubmit, onRerunFailed, onDownload, runId, run, hasFailures, canDownload }) {
  const formRef = useRef(null);
  const [recordingSessionId, setRecordingSessionId] = useState(null);
  const [recordingId, setRecordingId] = useState(null);
  const [testCaseInputMode, setTestCaseInputMode] = useState('none'); // 'none', 'csv', 'manual'
  const [manualTestCases, setManualTestCases] = useState([
    { feature: '', scenario: '', expectedResult: '' }
  ]);
  const [startRecording] = useStartRecordingMutation();

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
      const data = await startRecording({ ottUrl }).unwrap();
      if (data.sessionId) {
        setRecordingSessionId(data.sessionId);
        setRecordingId(null);
        const url = `${API_BASE}/record?sessionId=${encodeURIComponent(data.sessionId)}&ottUrl=${encodeURIComponent(ottUrl)}`;
        window.open(url, 'record', 'width=520,height=520');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addManualTestCase = () => {
    setManualTestCases([...manualTestCases, { feature: '', scenario: '', expectedResult: '' }]);
  };

  const removeManualTestCase = (index) => {
    if (manualTestCases.length > 1) {
      setManualTestCases(manualTestCases.filter((_, i) => i !== index));
    }
  };

  const updateManualTestCase = (index, field, value) => {
    const updated = [...manualTestCases];
    updated[index][field] = value;
    setManualTestCases(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const ottUrl = form.ottUrl?.value?.trim();
    const notes = form.notes?.value?.trim();
    const file = form.tcFile?.files?.[0];
    
    if (!ottUrl) return;
    
    // Check if we have test cases from any source (CSV, manual, or URL analysis with notes)
    const hasManualCases = testCaseInputMode === 'manual' && manualTestCases.some(tc => tc.feature || tc.scenario);
    const hasCsvFile = testCaseInputMode === 'csv' && file;
    const hasUrlAnalysisMode = testCaseInputMode === 'none'; // URL Analyzer will generate test cases
    
    if (!hasCsvFile && !hasManualCases && !hasUrlAnalysisMode && !notes) {
      alert('Please provide test cases (CSV or manual) or let URL Analyzer generate them automatically.');
      return;
    }
    
    const fd = new FormData(form);
    fd.set('figmaUrl', '');
    
    // Add manual test cases as JSON if provided
    if (hasManualCases) {
      const validCases = manualTestCases.filter(tc => tc.feature || tc.scenario || tc.expectedResult);
      fd.set('manualTestCases', JSON.stringify(validCases));
      fd.set('testCaseInputMode', 'manual');
    } else if (hasCsvFile) {
      fd.set('testCaseInputMode', 'csv');
    } else {
      fd.set('testCaseInputMode', 'auto'); // URL Analyzer will generate
    }
    
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
          <span className="field-label">URL <em>required</em></span>
          <input name="ottUrl" type="url" placeholder="https://example.com" required />
        </label>
      </div>
      
      {/* Test Cases Input Section */}
      <div className="form-row">
        <div className="field full test-case-section">
          <span className="field-label">Test Cases</span>
          <p className="field-hint">Choose how to provide test cases: upload CSV, enter manually, or let URL Analyzer auto-generate from website analysis.</p>
          
          <div className="test-case-tabs">
            <button 
              type="button" 
              className={`tab-btn ${testCaseInputMode === 'none' ? 'active' : ''}`}
              onClick={() => setTestCaseInputMode('none')}
            >
              🤖 Auto-Generate
            </button>
            <button 
              type="button" 
              className={`tab-btn ${testCaseInputMode === 'csv' ? 'active' : ''}`}
              onClick={() => setTestCaseInputMode('csv')}
            >
              📄 Upload CSV
            </button>
            <button 
              type="button" 
              className={`tab-btn ${testCaseInputMode === 'manual' ? 'active' : ''}`}
              onClick={() => setTestCaseInputMode('manual')}
            >
              ✏️ Manual Entry
            </button>
          </div>

          {/* Auto-Generate Mode */}
          {testCaseInputMode === 'none' && (
            <div className="test-case-content auto-mode">
              <div className="auto-info">
                <span className="auto-icon">🔍</span>
                <div>
                  <strong>URL Analyzer Agent</strong>
                  <p>The URL Analyzer will visit your website, discover all elements, features, and user flows, then automatically generate test cases and a BRD document.</p>
                </div>
              </div>
            </div>
          )}

          {/* CSV Upload Mode */}
          {testCaseInputMode === 'csv' && (
            <div className="test-case-content csv-mode">
              <input name="tcFile" type="file" accept=".csv,.xlsx,.xls" />
              <span className="field-hint">CSV format: Feature, Scenario, Expected Result (one test case per row)</span>
            </div>
          )}

          {/* Manual Entry Mode */}
          {testCaseInputMode === 'manual' && (
            <div className="test-case-content manual-mode">
              <div className="manual-cases-list">
                {manualTestCases.map((tc, index) => (
                  <div key={index} className="manual-case-row">
                    <span className="case-number">#{index + 1}</span>
                    <input
                      type="text"
                      placeholder="Feature/Module"
                      value={tc.feature}
                      onChange={(e) => updateManualTestCase(index, 'feature', e.target.value)}
                      className="case-input feature"
                    />
                    <input
                      type="text"
                      placeholder="Scenario/Test Step"
                      value={tc.scenario}
                      onChange={(e) => updateManualTestCase(index, 'scenario', e.target.value)}
                      className="case-input scenario"
                    />
                    <input
                      type="text"
                      placeholder="Expected Result"
                      value={tc.expectedResult}
                      onChange={(e) => updateManualTestCase(index, 'expectedResult', e.target.value)}
                      className="case-input expected"
                    />
                    <button 
                      type="button" 
                      className="remove-case-btn"
                      onClick={() => removeManualTestCase(index)}
                      disabled={manualTestCases.length === 1}
                      title="Remove test case"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-case-btn" onClick={addManualTestCase}>
                + Add Test Case
              </button>
              <span className="field-hint">Enter Feature/Module, Scenario description, and Expected Result for each test case.</span>
            </div>
          )}
        </div>
      </div>

      <div className="form-row two">
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
          <span className="field-label">Assertions (one per line)</span>
          <textarea
            name="assertions"
            rows={3}
            placeholder={"text:Sign in\ntext:Continue Watching\nselector:[data-testid='play']\nselector:button.primary"}
          />
          <span className="field-hint">
            Use <strong>text:</strong> for visible text. Use <strong>selector:</strong> for CSS or XPath. Each line = one check on the landing page.
          </span>
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
      <div className="form-row">
        <div className="field full optional-agents">
          <span className="field-label">Optional Agents</span>
          <p className="field-hint">Select additional agents to run in the pipeline. These are optional and can be enabled based on your testing needs.</p>
          <div className="agents-checkboxes">
            <label className="checkbox-label">
              <input name="enableAccessibility" type="checkbox" value="true" />
              <span>Accessibility Agent</span>
              <span className="agent-desc">Checks WCAG compliance, color contrast, alt text, ARIA labels</span>
            </label>
            <label className="checkbox-label">
              <input name="enablePerformance" type="checkbox" value="true" />
              <span>Performance Agent</span>
              <span className="agent-desc">Measures page load time, Core Web Vitals, resource analysis</span>
            </label>
            <label className="checkbox-label">
              <input name="enableSecurity" type="checkbox" value="true" />
              <span>Security Agent</span>
              <span className="agent-desc">Checks HTTPS, security headers, CSP, cookie security, XSS protection</span>
            </label>
          </div>
        </div>
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

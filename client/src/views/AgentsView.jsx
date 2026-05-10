import { useEffect, useState } from 'react';
import './AgentsView.css';

const AGENTS = [
  {
    id: 'ba',
    name: 'BA Agent',
    desc: 'Extracts requirements, scope, and constraints from user input and release notes',
    defaultPrompt:
      'You are a Business Analyst agent for OTT/streaming QA. Given a target URL and optional release notes, ' +
      'produce a structured set of testable requirements, assumptions, and risks. Be specific and traceable.',
  },
  {
    id: 'manualQa',
    name: 'Manual QA Agent',
    desc: 'Drafts manual test cases (feature, scenario, expected) tailored to the channel and requirements',
    defaultPrompt:
      'You are a Manual QA agent. Given the BA requirements and a channel profile, generate granular test cases ' +
      'with id, feature, scenario, steps, and expected result. Cover navigation, auth, playback, accessibility hints.',
  },
  {
    id: 'automationQa',
    name: 'Automation QA Agent',
    desc: 'Converts manual test cases into Selenium/Java + Playwright runnable scripts using the locator registry',
    defaultPrompt:
      'You are an Automation QA agent. Given manual test cases and selector candidates, output runnable ' +
      'Selenium/Java and Playwright scripts. Prefer stable selectors from the locator registry.',
  },
  {
    id: 'manager',
    name: 'Manager Agent',
    desc: 'Reviews execution evidence, produces verdict, traceability matrix, root causes, and action plan',
    defaultPrompt:
      'You are a QA Manager agent. Given the execution report and artifacts, produce an executive summary ' +
      '(GO / CONDITIONAL GO / HOLD), traceability matrix, root causes, and an action plan.',
  },
];

const PROVIDER_MODELS = {
  claude: [
    { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'o1-mini', name: 'o1-mini' },
  ],
  gemini: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
};

function fmtDate(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function AgentsView() {
  const [settings, setSettings] = useState({});       // by agent id
  const [keys, setKeys] = useState({});                // provider -> configured?
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState({});            // agent -> bool
  const [savedAt, setSavedAt] = useState({});          // agent -> timestamp string

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [agentsRes, keysRes] = await Promise.all([
        fetch('/api/agent-settings').then(r => r.json()),
        fetch('/api/provider-keys').then(r => r.json()),
      ]);
      const byAgent = {};
      for (const i of agentsRes.items || []) byAgent[i.agent] = i;
      const byProvider = {};
      for (const i of keysRes.items || []) byProvider[i.provider] = i.configured;
      setSettings(byAgent);
      setKeys(byProvider);
    } catch (e) {
      setError(e.message || 'Failed to load.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateField = (agentId, field, value) => {
    setSettings(s => ({
      ...s,
      [agentId]: { ...(s[agentId] || { agent: agentId }), [field]: value },
    }));
  };

  const saveAgent = async (agentId) => {
    const cfg = settings[agentId] || {};
    setSaving(s => ({ ...s, [agentId]: true }));
    setError('');
    try {
      const res = await fetch(`/api/agent-settings/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: cfg.provider || null,
          model: cfg.model || null,
          prompt: cfg.prompt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setSavedAt(t => ({ ...t, [agentId]: new Date().toISOString() }));
    } catch (e) {
      setError(e.message);
    } finally { setSaving(s => ({ ...s, [agentId]: false })); }
  };

  return (
    <div className="view agents-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Agents</h1>
          <p className="view-subtitle">
            Choose the model and tune the system prompt for each LLM-driven agent in the pipeline.
          </p>
        </div>
      </div>

      {error && <div className="agv-error">{error}</div>}
      {loading && <div className="agv-loading">Loading agents…</div>}

      {!loading && (
        <div className="agv-list">
          {AGENTS.map(a => {
            const cfg = settings[a.id] || {};
            const provider = cfg.provider || '';
            const model = cfg.model || '';
            const prompt = cfg.prompt ?? a.defaultPrompt;
            const providerOk = provider && keys[provider];
            const justSaved = !!savedAt[a.id];

            return (
              <div key={a.id} className="agv-card">
                <div className="agv-card-head">
                  <div>
                    <div className="agv-card-title">{a.name}</div>
                    <div className="agv-card-desc">{a.desc}</div>
                  </div>
                  {cfg.updatedAt && !justSaved && (
                    <div className="agv-meta">Updated {fmtDate(cfg.updatedAt)}</div>
                  )}
                  {justSaved && <div className="agv-meta agv-meta--ok">Saved ✓</div>}
                </div>

                <div className="agv-grid">
                  <div className="agv-field">
                    <label className="agv-label">Provider</label>
                    <select
                      className="agv-select"
                      value={provider}
                      onChange={e => {
                        updateField(a.id, 'provider', e.target.value);
                        updateField(a.id, 'model', '');
                      }}
                    >
                      <option value="">— select —</option>
                      <option value="claude">Anthropic Claude</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                    {provider && !keys[provider] && (
                      <div className="agv-hint agv-hint--warn">
                        No API key configured for this provider. Add it in API Keys.
                      </div>
                    )}
                    {providerOk && <div className="agv-hint agv-hint--ok">Key configured ✓</div>}
                  </div>

                  <div className="agv-field">
                    <label className="agv-label">Model</label>
                    <select
                      className="agv-select"
                      value={model}
                      onChange={e => updateField(a.id, 'model', e.target.value)}
                      disabled={!provider}
                    >
                      <option value="">— select —</option>
                      {(PROVIDER_MODELS[provider] || []).map(m =>
                        <option key={m.id} value={m.id}>{m.name}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="agv-field">
                  <label className="agv-label">System Prompt</label>
                  <textarea
                    className="agv-textarea"
                    rows={6}
                    value={prompt}
                    placeholder={a.defaultPrompt}
                    onChange={e => updateField(a.id, 'prompt', e.target.value)}
                  />
                  <div className="agv-hint">
                    {prompt && prompt !== a.defaultPrompt
                      ? `${prompt.length} chars — custom prompt`
                      : 'Using default prompt — edit to override'}
                  </div>
                </div>

                <div className="agv-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => updateField(a.id, 'prompt', a.defaultPrompt)}
                  >
                    Reset to default
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={saving[a.id]}
                    onClick={() => saveAgent(a.id)}
                  >
                    {saving[a.id] ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

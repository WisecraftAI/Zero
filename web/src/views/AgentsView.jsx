import { useEffect, useState, useRef } from 'react';
import { apiUrl } from '../apiBase';
import AiSetupBanner from '../components/AiSetupBanner';
import { applyGeminiToAllAgents, countActiveAgents } from '../lib/aiSetup';
import './AgentsView.scss';

const AGENTS = [
  {
    id: 'ba',
    name: 'BA Agent',
    code: 'AG-0091-ALPHA',
    specialization: 'Requirement Analysis & Scope',
    desc: 'AI consolidates URL crawl, notes, and uploads into testable requirements',
    defaultPrompt:
      'You are a Business Analyst agent for web QA on any site type. Given a target URL, crawl insights, ' +
      'and optional notes, produce structured testable requirements, assumptions, and risks. Be specific and traceable.',
  },
  {
    id: 'manualQa',
    name: 'Manual QA Agent',
    code: 'AG-0042-BETA',
    specialization: 'Exploratory Testing & UX Validation',
    desc: 'AI drafts manual test cases tailored to the detected domain profile and requirements',
    defaultPrompt:
      'You are a Manual QA agent. Given BA requirements and the site domain profile, generate granular test cases ' +
      'with id, feature, scenario, steps, and expected result. Cover navigation, forms, auth, content, and accessibility hints.',
  },
  {
    id: 'automationQa',
    name: 'Automation QA',
    code: 'AG-0128-DELTA',
    specialization: 'Script Generation & Locator Hints',
    desc: 'AI augments locator candidates and automation guidance from crawl + registry',
    defaultPrompt:
      'You are an Automation QA agent. Given manual test cases and selector candidates, suggest stable locators ' +
      'and automation hints. Prefer selectors from the locator registry when available.',
  },
  {
    id: 'manager',
    name: 'Manager Agent',
    code: 'AG-MGR-01',
    specialization: 'Orchestration & Verdict Synthesis',
    desc: 'AI reviews execution evidence and produces executive verdict and action plan',
    defaultPrompt:
      'You are a QA Manager agent. Given the execution report and artifacts, produce an executive summary ' +
      '(GO / CONDITIONAL GO / HOLD), traceability matrix, root causes, and an action plan.',
  },
];

const PROVIDER_MODELS = {
  claude: [
    { id: 'claude-opus-4-7',   name: 'Claude Opus 4.7',   contextWindow: 1_000_000, label: '1M' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200_000,   label: '200k' },
    { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  contextWindow: 200_000,   label: '200k' },
  ],
  openai: [
    { id: 'gpt-4o',      name: 'GPT-4o',      contextWindow: 128_000, label: '128k' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128_000, label: '128k' },
    { id: 'o1-mini',     name: 'o1-mini',     contextWindow: 128_000, label: '128k' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1_000_000, label: '1M', recommended: true },
    { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro',   contextWindow: 2_000_000, label: '2M' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1_000_000, label: '1M' },
  ],
};

const PROVIDER_LABELS = { claude: 'Anthropic Claude', openai: 'OpenAI', gemini: 'Google Gemini' };

function findModel(provider, modelId) {
  return (PROVIDER_MODELS[provider] || []).find(m => m.id === modelId) || null;
}

function fmtDate(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function statusFor(cfg, hasKey) {
  if (cfg?.provider && cfg?.model && hasKey) return 'active';
  if (cfg?.provider || cfg?.model) return 'optimizing';
  return 'idle';
}

const STATUS_LABEL = { idle: 'IDLE', active: 'ACTIVE', optimizing: 'CONFIG' };

export default function AgentsView({ onNavigate }) {
  const [settings, setSettings] = useState({});
  const [keys, setKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [enablingAi, setEnablingAi] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [agentsRes, keysRes] = await Promise.all([
        fetch(apiUrl('/agent-settings')).then(r => r.json()),
        fetch(apiUrl('/provider-keys')).then(r => r.json()),
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

  // close action menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const onClick = () => setOpenMenuId(null);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [openMenuId]);

  if (selectedId) {
    return (
      <AgentDetailView
        agent={AGENTS.find(a => a.id === selectedId)}
        cfg={settings[selectedId] || {}}
        keys={keys}
        onBack={() => setSelectedId(null)}
        onSaved={() => load()}
      />
    );
  }

  const activeCount = countActiveAgents(settings, keys);
  const totalContextK = AGENTS.reduce((sum, a) => {
    const m = findModel(settings[a.id]?.provider, settings[a.id]?.model);
    return sum + (m?.contextWindow || 0);
  }, 0);

  return (
    <div className="view agents-view">
      {/* Header */}
      <div className="agv-header">
        <div>
          <div className="agv-status-pill">
            <span className="agv-status-dot" />
            CLUSTER STATUS: OPERATIONAL
          </div>
          <h1 className="view-title agv-title">Agents Control Room</h1>
          <p className="view-subtitle">
            Configure AI models and prompts for BA, Manual QA, Automation, and Manager. Domain inference
            runs automatically after Web Analyzer when site type confidence is low (no separate agent row).
          </p>
        </div>
        <div className="agv-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="agv-error">{error}</div>}

      {!loading && (
        <AiSetupBanner
          variant="agents"
          geminiConfigured={!!keys.gemini}
          activeCount={activeCount}
          totalAgents={AGENTS.length}
          onGoApiKeys={() => onNavigate?.('apikeys')}
          onEnableGemini={keys.gemini ? async () => {
            setEnablingAi(true);
            setError('');
            try {
              await applyGeminiToAllAgents(apiUrl);
              await load();
            } catch (e) {
              setError(e.message || 'Failed to enable AI agents.');
            } finally {
              setEnablingAi(false);
            }
          } : undefined}
          enabling={enablingAi}
        />
      )}

      {/* Stat cards */}
      <div className="agv-stats">
        <StatCard
          label="Active Agents"
          value={String(activeCount).padStart(2, '0')}
          sub={`${activeCount}/${AGENTS.length} fully configured`}
          progress={activeCount / AGENTS.length}
        />
        <StatCard
          label="Context Capacity"
          value={totalContextK >= 1_000_000 ? `${(totalContextK / 1_000_000).toFixed(1)}M` : `${Math.round(totalContextK / 1000)}k`}
          sub="Aggregate token budget across active agents"
        />
        <StatCard
          label="Providers Linked"
          value={String(Object.values(keys).filter(Boolean).length)}
          sub="Provider keys configured in API Keys"
        />
      </div>

      {/* Agents table */}
      <div className="agv-table">
        <div className="agv-table-head">
          <span className="agv-th agv-th--name">Agent Identity</span>
          <span className="agv-th agv-th--status">Status</span>
          <span className="agv-th agv-th--spec">Specialization</span>
          <span className="agv-th agv-th--model">Model</span>
          <span className="agv-th agv-th--actions">Actions</span>
        </div>

        {loading && <div className="agv-loading">Loading agents…</div>}

        {!loading && AGENTS.map(a => {
          const cfg = settings[a.id] || {};
          const hasKey = !!keys[cfg.provider];
          const status = statusFor(cfg, hasKey);
          const model = findModel(cfg.provider, cfg.model);

          return (
            <div key={a.id} className="agv-tr">
              <div className="agv-td agv-td--name">
                <div className="agv-agent-name">{a.name}</div>
                <div className="agv-agent-id">ID: {a.code}</div>
              </div>
              <div className="agv-td agv-td--status">
                <span className={`agv-badge agv-badge--${status}`}>
                  <span className="agv-badge-dot" />
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <div className="agv-td agv-td--spec">
                {a.specialization}
              </div>
              <div className="agv-td agv-td--model">
                {cfg.provider ? (
                  <>
                    <div className="agv-model-name">{model?.name || cfg.model || '—'}</div>
                    <div className="agv-model-meta">
                      {PROVIDER_LABELS[cfg.provider]}
                      {model?.label && ` · ${model.label} ctx`}
                    </div>
                  </>
                ) : (
                  <span className="agv-not-set">— not configured —</span>
                )}
              </div>
              <div className="agv-td agv-td--actions">

                <div className="agv-menu-wrap" onClick={e => e.stopPropagation()}>
                  <button
                    className="agv-dot-btn"
                    onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)}
                    title="More actions"
                  >
                    <DotsIcon />
                  </button>
                  {openMenuId === a.id && (
                    <div className="agv-menu">
                      <button
                        className="agv-menu-item"
                        onClick={() => { setOpenMenuId(null); setSelectedId(a.id); }}
                      >
                        Edit prompt & model
                      </button>
                      <button
                        className="agv-menu-item"
                        onClick={() => { setOpenMenuId(null); setSelectedId(a.id); }}
                      >
                        View token usage
                      </button>
                      <button
                        className="agv-menu-item agv-menu-item--danger"
                        disabled={!cfg.provider}
                        onClick={async () => {
                          setOpenMenuId(null);
                          if (!window.confirm(`Reset ${a.name} to defaults?`)) return;
                          await fetch(apiUrl(`/agent-settings/${a.id}`), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ provider: null, model: null, prompt: null }),
                          });
                          load();
                        }}
                      >
                        Reset to default
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}

    </div>
  );
}

/* ─── Stat card ───────────────────────────────────────────── */
function StatCard({ label, value, sub, progress }) {
  return (
    <div className="agv-stat-card">
      <div className="agv-stat-label">{label}</div>
      <div className="agv-stat-value">{value}</div>
      {sub && <div className="agv-stat-sub">{sub}</div>}
      {progress != null && (
        <div className="agv-stat-bar">
          <div className="agv-stat-bar-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

/* ─── Detail view ─────────────────────────────────────────── */
function AgentDetailView({ agent, cfg, keys, onBack, onSaved }) {
  const [provider, setProvider] = useState(cfg.provider || '');
  const [model, setModel] = useState(cfg.model || '');
  const [prompt, setPrompt] = useState(cfg.prompt ?? agent.defaultPrompt);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const promptRef = useRef(null);

  const modelObj = findModel(provider, model);
  const ctxWindow = modelObj?.contextWindow || 0;
  const promptTokens = Math.ceil((prompt || '').length / 4);  // rough: ~4 chars per token
  const ctxUsedPct = ctxWindow ? Math.min(100, (promptTokens / ctxWindow) * 100) : 0;
  const hasKey = !!keys[provider];
  const isCustomPrompt = prompt && prompt !== agent.defaultPrompt;

  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      const res = await fetch(apiUrl(`/agent-settings/${agent.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider || null,
          model: model || null,
          prompt: prompt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setStatus('Saved ✓');
      onSaved?.();
      setTimeout(() => setStatus(''), 2400);
    } catch (e) {
      setStatus(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="view agents-view agv-detail">
      {/* Detail header */}
      <div className="agv-detail-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back to Control Room</button>
        <div className="agv-detail-meta">
          ID: <code>{agent.code}</code>
          {cfg.updatedAt && <span> · Last updated {fmtDate(cfg.updatedAt)}</span>}
        </div>
      </div>

      <div className="agv-detail-title">
        <h1 className="view-title">{agent.name}</h1>
        <p className="view-subtitle">{agent.desc}</p>
      </div>

      {/* Two-column body */}
      <div className="agv-detail-body">

        {/* Left — prompt + model */}
        <div className="agv-detail-main">
          <div className="agv-card">
            <div className="agv-card-head">
              <span className="agv-section-label">MODEL CONFIGURATION</span>
            </div>
            <div className="agv-grid">
              <div className="agv-field">
                <label className="agv-label">Provider</label>
                <select
                  className="agv-select"
                  value={provider}
                  onChange={e => { setProvider(e.target.value); setModel(''); }}
                >
                  <option value="">— select —</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
                {provider && !hasKey && (
                  <div className="agv-hint agv-hint--warn">No API key for this provider — add it in API Keys.</div>
                )}
                {provider && hasKey && <div className="agv-hint agv-hint--ok">Key configured ✓</div>}
              </div>
              <div className="agv-field">
                <label className="agv-label">Model</label>
                <select
                  className="agv-select"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  disabled={!provider}
                >
                  <option value="">— select —</option>
                  {(PROVIDER_MODELS[provider] || []).map(m =>
                    <option key={m.id} value={m.id}>{m.name} ({m.label} ctx)</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="agv-card">
            <div className="agv-card-head">
              <span className="agv-section-label">CUSTOM PROMPT</span>
              <span className="agv-card-meta">
                {isCustomPrompt ? `${prompt.length} chars · custom` : 'using default'}
              </span>
            </div>
            <textarea
              ref={promptRef}
              className="agv-textarea"
              rows={12}
              value={prompt}
              placeholder={agent.defaultPrompt}
              onChange={e => setPrompt(e.target.value)}
            />
            <div className="agv-prompt-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPrompt(agent.defaultPrompt)}
                disabled={!isCustomPrompt}
              >
                Reset to default
              </button>
              <div className="agv-prompt-spacer" />
              {status && <span className={`agv-status-msg ${status.includes('✓') ? 'agv-status-msg--ok' : 'agv-status-msg--err'}`}>{status}</span>}
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Right — token usage / specs */}
        <div className="agv-detail-side">
          <div className="agv-card">
            <div className="agv-card-head">
              <span className="agv-section-label">MODEL CONTEXT WINDOW</span>
            </div>
            <div className="agv-ctx-row">
              <div className="agv-ctx-value">
                {ctxWindow >= 1_000_000 ? `${(ctxWindow / 1_000_000).toFixed(1)}M` : ctxWindow ? `${Math.round(ctxWindow / 1000)}k` : '—'}
              </div>
              <div className="agv-ctx-unit">{ctxWindow ? 'tokens max' : 'select a model'}</div>
            </div>
            <div className="agv-ctx-bar">
              <div className="agv-ctx-bar-fill" style={{ width: `${ctxUsedPct}%` }} />
            </div>
            <div className="agv-ctx-legend">
              <span>System prompt: <strong>{promptTokens.toLocaleString()}</strong> tokens (est.)</span>
              <span className="agv-ctx-pct">{ctxWindow ? `${ctxUsedPct.toFixed(2)}% of window` : ''}</span>
            </div>
            <div className="agv-ctx-note">
              Estimate uses 4 chars / token. Run-time usage will include retrieved test cases, requirements, and tool output.
            </div>
          </div>

          <div className="agv-card">
            <div className="agv-card-head">
              <span className="agv-section-label">AGENT SPECIFICATION</span>
            </div>
            <dl className="agv-spec">
              <div><dt>Specialization</dt><dd>{agent.specialization}</dd></div>
              <div><dt>Agent ID</dt><dd><code>{agent.code}</code></dd></div>
              <div><dt>Pipeline Stage</dt><dd>{agent.id}</dd></div>
              <div><dt>Status</dt><dd>{STATUS_LABEL[statusFor({ provider, model }, hasKey)]}</dd></div>
            </dl>
          </div>

          <div className="agv-card agv-card--tip">
            <div className="agv-tip-title">Tip</div>
            <p className="agv-tip-text">
              Keep prompts concise — every token of the system prompt is sent on every call. Push
              variable context (test cases, URLs, prior outputs) into runtime messages, not the prompt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Icons ───────────────────────────────────────────────── */
const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="3" cy="7" r="1.3" fill="currentColor" />
    <circle cx="7" cy="7" r="1.3" fill="currentColor" />
    <circle cx="11" cy="7" r="1.3" fill="currentColor" />
  </svg>
);

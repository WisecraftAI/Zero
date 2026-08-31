import { useEffect, useState } from 'react';
import AiSetupBanner from '../components/AiSetupBanner';
import {
  useEnableGeminiForAllMutation,
  useGetAgentSettingsQuery,
  useGetProviderKeysQuery,
  useUpdateAgentSettingMutation,
} from '../store/settingsApi';
import {
  PIPELINE_AGENTS,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  RUN_PHASES,
  agentGuidance,
  agentNames,
  countCustomPrompts,
  enrichmentSummary,
  findModel,
} from './agents/agentCatalog';
import './AgentsView.scss';

function fmtDate(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function AgentsView({ onNavigate }) {
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const agentsQuery = useGetAgentSettingsQuery();
  const keysQuery = useGetProviderKeysQuery();
  const [updateAgentSetting] = useUpdateAgentSettingMutation();
  const [enableGeminiForAll, { isLoading: enablingAi }] = useEnableGeminiForAllMutation();
  const settings = Object.fromEntries(
    (agentsQuery.data?.items || []).map((item) => [item.agent, item]),
  );
  const keys = Object.fromEntries(
    (keysQuery.data?.items || []).map((item) => [item.provider, item.configured]),
  );
  const loading = agentsQuery.isLoading || keysQuery.isLoading;
  const loadError = agentsQuery.isError || keysQuery.isError
    ? 'Failed to load agent settings.'
    : '';
  const load = () => {
    setError('');
    agentsQuery.refetch();
    keysQuery.refetch();
  };

  // Dismiss the open row menu the way native menus do: outside click or Escape.
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId]);

  if (selectedId) {
    return (
      <AgentDetailView
        agent={PIPELINE_AGENTS.find((agent) => agent.id === selectedId)}
        cfg={settings[selectedId] || {}}
        keys={keys}
        onBack={() => setSelectedId(null)}
        onSaved={load}
        onGoApiKeys={onNavigate ? () => onNavigate('apikeys') : undefined}
      />
    );
  }

  const enrichment = enrichmentSummary(settings, keys);
  const providersLinked = Object.values(keys).filter(Boolean).length;
  const customPrompts = countCustomPrompts(settings);

  return (
    <div className="view agents-view">
      <div className="agv-header">
        <div>
          <div className={`agv-status-pill agv-status-pill--${enrichment.mode}`}>
            <span className="agv-status-dot" />
            {enrichment.label.toUpperCase()}
          </div>
          <h1 className="view-title agv-title">Agents</h1>
          <p className="view-subtitle">
            Every run walks the same four agents in order — BA, Manual QA, Automation QA, then Manager.
            Each one produces a deterministic template result on its own; giving an agent a provider key
            and model lets it enrich that result with an LLM. Domain inference happens automatically after
            Web Analyzer when site-type confidence is low, so it has no row of its own.
          </p>
        </div>
        <div className="agv-header-actions">
          {onNavigate && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('apikeys')}>
              API keys →
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {(error || loadError) && (
        <div className="agv-error" role="alert">
          <span>{error || loadError}</span>
          {loadError && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Try again</button>
          )}
        </div>
      )}

      {!loading && (
        <AiSetupBanner
          variant="agents"
          geminiConfigured={!!keys.gemini}
          activeCount={enrichment.activeCount}
          totalAgents={enrichment.total}
          onGoApiKeys={() => onNavigate?.('apikeys')}
          onEnableGemini={keys.gemini ? async () => {
            setError('');
            try {
              await enableGeminiForAll().unwrap();
            } catch (e) {
              setError(e.data?.error || e.message || 'Failed to enable AI agents.');
            }
          } : undefined}
          enabling={enablingAi}
        />
      )}

      <section className="agv-test-agents" aria-labelledby="run-phases-title">
        <div className="agv-test-agents-head">
          <div>
            <span className="agv-section-label">HOW A RUN USES AGENTS</span>
            <h2 id="run-phases-title">Plan, author, execute, review</h2>
          </div>
          <p className="agv-test-agents-lead">
            Only the plan, author, and review phases call a model. Execution is always deterministic
            Playwright, so no configuration on this page changes how a browser step is run.
          </p>
        </div>
        <div className="agv-agent-flow">
          {RUN_PHASES.map((phase) => {
            const drivers = agentNames(phase.agentIds);
            return (
              <article className={`agv-flow-stage agv-flow-stage--${phase.id}`} key={phase.id}>
                <div className="agv-flow-stage-top">
                  <span className="agv-flow-icon"><PhaseIcon kind={phase.id} /></span>
                  <span className="agv-flow-step">{phase.step}</span>
                </div>
                <h3>{phase.name}</h3>
                <p>{phase.desc}</p>
                <div className="agv-flow-agents">
                  {drivers.length > 0 ? (
                    drivers.map((name) => (
                      <span className="agv-flow-agent" key={name}>{name}</span>
                    ))
                  ) : (
                    <span className="agv-flow-agent agv-flow-agent--none">No model needed</span>
                  )}
                </div>
                {phase.note && <p className="agv-flow-note">{phase.note}</p>}
                <div className="agv-flow-output">{phase.output}</div>
              </article>
            );
          })}
        </div>
        <div className="agv-improvement-loop">
          <span>Application</span>
          <i aria-hidden="true" />
          <span>Test plan</span>
          <i aria-hidden="true" />
          <span>Playwright tests</span>
          <i aria-hidden="true" />
          <span>Execution evidence</span>
          <i aria-hidden="true" />
          <span>Learned locators</span>
        </div>
        <p className="agv-loop-caption">
          Healed selectors are stored per host, so the next run against the same site starts from
          what the last run proved.
        </p>
      </section>

      <section className="agv-enrichment" aria-labelledby="enrichment-title">
        <h2 id="enrichment-title" className="agv-section-label">WHAT CONFIGURATION CHANGES</h2>
        <div className="agv-enrichment-grid">
          <div className="agv-enrich-card agv-enrich-card--ai">
            <h3>With a key and model</h3>
            <p>
              The agent still builds its template result first, then the model refines and extends it.
              Enriched artifacts are labelled <code>+ LLM</code> in the run detail.
            </p>
          </div>
          <div className="agv-enrich-card">
            <h3>Without one, or when a cap trips</h3>
            <p>
              The template result ships as-is and the run still completes. ZERO records why it fell
              back — missing key, rate limit, cost cap, unreadable response, or AI switched off.
            </p>
          </div>
        </div>
      </section>

      <div className="agv-stats">
        <StatCard
          label="AI-enriched agents"
          value={`${enrichment.activeCount}/${enrichment.total}`}
          sub={enrichment.detail}
          progress={enrichment.activeCount / enrichment.total}
        />
        <StatCard
          label="Providers linked"
          value={String(providersLinked)}
          sub={providersLinked > 0 ? 'Keys are stored encrypted under API Keys.' : 'Add a key under API Keys to enable AI.'}
        />
        <StatCard
          label="Custom prompts"
          value={`${customPrompts}/${PIPELINE_AGENTS.length}`}
          sub={customPrompts > 0 ? 'Remaining agents use the ZERO default prompt.' : 'All agents use the ZERO default prompt.'}
        />
      </div>

      <div className="agv-table">
        <div className="agv-table-head">
          <span className="agv-th agv-th--name">Agent</span>
          <span className="agv-th agv-th--status">AI status</span>
          <span className="agv-th agv-th--spec">What it produces</span>
          <span className="agv-th agv-th--model">Model</span>
          <span className="agv-th agv-th--actions">Actions</span>
        </div>

        {loading && <div className="agv-loading" role="status">Loading agents…</div>}

        {!loading && PIPELINE_AGENTS.map((a) => {
          const cfg = settings[a.id] || {};
          const hasKey = !!keys[cfg.provider];
          const guidance = agentGuidance(cfg, hasKey);
          const model = findModel(cfg.provider, cfg.model);

          return (
            <div key={a.id} className="agv-tr">
              <div className="agv-td agv-td--name">
                <div className="agv-agent-name">{a.name}</div>
                <div className="agv-agent-id">Step {a.step} of {PIPELINE_AGENTS.length} · {a.role}</div>
              </div>
              <div className="agv-td agv-td--status" data-label="AI status">
                <span className={`agv-badge agv-badge--${guidance.status}`}>
                  <span className="agv-badge-dot" />
                  {guidance.label}
                </span>
                <span className="agv-status-hint">{guidance.hint}</span>
              </div>
              <div className="agv-td agv-td--spec" data-label="Produces">
                {a.produces}
              </div>
              <div className="agv-td agv-td--model" data-label="Model">
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
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedId(a.id)}
                >
                  Configure
                </button>

                <div className="agv-menu-wrap" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="agv-dot-btn"
                    aria-label={`More actions for ${a.name}`}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === a.id}
                    onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)}
                  >
                    <DotsIcon />
                  </button>
                  {openMenuId === a.id && (
                    <div className="agv-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className="agv-menu-item"
                        onClick={() => { setOpenMenuId(null); setSelectedId(a.id); }}
                      >
                        Edit prompt & model
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="agv-menu-item agv-menu-item--danger"
                        disabled={!cfg.provider && !cfg.model && !cfg.prompt}
                        onClick={async () => {
                          setOpenMenuId(null);
                          if (!window.confirm(`Reset ${a.name} to template output and the default prompt?`)) return;
                          setError('');
                          try {
                            await updateAgentSetting({
                              id: a.id,
                              provider: null,
                              model: null,
                              prompt: null,
                            }).unwrap();
                          } catch (e) {
                            setError(e.data?.error || e.message || `Failed to reset ${a.name}.`);
                          }
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
function AgentDetailView({ agent, cfg, keys, onBack, onSaved, onGoApiKeys }) {
  const [provider, setProvider] = useState(cfg.provider || '');
  const [model, setModel] = useState(cfg.model || '');
  const [prompt, setPrompt] = useState(cfg.prompt ?? agent.defaultPrompt);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [updateAgentSetting] = useUpdateAgentSettingMutation();

  const modelObj = findModel(provider, model);
  const ctxWindow = modelObj?.contextWindow || 0;
  const promptTokens = Math.ceil((prompt || '').length / 4);  // rough: ~4 chars per token
  const ctxUsedPct = ctxWindow ? Math.min(100, (promptTokens / ctxWindow) * 100) : 0;
  const hasKey = !!keys[provider];
  const isCustomPrompt = prompt && prompt !== agent.defaultPrompt;
  const guidance = agentGuidance({ provider, model }, hasKey);

  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      await updateAgentSetting({
        id: agent.id,
        provider: provider || null,
        model: model || null,
        prompt: prompt || null,
      }).unwrap();
      setStatus('Saved ✓');
      onSaved?.();
      setTimeout(() => setStatus(''), 2400);
    } catch (e) {
      setStatus(e.data?.error || e.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div className="view agents-view agv-detail">
      <div className="agv-detail-head">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>← Back to agents</button>
        <div className="agv-detail-meta">
          Stage <code>{agent.id}</code> · step {agent.step} of {PIPELINE_AGENTS.length}
          {cfg.updatedAt && <span> · saved {fmtDate(cfg.updatedAt)}</span>}
        </div>
      </div>

      <div className="agv-detail-title">
        <h1 className="view-title">{agent.name}</h1>
        <p className="view-subtitle">
          {agent.role} — step {agent.step} of the run. With a model: {agent.aiAdds} Without one,
          this stage still ships its template output.
        </p>
      </div>

      <div className="agv-detail-body">

        {/* Left — prompt + model */}
        <div className="agv-detail-main">
          <div className="agv-card">
            <div className="agv-card-head">
              <span className="agv-section-label">MODEL CONFIGURATION</span>
              <span className="agv-card-meta">{guidance.label}</span>
            </div>
            <div className="agv-grid">
              <div className="agv-field">
                <label className="agv-label" htmlFor="agent-provider">Provider</label>
                <select
                  id="agent-provider"
                  className="agv-select"
                  value={provider}
                  onChange={e => { setProvider(e.target.value); setModel(''); }}
                >
                  <option value="">— none (template output) —</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
                {provider && !hasKey && (
                  <div className="agv-hint agv-hint--warn">
                    No API key for this provider — add it under API Keys, or this stage keeps its template output.
                    {onGoApiKeys && (
                      <>
                        {' '}
                        <button type="button" className="agv-inline-link" onClick={onGoApiKeys}>Open API Keys</button>
                      </>
                    )}
                  </div>
                )}
                {provider && hasKey && <div className="agv-hint agv-hint--ok">Key configured ✓</div>}
              </div>
              <div className="agv-field">
                <label className="agv-label" htmlFor="agent-model">Model</label>
                <select
                  id="agent-model"
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
                <div className="agv-hint">{guidance.hint}</div>
              </div>
            </div>
          </div>

          <div className="agv-card">
            <div className="agv-card-head">
              <label className="agv-section-label" htmlFor="agent-prompt">SYSTEM PROMPT</label>
              <span className="agv-card-meta">
                {isCustomPrompt ? `${prompt.length} chars · custom` : 'using default'}
              </span>
            </div>
            <textarea
              id="agent-prompt"
              className="agv-textarea"
              rows={12}
              value={prompt}
              placeholder={agent.defaultPrompt}
              onChange={e => setPrompt(e.target.value)}
            />
            <div className="agv-prompt-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPrompt(agent.defaultPrompt)}
                disabled={!isCustomPrompt}
              >
                Reset to default
              </button>
              <div className="agv-prompt-spacer" />
              {status && (
                <span
                  role="status"
                  className={`agv-status-msg ${status.includes('✓') ? 'agv-status-msg--ok' : 'agv-status-msg--err'}`}
                >
                  {status}
                </span>
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
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
              <span className="agv-section-label">STAGE FACTS</span>
            </div>
            <dl className="agv-spec">
              <div><dt>Reads</dt><dd>{agent.reads}</dd></div>
              <div><dt>Produces</dt><dd>{agent.produces}</dd></div>
              <div><dt>Stage key</dt><dd><code>{agent.id}</code></dd></div>
              <div><dt>AI status</dt><dd>{guidance.label}</dd></div>
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
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="3" cy="7" r="1.3" fill="currentColor" />
    <circle cx="7" cy="7" r="1.3" fill="currentColor" />
    <circle cx="11" cy="7" r="1.3" fill="currentColor" />
  </svg>
);

function PhaseIcon({ kind }) {
  if (kind === 'plan') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4.5h8M9 2.5h6v4H9zM6 5.5H4.5v16h15v-16H18M8 11h8M8 15h8M8 19h5" />
      </svg>
    );
  }
  if (kind === 'author') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 8.5 5.5 12 9 15.5M15 8.5 18.5 12 15 15.5M13.2 6.5l-2.4 11" />
      </svg>
    );
  }
  if (kind === 'execute') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.8 5.1a5 5 0 0 0-6.3 6.3L3.2 16.7a2.9 2.9 0 0 0 4.1 4.1l5.3-5.3a5 5 0 0 0 6.3-6.3l-3 3-3.1-.8-.8-3.1z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 20.5h15M7 17V9.5M12 17V5M17 17v-6" />
    </svg>
  );
}

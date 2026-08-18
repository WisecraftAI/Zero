import { useEffect, useState } from 'react';
import { apiUrl } from '../apiBase';
import './ApiKeysView.css';

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    desc: 'Best free-tier option — get a key at Google AI Studio (no card for basic quota)',
    placeholder: 'AIza…',
    docs: 'https://aistudio.google.com/app/apikey',
    freeTier: true,
  },
  {
    id: 'openai',
    name: 'OpenAI ChatGPT',
    desc: 'Paid API — small trial credits may apply for new accounts',
    placeholder: 'sk-…',
    docs: 'https://platform.openai.com/api-keys',
    freeTier: false,
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    desc: 'Paid API — limited trial credits for new Anthropic accounts',
    placeholder: 'sk-ant-…',
    docs: 'https://console.anthropic.com/settings/keys',
    freeTier: false,
  },
];

const LLM_MODES = [
  {
    id: 'templates',
    title: 'No API key (default)',
    cost: '$0',
    detail: 'BA, Manual QA, Automation, and Manager use built-in templates. Full pipeline completes without any LLM spend.',
  },
  {
    id: 'gemini',
    title: 'Google Gemini free tier',
    cost: 'Free quota',
    detail: 'Save a Gemini key below, then open Agents and pick Gemini + gemini-2.0-flash for each agent you want enriched.',
  },
  {
    id: 'env',
    title: 'Docker / .env keys',
    cost: 'Your plan',
    detail: 'Set ZERO_LLM_ENV_KEYS=1 and GEMINI_API_KEY=… in .env, then restart the stack. See .env.example in the repo.',
  },
];

function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export default function ApiKeysView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});         // { provider: typed-value }
  const [editing, setEditing] = useState({});       // { provider: bool }
  const [saving, setSaving] = useState({});         // { provider: bool }

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/provider-keys'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load.');
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveKey = async (provider) => {
    const key = (drafts[provider] || '').trim();
    if (!key) { setError('Please enter a key before saving.'); return; }
    setSaving(s => ({ ...s, [provider]: true }));
    setError('');
    try {
      const res = await fetch(apiUrl(`/provider-keys/${provider}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setDrafts(d => ({ ...d, [provider]: '' }));
      setEditing(e => ({ ...e, [provider]: false }));
      await load();
    } catch (e) {
      setError(e.message);
    } finally { setSaving(s => ({ ...s, [provider]: false })); }
  };

  const removeKey = async (provider) => {
    if (!window.confirm(`Remove the saved key for ${provider}?`)) return;
    setSaving(s => ({ ...s, [provider]: true }));
    try {
      const res = await fetch(apiUrl(`/provider-keys/${provider}`), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally { setSaving(s => ({ ...s, [provider]: false })); }
  };

  const byId = Object.fromEntries(items.map(i => [i.provider, i]));
  const configuredCount = items.filter(i => i.configured).length;
  const lastUpdated = items
    .map(i => i.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="view api-keys-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">API Keys</h1>
          <p className="view-subtitle">
            Manage provider credentials for AI agents. Keys are encrypted at rest and never logged.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="apk-stats">
        <div className="apk-stat-card">
          <div className="apk-stat-label">Configured</div>
          <div className="apk-stat-value">{String(configuredCount).padStart(2, '0')}<small>/{PROVIDERS.length}</small></div>
          <div className="apk-stat-bar">
            <div
              className="apk-stat-bar-fill"
              style={{ width: `${(configuredCount / PROVIDERS.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="apk-stat-card">
          <div className="apk-stat-label">Encryption</div>
          <div className="apk-stat-value apk-stat-value--small">AES-256-GCM</div>
          <div className="apk-stat-sub">Symmetric, server-side</div>
        </div>
        <div className="apk-stat-card">
          <div className="apk-stat-label">Last Updated</div>
          <div className="apk-stat-value apk-stat-value--small">{fmtDate(lastUpdated)}</div>
          <div className="apk-stat-sub">{lastUpdated ? 'Across all providers' : 'No keys saved yet'}</div>
        </div>
      </div>

      <div className="apk-guide">
        <h2 className="apk-guide-title">LLM options &amp; cost</h2>
        <p className="apk-guide-intro">
          ZERO always runs without keys using templates. Add a key only if you want AI-enriched requirements, test cases, and manager narrative.
          After saving a key here, assign provider + model per agent under <strong>Agents</strong> in the sidebar.
        </p>
        <div className="apk-guide-grid">
          {LLM_MODES.map((m) => (
            <div key={m.id} className="apk-guide-card">
              <div className="apk-guide-card-head">
                <span className="apk-guide-card-title">{m.title}</span>
                <span className="apk-guide-cost">{m.cost}</span>
              </div>
              <p className="apk-guide-card-detail">{m.detail}</p>
            </div>
          ))}
        </div>
        <p className="apk-guide-note">
          Local models (Ollama, LM Studio) are not wired yet — only OpenAI, Claude, and Gemini cloud APIs.
          Cap per run: <code>ZERO_LLM_MAX_USD_PER_RUN</code> (default $0.50). Force templates only: <code>ZERO_LLM=off</code>.
        </p>
      </div>

      {error && <div className="apk-error">{error}</div>}

      {/* Provider list */}
      <div className="apk-list">
        <div className="apk-list-header">
          <span className="apk-col apk-col--name">Provider</span>
          <span className="apk-col apk-col--key">Key</span>
          <span className="apk-col apk-col--updated">Updated</span>
          <span className="apk-col apk-col--actions">Actions</span>
        </div>

        {loading && <div className="apk-loading">Loading providers…</div>}

        {!loading && PROVIDERS.map(p => {
          const item = byId[p.id] || { configured: false };
          const isEditing = !!editing[p.id] || !item.configured;
          return (
            <div key={p.id} className="apk-row">
              <div className="apk-col apk-col--name">
                <div className="apk-provider-name">
                  {p.name}
                  {p.freeTier && <span className="apk-free-badge">free tier</span>}
                </div>
                <div className="apk-provider-desc">{p.desc}</div>
              </div>

              <div className="apk-col apk-col--key">
                {isEditing ? (
                  <input
                    type="password"
                    className="apk-key-input"
                    placeholder={p.placeholder}
                    value={drafts[p.id] || ''}
                    onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                    autoComplete="off"
                  />
                ) : (
                  <div className="apk-key-value">
                    <span className="apk-key-mask">••••••••••••</span>
                    <span className="apk-key-tail">{item.last4 || ''}</span>
                    <span className={`apk-status apk-status--${item.configured ? 'ok' : 'pending'}`}>
                      {item.configured ? 'Configured' : 'Not set'}
                    </span>
                  </div>
                )}
              </div>

              <div className="apk-col apk-col--updated">
                {fmtDate(item.updatedAt)}
              </div>

              <div className="apk-col apk-col--actions">
                {isEditing ? (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={saving[p.id]}
                      onClick={() => saveKey(p.id)}
                    >
                      {saving[p.id] ? 'Saving…' : 'Save'}
                    </button>
                    {item.configured && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditing(e => ({ ...e, [p.id]: false }));
                          setDrafts(d => ({ ...d, [p.id]: '' }));
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditing(e => ({ ...e, [p.id]: true }))}
                    >
                      Replace
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={saving[p.id]}
                      onClick={() => removeKey(p.id)}
                    >
                      Remove
                    </button>
                  </>
                )}
                <a className="apk-docs-link" href={p.docs} target="_blank" rel="noreferrer">Docs ↗</a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advisory */}
      <div className="apk-advisory">
        <div className="apk-advisory-title">Keep your keys safe</div>
        <p className="apk-advisory-text">
          Your keys carry the same privilege as your account on the provider. They are encrypted with
          AES-256-GCM before being stored and are never returned in plaintext after saving.
        </p>
        <ul className="apk-advisory-list">
          <li>Rotate keys every 90 days.</li>
          <li>Use environment-specific keys (don't reuse production tokens for dev).</li>
          <li>Revoke unused keys from the provider's console.</li>
        </ul>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import './DashboardView.scss';
import { apiUrl } from '../apiBase';
import AiSetupBanner from '../components/AiSetupBanner';
import { applyGeminiToAllAgents, countActiveAgents } from '../lib/aiSetup';
import { computeRunProgress, formatDuration, runElapsedMs } from '../lib/runProgress';
import { isLiveRunStatus } from '../lib/runControl';
import StopRunButton from '../components/StopRunButton';

function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(ts).slice(0, 16); }
}

function truncate(str, n = 40) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function computeStats(runs) {
  const total     = runs.length;
  const completed = runs.filter(r => r.status === 'completed').length;
  const running   = runs.filter(r => r.status === 'running').length;
  const failed    = runs.filter(r => r.status === 'failed').length;
  const rates = runs
    .filter(r => r.status === 'completed')
    .map(r => parseFloat(r.artifacts?.managerReport?.executiveSummary?.passRate || r.artifacts?.executionReport?.totals?.passRate || '0'))
    .filter(n => !isNaN(n) && n > 0);
  const avgPass = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  return { total, completed, running, failed, avgPass };
}

export default function DashboardView({ runs, loading, onOpenRun, onNewRun, onNavigate, onStopRun }) {
  const recent = [...runs].slice(0, 6);
  const st = computeStats(runs);
  const activeRun = runs.find(r => isLiveRunStatus(r.status));
  const [, setTick] = useState(0);
  const [aiKeys, setAiKeys] = useState({});
  const [aiSettings, setAiSettings] = useState({});
  const [aiLoading, setAiLoading] = useState(true);
  const [enablingAi, setEnablingAi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentsRes, keysRes] = await Promise.all([
          fetch(apiUrl('/agent-settings')).then(r => r.json()),
          fetch(apiUrl('/provider-keys')).then(r => r.json()),
        ]);
        if (cancelled) return;
        const byAgent = {};
        for (const i of agentsRes.items || []) byAgent[i.agent] = i;
        const byProvider = {};
        for (const i of keysRes.items || []) byProvider[i.provider] = i.configured;
        setAiSettings(byAgent);
        setAiKeys(byProvider);
      } catch {
        /* banner is optional */
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeAgentCount = countActiveAgents(aiSettings, aiKeys);

  useEffect(() => {
    if (!activeRun) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [activeRun?.id]);

  return (
    <div className="view dash-view">

      {/* Hero strip */}
      {activeRun ? (
        <div className={`dash-hero dash-hero--active${activeRun.status === 'stopping' ? ' dash-hero--stopping' : ''}`} onClick={() => onOpenRun(activeRun.id || activeRun.runId)}>
          <div className="dash-hero-left">
            <div className="dash-hero-eyebrow">
              <span className={`dash-live-dot${activeRun.status === 'stopping' ? ' dash-live-dot--stopping' : ''}`} />
              <span className="dash-live-label">
                {activeRun.status === 'stopping'
                  ? `STOPPING · ${formatDuration(runElapsedMs(activeRun))}`
                  : `LIVE · ${formatDuration(runElapsedMs(activeRun))}`}
              </span>
            </div>
            <div className="dash-hero-url">{truncate(activeRun.input?.ottUrl || activeRun.url, 60)}</div>
            <div className="dash-hero-id">
              <code>{String(activeRun.id || activeRun.runId || '').slice(0, 20)}</code>
              <span className={`chip ${activeRun.status}`} style={{ marginLeft: 8 }}>{activeRun.status}</span>
              {(() => {
                const p = computeRunProgress(activeRun);
                return p.currentLabel ? (
                  <span className="dash-hero-stage" style={{ marginLeft: 8 }}>
                    {p.currentLabel} · {p.percent}%
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          <div className="dash-hero-right">
            <StopRunButton run={activeRun} onStop={onStopRun} />
            <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onOpenRun(activeRun.id || activeRun.runId); }}>
              View Run →
            </button>
          </div>
        </div>
      ) : (
        <div className="dash-hero dash-hero--idle">
          <div className="dash-hero-left">
            <div className="dash-hero-eyebrow">
              <span className="dash-idle-dot" />
              <span className="dash-idle-label">ZERO — AI QA Orchestration Platform</span>
            </div>
            <div className="dash-hero-headline">All pipelines idle</div>
            <div className="dash-hero-sub">Launch a new run to start the AI agent pipeline</div>
          </div>
          <div className="dash-hero-right">
            <button className="btn btn-primary" onClick={onNewRun}>
              <PlusIcon /> New Run
            </button>
          </div>
        </div>
      )}

      {!aiLoading && onNavigate && (
        <AiSetupBanner
          variant="dashboard"
          geminiConfigured={!!aiKeys.gemini}
          activeCount={activeAgentCount}
          onGoApiKeys={() => onNavigate('apikeys')}
          onGoAgents={() => onNavigate('agents')}
          onEnableGemini={aiKeys.gemini ? async () => {
            setEnablingAi(true);
            try {
              await applyGeminiToAllAgents(apiUrl);
              const agentsRes = await fetch(apiUrl('/agent-settings')).then(r => r.json());
              const byAgent = {};
              for (const i of agentsRes.items || []) byAgent[i.agent] = i;
              setAiSettings(byAgent);
            } finally {
              setEnablingAi(false);
            }
          } : undefined}
          enabling={enablingAi}
        />
      )}

      {/* Stats row */}
      <div className="stats-grid" style={{ marginTop: 20 }}>
        <StatCard label="Total Runs" value={st.total} />
        <StatCard label="Completed"  value={st.completed} color="green" />
        <StatCard label="Failed"     value={st.failed}    color="red" />
        <StatCard label="Avg Pass Rate" value={st.avgPass !== null ? `${st.avgPass}%` : '—'} color={st.avgPass >= 80 ? 'green' : st.avgPass >= 50 ? 'amber' : 'default'} />
      </div>

      {/* Execution history */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="card-header-title">Execution History</span>
          <span className="card-header-count">{runs.length}</span>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-primary btn-sm" onClick={onNewRun}>
              <PlusIcon /> New Run
            </button>
          </div>
        </div>

        {loading && recent.length === 0 ? (
          <div className="empty-state">
            <SpinIcon />
            <p>Loading runs…</p>
          </div>
        ) : recent.length === 0 ? (
          <div className="empty-state">
            <EmptyIcon />
            <h3>No runs yet</h3>
            <p>Start your first QA pipeline to see results here.</p>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onNewRun}>
              <PlusIcon /> Start First Run
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Target URL</th>
                <th>Status</th>
                <th>Pass Rate</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map(run => {
                const id = run.id || run.runId || '';
                const passRate = run.artifacts?.managerReport?.executiveSummary?.passRate
                  || run.artifacts?.executionReport?.totals?.passRate
                  || null;
                return (
                  <tr key={id} style={{ cursor: 'pointer' }} onClick={() => onOpenRun(id)}>
                    <td>
                      <code className="run-id-mono">{id.slice(0, 12)}…</code>
                    </td>
                    <td className="dash-url-cell">
                      <span title={run.input?.ottUrl}>{truncate(run.input?.ottUrl || run.url, 44)}</span>
                    </td>
                    <td><span className={`chip ${run.status}`}>{run.status}</span></td>
                    <td className="dash-passrate-cell">{passRate || '—'}</td>
                    <td className="dash-date-cell">{fmtDate(run.startedAt || run.createdAt)}</td>
                    <td>
                      <div className="dash-row-actions">
                        <StopRunButton run={run} onStop={onStopRun} className="dash-stop-btn" />
                        <button
                          className="btn btn-ghost btn-sm dash-view-btn"
                          onClick={(e) => { e.stopPropagation(); onOpenRun(id); }}
                        >
                          View →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Capability cards */}
      <div className="dash-capabilities">
        <CapabilityCard
          icon={<PipelineIcon />}
          title="7-Stage AI Pipeline"
          desc="BA → Manual QA → Automation → Execution → Manager. From URL to report in minutes."
        />
        <CapabilityCard
          icon={<LocatorIcon />}
          title="Locator Intelligence"
          desc="Selectors are learned and stored across runs, making automation smarter over time."
        />
        <CapabilityCard
          icon={<ReportIcon />}
          title="Go / No-Go Reports"
          desc="Manager agent generates executive verdicts with RCA analysis and risk summaries."
        />
      </div>

    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${color ? ` stat-value--${color}` : ''}`}>{value ?? '—'}</div>
    </div>
  );
}

function CapabilityCard({ icon, title, desc }) {
  return (
    <div className="dash-cap-card">
      <div className="dash-cap-icon">{icon}</div>
      <div>
        <div className="dash-cap-title">{title}</div>
        <div className="dash-cap-desc">{desc}</div>
      </div>
    </div>
  );
}

/* Icons */
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const EmptyIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <rect x="6" y="6" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 3" />
    <path d="M13 18h10M18 13v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const SpinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: 'dash-spin 1s linear infinite' }}>
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="36 18" />
  </svg>
);
const PipelineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="3" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="15" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 9h2M11 9h2" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const LocatorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M9 1.5v4M9 12.5v4M1.5 9h4M12.5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const ReportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4 3h7l4 4v8H4V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M11 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M7 10h5M7 12.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

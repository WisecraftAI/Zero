import { useState, useEffect } from 'react';
import './DashboardView.scss';
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

export default function DashboardView({ runs, loading, onOpenRun, onNewRun, onStopRun }) {
  const recent = [...runs].slice(0, 6);
  const st = computeStats(runs);
  const activeRun = runs.find(r => isLiveRunStatus(r.status));
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!activeRun) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [activeRun?.id]);

  return (
    <div className="view dash-view">

      {/* Active pipeline status */}
      {activeRun && (
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

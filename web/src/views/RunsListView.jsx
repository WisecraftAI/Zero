import { useState } from 'react';
import './RunsListView.css';

function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(ts).slice(0, 16); }
}

function truncate(str, n = 48) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

const STATUS_OPTIONS = ['all', 'running', 'completed', 'failed', 'pending'];

export default function RunsListView({ runs, loading, onOpenRun, onRefresh, onNewRun }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = runs.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const id = (r.id || r.runId || '').toLowerCase();
      const url = (r.input?.ottUrl || r.url || '').toLowerCase();
      if (!id.includes(q) && !url.includes(q)) return false;
    }
    return true;
  });

  const total     = runs.length;
  const completed = runs.filter(r => r.status === 'completed').length;
  const running   = runs.filter(r => r.status === 'running').length;
  const failed    = runs.filter(r => r.status === 'failed').length;

  return (
    <div className="view runs-list-view">

      {/* Stats row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value stat-value--green">{completed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Running</div>
          <div className={`stat-value${running > 0 ? ' stat-value--accent' : ''}`}>{running}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className={`stat-value${failed > 0 ? ' stat-value--red' : ''}`}>{failed}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="runs-filter-bar">
        <div className="runs-filter-left">
          <div className="runs-search-wrap">
            <SearchIcon />
            <input
              className="runs-search"
              type="text"
              placeholder="Search by ID or URL…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="runs-status-filters">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                className={`runs-filter-chip${statusFilter === s ? ' runs-filter-chip--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
        <div className="runs-filter-right">
          <button className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={loading}>
            <RefreshIcon spin={loading} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNewRun}>
            <PlusIcon /> New Run
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading && runs.length === 0 ? (
          <div className="empty-state">
            <LoadingIcon />
            <p>Loading runs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <EmptyRunsIcon />
            <h3>{runs.length === 0 ? 'No runs yet' : 'No runs match filter'}</h3>
            <p>{runs.length === 0
              ? 'Start a pipeline from New Run to see results here.'
              : 'Try changing the status filter or search query.'}
            </p>
          </div>
        ) : (
          <table className="data-table runs-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Target URL</th>
                <th>Status</th>
                <th>Pass Rate</th>
                <th>Verdict</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(run => {
                const id = run.id || run.runId || '';
                const passRate = run.artifacts?.managerReport?.executiveSummary?.passRate
                  || run.artifacts?.executionReport?.totals?.passRate
                  || null;
                const verdict = run.artifacts?.managerReport?.executiveSummary?.verdict || '';
                const verdictKey = verdict.toLowerCase() === 'go' ? 'go'
                  : verdict.toLowerCase().includes('conditional') ? 'conditional'
                  : verdict ? 'hold' : '';

                return (
                  <tr key={id} className="run-row" onClick={() => onOpenRun(id)}>
                    <td>
                      <code className="run-id-chip">{id.slice(0, 12)}…</code>
                    </td>
                    <td className="run-url-cell">
                      <span title={run.input?.ottUrl}>{truncate(run.input?.ottUrl || run.url)}</span>
                    </td>
                    <td><span className={`chip ${run.status}`}>{run.status}</span></td>
                    <td>
                      {passRate
                        ? <span className="runs-pass-rate">{passRate}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {verdict
                        ? <span className={`verdict ${verdictKey}`}>{verdict}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="run-date">{fmtDate(run.startedAt || run.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm runs-view-btn" onClick={(e) => { e.stopPropagation(); onOpenRun(id); }}>
                        View →
                      </button>
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

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8.5 8.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const RefreshIcon = ({ spin }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    style={{ animation: spin ? 'runs-spin 0.8s linear infinite' : 'none' }}>
    <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.8 1.2L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8.5 1.5v2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const EmptyRunsIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <rect x="5" y="9" width="26" height="20" rx="3" stroke="currentColor" strokeWidth="1.3" />
    <path d="M11 17h14M11 22h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M18 5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const LoadingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    style={{ animation: 'runs-spin 0.9s linear infinite' }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="38 20" />
  </svg>
);

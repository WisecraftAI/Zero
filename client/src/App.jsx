import { useState, useEffect, useCallback } from 'react';
import AppShell from './layouts/AppShell';
import DashboardView from './views/DashboardView';
import RunsListView from './views/RunsListView';
import NewRunView from './views/NewRunView';
import RunDetailView from './views/RunDetailView';
import LocatorsView from './views/LocatorsView';
import ApiKeysView from './views/ApiKeysView';
import AgentsView from './views/AgentsView';
import IntegrationsView from './views/IntegrationsView';
import AuthView from './views/AuthView';
import './App.css';

const AUTH_TOKEN_KEY = 'zero-auth-token';

/* Topbar config per view */
function getTopbarProps(view, run) {
  switch (view) {
    case 'dashboard':
      return { title: 'Dashboard', statusBadge: 'System Live' };
    case 'runs':
      return { breadcrumb: ['ZERO', 'Runs'], statusBadge: 'System Stable' };
    case 'new-run':
      return { breadcrumb: ['ZERO', 'Create New Run', 'Step 01'] };
    case 'run-detail': {
      const name = run?.input?.ottUrl
        ? run.input.ottUrl.replace(/^https?:\/\//, '').slice(0, 40)
        : 'Loading…';
      return {
        breadcrumb: ['Runs', name],
        statusBadge: run?.status === 'running' ? 'Running' : undefined,
      };
    }
    case 'locators':
      return { breadcrumb: ['ZERO', 'Locator Intelligence'] };
    case 'apikeys':
      return { breadcrumb: ['ZERO', 'API Keys'] };
    case 'agents':
      return { breadcrumb: ['ZERO', 'Agents'] };
    case 'integrations':
      return { breadcrumb: ['ZERO', 'Integrations'] };
    default:
      return { title: 'ZERO' };
  }
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }

    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        setAuthUser(data.user || null);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const navigate = useCallback((to, runId = null) => {
    setView(to);
    if (runId !== null) { setActiveRunId(runId); setActiveRun(null); }
  }, []);

  const fetchRun = useCallback(async () => {
    if (!activeRunId) return;
    try {
      const res = await fetch(`/api/runs/${activeRunId}`);
      if (!res.ok) return;
      setActiveRun(await res.json());
    } catch {}
  }, [activeRunId]);

  useEffect(() => {
    if (!activeRunId) return;
    if (activeRun?.status === 'completed' || activeRun?.status === 'failed') return;
    const t = setInterval(fetchRun, 1500);
    fetchRun();
    return () => clearInterval(t);
  }, [activeRunId, activeRun?.status, fetchRun]);

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const res = await fetch('/api/runs');
      if (!res.ok) return;
      const d = await res.json();
      setRuns(Array.isArray(d) ? d : d.runs || []);
    } catch {} finally { setRunsLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleStartRun = async (formData) => {
    const res = await fetch('/api/runs', { method: 'POST', body: formData });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || 'Failed to start pipeline');
    }
    const { runId: id } = await res.json();
    setActiveRunId(id);
    setActiveRun(null);
    navigate('run-detail', id);
    fetchRuns();
  };

  const handleRerunFailed = async () => {
    if (!activeRunId) return;
    await fetch(`/api/runs/${activeRunId}/rerun-failed`, { method: 'POST' });
    setActiveRun(null);
    fetchRun();
  };

  const openRun = useCallback((runId) => {
    setActiveRunId(runId);
    setActiveRun(null);
    setView('run-detail');
  }, []);

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <DashboardView runs={runs} loading={runsLoading} onOpenRun={openRun} onNewRun={() => navigate('new-run')} />;
      case 'runs':
        return <RunsListView runs={runs} loading={runsLoading} onOpenRun={openRun} onRefresh={fetchRuns} onNewRun={() => navigate('new-run')} />;
      case 'new-run':
        return <NewRunView onSubmit={handleStartRun} />;
      case 'run-detail':
        return <RunDetailView run={activeRun} runId={activeRunId} onRerunFailed={handleRerunFailed} onBack={() => navigate('runs')} />;
      case 'locators':
        return <LocatorsView />;
      case 'apikeys':
        return <ApiKeysView />;
      case 'agents':
        return <AgentsView />;
      case 'integrations':
        return <IntegrationsView />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return <div className="app-loading">Checking session...</div>;
  }

  if (!authUser) {
    return <AuthView onAuthenticated={setAuthUser} />;
  }

  return (
    <AppShell
      activeView={view}
      onNavigate={navigate}
      topbarProps={{
        ...getTopbarProps(view, activeRun),
        actions: (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              localStorage.removeItem(AUTH_TOKEN_KEY);
              setAuthUser(null);
            }}
          >
            Logout {authUser?.name || authUser?.email}
          </button>
        ),
      }}
    >
      {renderView()}
    </AppShell>
  );
}

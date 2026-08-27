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
import { apiUrl } from './apiBase';
import { mergeRunStreamState } from './data/runStream';
import { runElapsedMs, formatDuration } from './lib/runProgress';
import { isLiveRunStatus, isTerminalRunStatus } from './lib/runControl';
import { useRunStream } from './data/useRunStream';
import './App.scss';

/* Topbar config per view */
function getTopbarProps(view, run, streamTransport, clockTick = 0) {
  void clockTick;
  switch (view) {
    case 'dashboard':
      return { title: 'Dashboard', statusBadge: 'System Live' };
    case 'runs':
      return { breadcrumb: ['ZERO', 'Runs'], statusBadge: 'System Stable' };
      case 'new-run':
        return { title: 'New Run' };
    case 'run-detail': {
      const name = run?.input?.ottUrl
        ? run.input.ottUrl.replace(/^https?:\/\//, '').slice(0, 40)
        : 'Loading…';
      const elapsed =
        isLiveRunStatus(run?.status) && run?.createdAt
          ? formatDuration(runElapsedMs(run))
          : null;
      const liveBadge =
        streamTransport === 'sse'
          ? 'Live (SSE)'
          : streamTransport === 'poll'
            ? 'Live (poll fallback)'
            : run?.status === 'stopping'
              ? 'Stopping'
              : run?.status === 'running'
                ? 'Running'
                : undefined;
      return {
        breadcrumb: ['Runs', name],
        statusBadge: liveBadge && elapsed ? `${liveBadge} · ${elapsed}` : liveBadge
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
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (view !== 'run-detail' || !isLiveRunStatus(activeRun?.status)) return undefined;
    const t = setInterval(() => setClock((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [view, activeRun?.status, activeRunId]);

  const navigate = useCallback((to, runId = null) => {
    setView(to);
    if (runId !== null) { setActiveRunId(runId); setActiveRun(null); }
  }, []);

  const fetchRun = useCallback(async () => {
    if (!activeRunId) return null;
    try {
      const res = await fetch(apiUrl(`/runs/${activeRunId}`));
      if (!res.ok) return null;
      const data = await res.json();
      setActiveRun(data);
      return data;
    } catch {
      return null;
    }
  }, [activeRunId]);

  const runTerminal = isTerminalRunStatus(activeRun?.status);

  useEffect(() => {
    if (!activeRunId) return;
    fetchRun();
  }, [activeRunId, fetchRun]);

  const handleStreamPatch = useCallback((patch) => {
    setActiveRun((prev) => mergeRunStreamState(prev, patch));
  }, []);

  const handleStreamRefresh = useCallback(() => {
    fetchRun();
  }, [fetchRun]);

  const { transport: streamTransport } = useRunStream(activeRunId, {
    enabled: view === 'run-detail' && Boolean(activeRunId),
    terminal: runTerminal,
    onPatch: handleStreamPatch,
    onRefresh: handleStreamRefresh
  });

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const res = await fetch(apiUrl('/runs'));
      if (!res.ok) return;
      const d = await res.json();
      setRuns(Array.isArray(d) ? d : d.runs || []);
    } catch {} finally { setRunsLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Keep dashboard / runs list fresh while a pipeline is active.
  useEffect(() => {
    const active =
      runs.some((r) => isLiveRunStatus(r.status)) || isLiveRunStatus(activeRun?.status);
    if (!active) return undefined;
    const t = setInterval(fetchRuns, 4000);
    return () => clearInterval(t);
  }, [runs, activeRun?.status, fetchRuns]);

  const handleStartRun = async (formData) => {
    const res = await fetch(apiUrl('/runs'), { method: 'POST', body: formData });
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

  const handleStopRun = async (runId) => {
    if (!runId) return;
    setRuns((prev) => prev.map((r) => (
      (r.id === runId || r.runId === runId) ? { ...r, status: 'stopping' } : r
    )));
    setActiveRun((prev) => (prev && (prev.id === runId || prev.runId === runId)
      ? { ...prev, status: 'stopping' }
      : prev));
    try {
      const res = await fetch(apiUrl(`/runs/${runId}/stop`), { method: 'POST' });
      if (!res.ok) {
        fetchRuns();
        if (activeRunId === runId) fetchRun();
        return;
      }
    } catch {
      fetchRuns();
      if (activeRunId === runId) fetchRun();
      return;
    }
    fetchRuns();
    if (activeRunId === runId) fetchRun();
  };

  const handleRerunFailed = async () => {
    if (!activeRunId) return;
    await fetch(apiUrl(`/runs/${activeRunId}/rerun-failed`), { method: 'POST' });
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
        return (
          <DashboardView
            runs={runs}
            loading={runsLoading}
            onOpenRun={openRun}
            onNewRun={() => navigate('new-run')}
            onNavigate={navigate}
            onStopRun={handleStopRun}
          />
        );
      case 'runs':
        return <RunsListView runs={runs} loading={runsLoading} onOpenRun={openRun} onRefresh={fetchRuns} onNewRun={() => navigate('new-run')} onStopRun={handleStopRun} />;
      case 'new-run':
        return <NewRunView onSubmit={handleStartRun} />;
      case 'run-detail':
        return <RunDetailView run={activeRun} runId={activeRunId} onRerunFailed={handleRerunFailed} onStopRun={handleStopRun} onBack={() => navigate('runs')} streamTransport={streamTransport} />;
      case 'locators':
        return <LocatorsView />;
      case 'apikeys':
        return <ApiKeysView />;
      case 'agents':
        return <AgentsView onNavigate={navigate} />;
      case 'integrations':
        return <IntegrationsView />;
      default:
        return null;
    }
  };

  return (
    <AppShell
      activeView={view}
      onNavigate={navigate}
      topbarProps={getTopbarProps(view, activeRun, streamTransport, clock)}
    >
      {renderView()}
    </AppShell>
  );
}

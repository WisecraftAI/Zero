import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import AppShell from './layouts/AppShell';
import { currentRoute, pathForRoute, routeForPath } from './lib/routes';
import './App.scss';

const AgentsView = lazy(() => import('./views/AgentsView'));
const ApiKeysView = lazy(() => import('./views/ApiKeysView'));
const DashboardView = lazy(() => import('./views/DashboardView'));
const IntegrationsView = lazy(() => import('./views/IntegrationsView'));
const LocatorsView = lazy(() => import('./views/LocatorsView'));
const MarketingHomeView = lazy(() => import('./views/MarketingHomeView'));
const NewRunView = lazy(() => import('./views/NewRunView'));
const RunDetailView = lazy(() => import('./views/RunDetailView'));
const RunsListView = lazy(() => import('./views/RunsListView'));

function getTopbarProps(view) {
  switch (view) {
    case 'home':
      return { title: 'Home' };
    case 'dashboard':
      return { title: 'Dashboard', statusBadge: 'System Live' };
    case 'runs':
      return { breadcrumb: ['ZERO', 'Runs'], statusBadge: 'System Stable' };
    case 'new-run':
      return { title: 'New Run' };
    case 'run-detail':
      return { breadcrumb: ['Runs', 'Run detail'] };
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
  const [route, setRoute] = useState(currentRoute);
  const { view, runId: activeRunId, tab: activeTab } = route;
  const routeRef = useRef(route);
  const urlSynced = useRef(false);
  // Tab auto-selection replaces the entry so back/forward only walk operator clicks.
  const historyMode = useRef('push');

  const navigate = useCallback((to, runId = null, tab = null) => {
    setRoute((prev) => ({
      view: to,
      runId: runId !== null ? runId : prev.runId,
      tab: to === 'run-detail' ? tab : null
    }));
  }, []);

  const selectRunTab = useCallback((tab, { replace = false } = {}) => {
    setRoute((prev) => {
      if (prev.view !== 'run-detail' || prev.tab === tab) return prev;
      if (replace) historyMode.current = 'replace';
      return { ...prev, tab };
    });
  }, []);

  // Mirror the active view in the address bar so runs are linkable and the
  // browser's back/forward buttons walk the same path the operator clicked.
  useEffect(() => {
    routeRef.current = route;
    const target = pathForRoute(route.view, route.runId, route.tab);
    // The first sync only canonicalises an unknown entry path — no new entry.
    const mode = urlSynced.current ? historyMode.current : 'replace';
    historyMode.current = 'push';
    urlSynced.current = true;
    if (window.location.pathname === target) return;
    window.history[mode === 'replace' ? 'replaceState' : 'pushState'](route, '', target);
  }, [route]);

  useEffect(() => {
    const onPopState = () => {
      const next = routeForPath(window.location.pathname);
      const prev = routeRef.current;
      if (prev.view === next.view && prev.runId === next.runId && prev.tab === next.tab) return;
      setRoute(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openRun = useCallback((runId) => {
    navigate('run-detail', runId);
  }, [navigate]);

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <MarketingHomeView
            onNewRun={() => navigate('new-run')}
            onDashboard={() => navigate('dashboard')}
            onNavigate={navigate}
          />
        );
      case 'dashboard':
        return (
          <DashboardView
            onOpenRun={openRun}
            onNewRun={() => navigate('new-run')}
          />
        );
      case 'runs':
        return <RunsListView onOpenRun={openRun} onNewRun={() => navigate('new-run')} />;
      case 'new-run':
        return <NewRunView onCreated={(id) => navigate('run-detail', id)} />;
      case 'run-detail':
        return (
          <RunDetailView
            runId={activeRunId}
            activeTab={activeTab}
            onTabChange={selectRunTab}
            onBack={() => navigate('runs')}
          />
        );
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
      topbarProps={getTopbarProps(view)}
    >
      {renderView()}
    </AppShell>
  );
}

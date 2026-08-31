import { Suspense } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import ErrorBoundary from '../components/ErrorBoundary';
import './AppShell.scss';

export default function AppShell({ children, activeView, onNavigate, topbarProps }) {
  return (
    <div className="app-shell">
      <a className="skip-to-content" href="#main-content">Skip to content</a>
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <div className="app-body">
        <Topbar {...(topbarProps || {})} />
        <main className="app-main" id="main-content">
          <ErrorBoundary key={activeView}>
            <Suspense fallback={<div className="empty-state" role="status">Loading view…</div>}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

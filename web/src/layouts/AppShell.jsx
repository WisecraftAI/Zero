import { Suspense, useCallback, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import ErrorBoundary from '../components/ErrorBoundary';
import './AppShell.scss';

export default function AppShell({ children, activeView, onNavigate, topbarProps }) {
  // Below the tablet breakpoint the sidebar is an overlay drawer. It used to
  // open on :hover only, which no touch device can produce — the nav was
  // unreachable on phones. The shell owns the state so the Topbar trigger and
  // the drawer stay in sync.
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((open) => !open), []);

  const navigate = useCallback((...args) => {
    setNavOpen(false);
    onNavigate(...args);
  }, [onNavigate]);

  // Lock the page behind the drawer and let Escape dismiss it.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.body.classList.add('nav-open');
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('nav-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  return (
    <div className={`app-shell ${navOpen ? 'app-shell--nav-open' : ''}`}>
      <a className="skip-to-content" href="#main-content">Skip to content</a>
      <Sidebar activeView={activeView} onNavigate={navigate} open={navOpen} onClose={closeNav} />
      <button
        type="button"
        className="app-scrim"
        onClick={closeNav}
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="app-body">
        <Topbar {...(topbarProps || {})} navOpen={navOpen} onToggleNav={toggleNav} />
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

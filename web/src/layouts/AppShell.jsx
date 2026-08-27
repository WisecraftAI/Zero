import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './AppShell.scss';

export default function AppShell({ children, activeView, onNavigate, topbarProps }) {
  return (
    <div className="app-shell">
      <a className="skip-to-content" href="#main-content">Skip to content</a>
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <div className="app-body">
        <Topbar {...(topbarProps || {})} />
        <main className="app-main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

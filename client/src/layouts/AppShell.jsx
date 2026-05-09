import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './AppShell.css';

export default function AppShell({ children, activeView, onNavigate, topbarProps }) {
  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <div className="app-body">
        <Topbar {...(topbarProps || {})} />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}

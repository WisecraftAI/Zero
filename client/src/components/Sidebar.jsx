import './Sidebar.css';

/* ── Icons (inline SVG, 16×16 viewport) ─────────────────── */
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" fill="currentColor" opacity=".9"/>
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" fill="currentColor" opacity=".9"/>
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" opacity=".9"/>
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" opacity=".9"/>
    </svg>
  ),
  runs: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M6 5.5l5 2.5-5 2.5V5.5z" fill="currentColor"/>
    </svg>
  ),
  pipelines: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="3" height="8" rx="1" fill="currentColor" opacity=".7"/>
      <rect x="6" y="2" width="3" height="12" rx="1" fill="currentColor"/>
      <rect x="11" y="5" width="3" height="7" rx="1" fill="currentColor" opacity=".7"/>
    </svg>
  ),
  agents: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="2.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="13.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5.5 8.5h5M5.5 11h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  integrations: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  apikeys: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9 8h5.5M11.5 6.5V8M13.5 6.5V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="10.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 13c0-2.2 1.79-4 4-4h5c2.21 0 4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  newRun: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  locators: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <ellipse cx="8" cy="8" rx="7" ry="3.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3"/>
      <ellipse cx="8" cy="8" rx="7" ry="7" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: 'dashboard',   icon: 'dashboard',    title: 'Dashboard' },
  { id: 'runs',        icon: 'runs',         title: 'Runs' },
  { id: 'pipelines',   icon: 'pipelines',    title: 'Pipelines',    soon: true },
  { id: 'agents',      icon: 'agents',       title: 'Agents',       soon: true },
  null, // divider
  { id: 'reports',     icon: 'reports',      title: 'Reports',      soon: true },
  { id: 'integrations',icon: 'integrations', title: 'Integrations', soon: true },
  { id: 'apikeys',     icon: 'apikeys',      title: 'API Keys',     soon: true },
  { id: 'team',        icon: 'team',         title: 'Team',         soon: true },
];

export default function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="sidebar">
      {/* Z Logo */}
      <button className="sidebar-logo" onClick={() => onNavigate('dashboard')} title="ZERO — AI QA Platform">
        <span className="sidebar-z">Z</span>
      </button>

      {/* New Run CTA */}
      <button
        className={`nav-item nav-item--cta ${activeView === 'new-run' ? 'nav-item--active' : ''}`}
        onClick={() => onNavigate('new-run')}
        title="New Run"
      >
        {Icons.newRun}
      </button>

      {/* Main nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, i) =>
          item === null
            ? <div key={`div-${i}`} className="sidebar-divider" />
            : (
              <button
                key={item.id}
                className={`nav-item ${activeView === item.id ? 'nav-item--active' : ''} ${item.soon ? 'nav-item--soon' : ''}`}
                onClick={() => !item.soon && onNavigate(item.id)}
                title={item.title + (item.soon ? ' (coming soon)' : '')}
                disabled={item.soon}
              >
                {Icons[item.icon]}
              </button>
            )
        )}
      </nav>

      <div className="sidebar-spacer" />

      {/* Locators */}
      <button
        className={`nav-item ${activeView === 'locators' ? 'nav-item--active' : ''}`}
        onClick={() => onNavigate('locators')}
        title="Locator Intelligence"
      >
        {Icons.locators}
      </button>

      {/* Settings */}
      <button
        className="nav-item nav-item--soon"
        title="Settings (coming soon)"
        disabled
      >
        {Icons.settings}
      </button>

      {/* Avatar placeholder */}
      <div className="sidebar-avatar" title="Alex Rivera — Lead QA Engineer">
        <span>A</span>
      </div>
    </aside>
  );
}

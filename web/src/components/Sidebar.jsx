import { useState } from 'react';
import ThemePicker from './ThemePicker';
import { ZeroMark, ZeroWordmark } from './ZeroLogo';
import './Sidebar.scss';

/* ── Icons (inline SVG, 16×16 viewport) ─────────────────── */
const Icons = {
  home: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 7.2 8 2l6 5.2V14H9.8v-4H6.2v4H2V7.2z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/>
    </svg>
  ),
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
      <path d="M2.9 3.35a1 1 0 0 1 1.53-.85l5.35 3.5a1 1 0 0 1 0 1.68l-5.35 3.5a1 1 0 0 1-1.53-.85V3.35z" fill="currentColor"/>
      <path d="M12.4 9.3v4.2M10.3 11.4h4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  locators: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <ellipse cx="8" cy="8" rx="7" ry="3.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3"/>
      <ellipse cx="8" cy="8" rx="7" ry="7" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  menu: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: 'home',        icon: 'home',         title: 'Home' },
  { id: 'new-run',     icon: 'newRun',       title: 'New Run',      cta: true },
  { id: 'dashboard',   icon: 'dashboard',    title: 'Dashboard' },
  { id: 'runs',        icon: 'runs',         title: 'Runs' },
  { id: 'pipelines',   icon: 'pipelines',    title: 'Pipelines',    soon: true },
  { id: 'agents',      icon: 'agents',       title: 'Agents' },
  null, // divider
  { id: 'reports',     icon: 'reports',      title: 'Reports',      soon: true },
  { id: 'integrations',icon: 'integrations', title: 'Integrations' },
  { id: 'apikeys',     icon: 'apikeys',      title: 'API Keys' },
  { id: 'team',        icon: 'team',         title: 'Team',         soon: true },
];

export default function Sidebar({ activeView, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className={`sidebar ${isExpanded ? 'sidebar--expanded' : ''}`}>
      {/* Brand mark (always top left) */}
      <div className="sidebar-head">
        <button className="sidebar-logo" onClick={() => onNavigate('home')} title="ZERO Home" aria-label="ZERO — go to home">
          <ZeroMark size={32} />
          <ZeroWordmark size={22} className="sidebar-brand-text" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_ITEMS.map((item, i) =>
          item === null
            ? <div key={`div-${i}`} className="sidebar-divider" />
            : (
              <button
                key={item.id}
                className={`nav-item ${activeView === item.id ? 'nav-item--active' : ''} ${item.soon ? 'nav-item--soon' : ''} ${item.cta ? 'nav-item--cta' : ''}`}
                onClick={() => !item.soon && onNavigate(item.id)}
                title={isExpanded ? undefined : (item.title + (item.soon ? ' (soon)' : ''))}
                disabled={item.soon}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <span className="nav-icon">{Icons[item.icon]}</span>
                <span className="nav-label">{item.title}</span>
                {item.soon && <span className="nav-badge">Soon</span>}
              </button>
            )
        )}
      </nav>

      <div className="sidebar-spacer" />

      {/* Footer actions */}
      <div className="sidebar-foot">
        {/* Locators */}
        <button
          className={`nav-item ${activeView === 'locators' ? 'nav-item--active' : ''}`}
          onClick={() => onNavigate('locators')}
          title={isExpanded ? undefined : "Locator Intelligence"}
          aria-current={activeView === 'locators' ? 'page' : undefined}
        >
          <span className="nav-icon">{Icons.locators}</span>
          <span className="nav-label">Locators</span>
        </button>

        <ThemePicker />

        {/* Settings */}
        <button
          className="nav-item nav-item--soon"
          title="Settings (coming soon)"
          disabled
        >
          <span className="nav-icon">{Icons.settings}</span>
          <span className="nav-label">Settings</span>
        </button>

        {/* Collapse Toggle */}
        <button
          className="nav-item sidebar-collapse-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Menu" : "Expand Menu"}
          aria-label={isExpanded ? 'Collapse menu' : 'Expand menu'}
          aria-expanded={isExpanded}
        >
          <span className="nav-icon">{isExpanded ? Icons.chevronLeft : Icons.chevronRight}</span>
          <span className="nav-label">Collapse</span>
        </button>

        <div className="sidebar-divider" />

        {/* Avatar placeholder */}
        <div className="sidebar-profile" title="Operator">
          <div className="sidebar-avatar">
            <span>Z</span>
          </div>
          <div className="sidebar-profile-info">
            <div className="profile-name">Operator</div>
            <div className="profile-role">Local session</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

import './Topbar.scss';

export default function Topbar({ title, breadcrumb, statusBadge, actions }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {breadcrumb ? (
          <div className="topbar-breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="topbar-breadcrumb-item">
                {i > 0 && <span className="topbar-sep">/</span>}
                {typeof crumb === 'string' ? (
                  <span className={i === breadcrumb.length - 1 ? 'topbar-crumb-active' : 'topbar-crumb'}>{crumb}</span>
                ) : crumb}
              </span>
            ))}
          </div>
        ) : (
          <span className="topbar-title">{title}</span>
        )}
        {statusBadge && (
          <div className="topbar-status-badge">
            <span className="topbar-status-dot" />
            <span className="topbar-status-text">{statusBadge}</span>
          </div>
        )}
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <SearchIcon />
          <span className="topbar-search-text">Search tests, logs, or agents…</span>
          <span className="topbar-search-kbd">⌘K</span>
        </div>
        <button className="topbar-icon-btn" title="Notifications">
          <BellIcon />
        </button>
        <button className="topbar-icon-btn" title="Help">
          <HelpIcon />
        </button>
        {actions && <div className="topbar-actions">{actions}</div>}
      </div>
    </header>
  );
}

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8.5 8.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5A4 4 0 0 0 3 5.5v4H11v-4A4 4 0 0 0 7 1.5z" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 9.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const HelpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 5.5a1.5 1.5 0 0 1 3 0c0 .8-.6 1.2-1.1 1.6C6.9 7.5 7 7.8 7 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
  </svg>
);
